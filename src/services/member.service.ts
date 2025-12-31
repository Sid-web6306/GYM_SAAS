/**
 * MemberService - Clean service layer for member operations
 * Implements the Two-Phase Pattern: Customer Records → Portal Access
 * 
 * NOTE: All operations now go through API routes instead of direct DB access
 */

import { type Member } from '@/types/member.types'
import { logger } from '@/lib/logger'

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
 * All operations now go through API routes for consistency
 */
export class MemberService {
  /**
   * PHASE 1: Create member record (customer management)
   * Always succeeds if basic data is valid
   */
  static async createMember(data: CreateMemberData): Promise<Member> {
    const response = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    const result = await response.json()

    if (!response.ok) {
      logger.error('Member creation failed', { error: result.error, gymId: data.gym_id })
      throw new Error(result.error || 'Failed to create member')
    }

    return result.member as Member
  }

  /**
   * Bulk create members via API
   * Much more efficient than creating one-by-one for large imports
   */
  static async bulkCreateMembers(
    members: CreateMemberData[]
  ): Promise<{
    success: Array<{ id: string; email: string | null; first_name: string; last_name: string }>
    failed: Array<{ data: CreateMemberData; error: string }>
  }> {
    if (members.length === 0) {
      return { success: [], failed: [] }
    }

    // All members must have the same gym_id for bulk creation
    const gymId = members[0].gym_id
    
    const response = await fetch('/api/members/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gym_id: gymId,
        members: members.map(m => ({
          first_name: m.first_name,
          last_name: m.last_name,
          email: m.email,
          phone_number: m.phone_number,
          status: m.status,
          join_date: m.join_date
        }))
      })
    })

    const result = await response.json()

    if (!response.ok && response.status !== 207) {
      logger.error('Bulk member creation failed', { error: result.error })
      throw new Error(result.error || 'Failed to create members')
    }

    return {
      success: result.success || [],
      failed: result.failed || []
    }
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
      const response = await fetch('/api/members/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          message: options.message,
          expires_in_hours: options.expires_in_hours || 72,
          send_welcome_message: options.send_welcome_message
        })
      })

      const result = await response.json()

      if (!response.ok) {
        logger.error('Portal access enablement failed', {
          memberId,
          error: result.error || 'Failed to create portal invitation'
        })
        return {
          success: false,
          error: result.error || 'Failed to create portal invitation'
        }
      }

      logger.info('Portal access enabled successfully', { 
        memberId, 
        invitationId: result.invitation_id
      })

      return {
        success: true,
        invitation_id: result.invitation_id,
        warning: result.warning
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
      const response = await fetch('/api/members/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-invite',
          gym_id: gymId,
          member_ids: options.member_ids,
          message: options.message,
          expires_in_hours: options.expires_in_hours || 72
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send bulk invitations')
      }

      return {
        success: true,
        data: result.result
      }
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
    const params = new URLSearchParams({
      action: 'eligible',
      gym_id: gymId,
      limit: limit.toString(),
      offset: offset.toString()
    })

    const response = await fetch(`/api/members/portal?${params}`)
    const result = await response.json()

    if (!response.ok) {
      logger.error('Failed to fetch eligible members', { gymId, error: result.error })
      throw new Error(result.error || 'Failed to fetch eligible members')
    }

    return result.members || []
  }

  /**
   * Get member portal adoption statistics
   */
  static async getPortalStats(
    gymId: string,
    periodDays: number = 30
  ): Promise<MemberPortalStats> {
    const params = new URLSearchParams({
      action: 'stats',
      gym_id: gymId,
      period_days: periodDays.toString()
    })

    const response = await fetch(`/api/members/portal?${params}`)
    const result = await response.json()

    if (!response.ok) {
      logger.error('Failed to fetch portal stats', { gymId, periodDays, error: result.error })
      throw new Error(result.error || 'Failed to fetch portal stats')
    }

    return result.stats as MemberPortalStats
  }

  /**
   * Get member by ID
   */
  static async getMemberById(memberId: string): Promise<Member | null> {
    const params = new URLSearchParams({ id: memberId })
    const response = await fetch(`/api/members?${params}`)
    
    if (response.status === 404) {
      return null
    }

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch member')
    }

    return result.member as Member
  }

  /**
   * Update member information
   */
  static async updateMember(
    memberId: string,
    updates: Partial<CreateMemberData>
  ): Promise<Member> {
    const params = new URLSearchParams({ id: memberId })
    const response = await fetch(`/api/members?${params}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    const result = await response.json()

    if (!response.ok) {
      logger.error('Member update failed', { memberId, error: result.error })
      throw new Error(result.error || 'Failed to update member')
    }

    return result.member as Member
  }

  /**
   * Delete member (soft delete by marking as inactive)
   */
  static async deleteMember(memberId: string): Promise<void> {
    const params = new URLSearchParams({ id: memberId })
    const response = await fetch(`/api/members?${params}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const result = await response.json()
      logger.error('Member deletion failed', { memberId, error: result.error })
      throw new Error(result.error || 'Failed to delete member')
    }
  }

  /**
   * Track member portal activation (called when invitation is accepted)
   */
  static async trackPortalActivation(userId: string, memberId: string): Promise<void> {
    const response = await fetch('/api/members/portal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, member_id: memberId })
    })

    if (!response.ok) {
      const result = await response.json()
      logger.error('Portal activation tracking failed', { userId, memberId, error: result.error })
      throw new Error(result.error || 'Failed to track portal activation')
    }
  }

  /**
   * Check if member has portal access
   */
  static async hasPortalAccess(memberId: string): Promise<boolean> {
    const params = new URLSearchParams({
      action: 'check',
      member_id: memberId
    })

    const response = await fetch(`/api/members/portal?${params}`)
    const result = await response.json()

    if (!response.ok) {
      return false
    }

    return result.hasPortalAccess === true
  }

  /**
   * Get member portal adoption view data
   */
  static async getPortalAdoptionView(gymId: string): Promise<unknown[]> {
    const params = new URLSearchParams({
      action: 'adoption',
      gym_id: gymId
    })

    const response = await fetch(`/api/members/portal?${params}`)
    const result = await response.json()

    if (!response.ok) {
      logger.error('Failed to fetch portal adoption view', { gymId, error: result.error })
      throw new Error(result.error || 'Failed to fetch portal adoption data')
    }

    return result.adoption || []
  }
}
