/**
 * MemberManagementService - Core member CRUD operations
 * Handles member creation, updates, deletion, and basic member management
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

/**
 * MemberManagementService - Core member management operations
 * All operations go through API routes for consistency
 */
export class MemberManagementService {
  /**
   * Create a new member record
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
}
