/**
 * MemberService - Clean service layer for member operations
 * Implements the Two-Phase Pattern: Customer Records → Portal Access
 */

import { createClient } from '@/utils/supabase/client'
import { type Member } from '@/types/member.types'
import { logger } from '@/lib/logger'
import { createInvitation } from '@/actions/invite.actions'

// Type definitions for member operations
export interface CreateMemberData {
  gym_id: string
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  status?: 'active' | 'inactive' | 'pending'
  join_date?: string
}

export interface PortalInviteOptions {
  message?: string
  expires_in_hours?: number
  send_welcome_message?: boolean
}

export interface BulkInviteOptions extends PortalInviteOptions {
  member_ids: string[]
}

export interface BulkInviteResult {
  success: boolean
  data?: {
    success: Array<{
      member_id: string
      name: string
      email: string
      invitation_id: string
    }>
    failed: Array<{
      member_id: string
      name: string
      email: string
      error: string
    }>
    summary: {
      total_requested: number
      success_count: number
      failed_count: number
      gym_id: string
      invited_by: string
      invited_at: string
    }
  }
  error?: string
}

export interface MemberPortalStats {
  gym_id: string
  period_days: number
  total_members: number
  portal_enabled: number
  portal_adoption_rate: number
  active_portal_users: number
  invitations_sent_period: number
  activations_period: number
  avg_activation_time_hours: number | null
  generated_at: string
}

export interface EligibleMember {
  member_id: string
  first_name: string
  last_name: string
  email: string
  join_date: string
  invitation_count?: number
  last_invited_at: string | null
  created_at: string
}

/**
 * MemberService - Core member management operations
 */
export class MemberService {
  private static supabase = createClient()

  /**
   * PHASE 1: Create member record (customer management)
   * Always succeeds if basic data is valid
   */
  static async createMember(data: CreateMemberData): Promise<Member> {
    const { data: createdMember, error } = await this.supabase
      .from('members')
      .insert({
        gym_id: data.gym_id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone_number: data.phone_number || null,
        status: data.status || 'active',
        join_date: data.join_date || new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Member creation failed', { error: error.message, gymId: data.gym_id })
      throw new Error(`Failed to create member: ${error.message}`)
    }

    if (!createdMember) {
      throw new Error('Failed to create member - no data returned')
    }

    return createdMember as Member
  }

  /**
   * PHASE 2: Enable portal access (optional, separate operation)
   * Links member record to user authentication
   */
  static async enablePortalAccess(
    memberId: string,
    options: PortalInviteOptions = {}
  ): Promise<{ success: boolean; invitation_id?: string; error?: string; warning?: string }> {
    try {
      // Get member details first
      const member = await this.getMemberById(memberId)
      if (!member) {
        throw new Error('Member not found')
      }

      if (!member.email) {
        throw new Error('Member must have email for portal access')
      }

      if (member.user_id) {
        throw new Error('Member already has portal access')
      }

      // Use the same createInvitation function that "Invite to Portal" uses
      const formData = new FormData()
      formData.set('email', member.email)
      formData.set('role', 'member')
      formData.set('expires_in_hours', (options.expires_in_hours || 72).toString())
      // Only include custom message if send_welcome_message is enabled
      if (options.send_welcome_message && options.message) {
        formData.set('message', options.message)
      }
      formData.set('notify_user', 'true') // Always send invitation email when portal access is enabled
      formData.set('gym_id', member.gym_id)
      
      // Debug: Log the FormData values
      logger.debug('🔍 MemberService.enablePortalAccess FormData:', {
        email: formData.get('email'),
        notify_user: formData.get('notify_user'),
        role: formData.get('role'),
        metadata: formData.get('metadata')
      })
      
      // Add metadata for portal invitation
      const metadata = {
        member_id: memberId,
        member_name: `${member.first_name} ${member.last_name}`.trim(),
        portal_invitation: true,
        custom_message: options.message,
        send_welcome_message: options.send_welcome_message
      }
      formData.set('metadata', JSON.stringify(metadata))

      // Call the same createInvitation function used by "Invite to Portal"
      const result = await createInvitation(formData)

      if (result.success) {
        logger.info('Portal access enabled successfully', { 
          memberId, 
          invitationId: result.invitation?.id,
          emailSent: result.emailSent,
          recipientEmail: member.email
        })

        return {
          success: true,
          invitation_id: result.invitation?.id,
          warning: result.warning // Pass through any email warnings
        }
      } else {
        return {
          success: false,
          error: result.error || 'Failed to create portal invitation'
        }
      }
    } catch (error) {
      logger.error('Portal access enablement failed', { 
        memberId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Bulk portal invitation for multiple members
   */
  static async bulkInviteToPortal(
    gymId: string,
    options: BulkInviteOptions
  ): Promise<BulkInviteResult> {
    try {
      const { data, error } = await this.supabase.rpc('bulk_invite_members_to_portal', {
        p_gym_id: gymId,
        p_member_ids: options.member_ids,
        p_message: options.message || undefined,
        p_expires_in_hours: options.expires_in_hours || 72
      })

      if (error) {
        throw error
      }

      return data as unknown as BulkInviteResult
    } catch (error) {
      logger.error('Bulk portal invite failed', { 
        gymId, 
        memberCount: options.member_ids.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get members eligible for portal invitation
   */
  static async getEligibleMembers(
    gymId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<EligibleMember[]> {
    const { data, error } = await this.supabase.rpc('get_members_eligible_for_portal', {
      p_gym_id: gymId,
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      logger.error('Failed to fetch eligible members', { gymId, error: error.message })
      throw error
    }

    return data || []
  }

  /**
   * Get member portal adoption statistics
   */
  static async getPortalStats(
    gymId: string,
    periodDays: number = 30
  ): Promise<MemberPortalStats> {
    const { data, error } = await this.supabase.rpc('get_member_portal_stats', {
      p_gym_id: gymId,
      p_period_days: periodDays
    })

    if (error) {
      logger.error('Failed to fetch portal stats', { gymId, periodDays, error: error.message })
      throw error
    }

    return data as unknown as MemberPortalStats
  }

  /**
   * Get member by ID
   */
  static async getMemberById(memberId: string): Promise<Member | null> {
    const { data, error } = await this.supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    return data as Member
  }

  /**
   * Update member information
   */
  static async updateMember(
    memberId: string,
    updates: Partial<CreateMemberData>
  ): Promise<Member> {
    const { data, error } = await this.supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select('*')
      .single()

    if (error) {
      logger.error('Member update failed', { memberId, error: error.message })
      throw error
    }

    return data as Member
  }

  /**
   * Delete member (soft delete by marking as inactive)
   */
  static async deleteMember(memberId: string): Promise<void> {
    const { error } = await this.supabase
      .from('members')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)

    if (error) {
      logger.error('Member deletion failed', { memberId, error: error.message })
      throw error
    }
  }

  /**
   * Track member portal activation (called when invitation is accepted)
   */
  static async trackPortalActivation(userId: string, memberId: string): Promise<void> {
    const { error } = await this.supabase.rpc('track_member_portal_activation', {
      p_user_id: userId,
      p_member_id: memberId
    })

    if (error) {
      logger.error('Portal activation tracking failed', { userId, memberId, error: error.message })
      throw error
    }
  }

  /**
   * Check if member has portal access
   */
  static async hasPortalAccess(memberId: string): Promise<boolean> {
    const member = await this.getMemberById(memberId)
    return member?.user_id != null
  }

  /**
   * Get member portal adoption view data
   */
  static async getPortalAdoptionView(gymId: string): Promise<unknown[]> {
    const { data, error } = await this.supabase
      .from('member_portal_adoption')
      .select('*')
      .eq('gym_id', gymId)
      .order('member_created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch portal adoption view', { gymId, error: error.message })
      throw error
    }

    return data || []
  }
}
