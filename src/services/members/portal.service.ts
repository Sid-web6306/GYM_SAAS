/**
 * PortalService - Handles member portal access and invitation operations
 * Manages portal invitations, access tracking, and portal-related functionality
 */

import { logger } from '@/lib/logger'

// Type definitions for portal operations
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
 * PortalService - Member portal access and invitation management
 */
export class PortalService {
  /**
   * Enable portal access for a member
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
