/**
 * Hook for member analytics and portal adoption metrics
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnalyticsService, type MemberPortalStats } from '@/services/members/analytics.service'
import { PortalService } from '@/services/members/portal.service'

// Query keys for member analytics
export const memberAnalyticsKeys = {
  all: ['member-analytics'] as const,
  stats: (gymId: string) => [...memberAnalyticsKeys.all, 'stats', gymId] as const,
  portalStats: (gymId: string, period: number) => [...memberAnalyticsKeys.stats(gymId), 'portal', period] as const,
  eligible: (gymId: string) => [...memberAnalyticsKeys.all, 'eligible', gymId] as const,
  adoption: (gymId: string) => [...memberAnalyticsKeys.all, 'adoption', gymId] as const,
}

/**
 * Hook to get member portal statistics
 */
export function useMemberPortalStats(gymId: string | null, periodDays: number = 30) {
  return useQuery({
    queryKey: memberAnalyticsKeys.portalStats(gymId || '', periodDays),
    queryFn: () => {
      if (!gymId) throw new Error('Gym ID is required')
      return AnalyticsService.getPortalStats(gymId, periodDays)
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

/**
 * Hook to get members eligible for portal invitation
 */
export function useEligibleMembers(
  gymId: string | null, 
  limit: number = 50, 
  offset: number = 0
) {
  return useQuery({
    queryKey: [...memberAnalyticsKeys.eligible(gymId || ''), limit, offset],
    queryFn: () => {
      if (!gymId) throw new Error('Gym ID is required')
      return PortalService.getEligibleMembers(gymId, limit, offset)
    },
    enabled: !!gymId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to get member portal adoption view data
 */
export function useMemberPortalAdoption(gymId: string | null) {
  return useQuery({
    queryKey: memberAnalyticsKeys.adoption(gymId || ''),
    queryFn: () => {
      if (!gymId) throw new Error('Gym ID is required')
      return PortalService.getPortalAdoptionView(gymId)
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to refresh member analytics data
 */
export function useRefreshMemberAnalytics() {
  const queryClient = useQueryClient()

  return {
    refreshAll: (gymId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.stats(gymId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.eligible(gymId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.adoption(gymId) 
      })
    },
    refreshStats: (gymId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.stats(gymId) 
      })
    },
    refreshEligible: (gymId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.eligible(gymId) 
      })
    },
    refreshAdoption: (gymId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.adoption(gymId) 
      })
    }
  }
}

/**
 * Derived analytics calculations
 */
export function useMemberAnalyticsInsights(stats: MemberPortalStats | undefined) {
  if (!stats) {
    return {
      adoptionTrend: 'unknown' as const,
      engagementRate: 0,
      invitationEffectiveness: 0,
      recommendations: [] as string[]
    }
  }

  const adoptionRate = stats.portal_adoption_rate
  const engagementRate = stats.portal_enabled > 0 
    ? (stats.active_portal_users / stats.portal_enabled) * 100 
    : 0
  const invitationEffectiveness = stats.invitations_sent_period > 0
    ? (stats.activations_period / stats.invitations_sent_period) * 100
    : 0

  // Determine adoption trend
  let adoptionTrend: 'low' | 'medium' | 'high' | 'unknown' = 'unknown'
  if (adoptionRate < 30) adoptionTrend = 'low'
  else if (adoptionRate < 60) adoptionTrend = 'medium'
  else adoptionTrend = 'high'

  // Generate recommendations
  const recommendations: string[] = []
  if (adoptionRate < 40) {
    recommendations.push('Consider bulk inviting eligible members to increase portal adoption')
  }
  if (engagementRate < 50) {
    recommendations.push('Focus on member engagement - portal users are not actively using the system')
  }
  if (invitationEffectiveness < 60) {
    recommendations.push('Review invitation messaging and follow-up process to improve acceptance rates')
  }
  if (stats.avg_activation_time_hours && stats.avg_activation_time_hours > 48) {
    recommendations.push('Consider sending reminder emails to speed up invitation acceptance')
  }

  return {
    adoptionTrend,
    engagementRate: Math.round(engagementRate * 100) / 100,
    invitationEffectiveness: Math.round(invitationEffectiveness * 100) / 100,
    recommendations
  }
}
