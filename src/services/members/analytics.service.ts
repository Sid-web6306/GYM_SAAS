/**
 * AnalyticsService - Handles member analytics and statistics
 * Manages portal adoption stats, member analytics, and reporting
 */

import { logger } from '@/lib/logger'

// Type definitions for analytics operations
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

/**
 * AnalyticsService - Member analytics and statistics
 */
export class AnalyticsService {
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
}
