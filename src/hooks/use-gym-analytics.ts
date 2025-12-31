import { useQuery } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

// NOTE: All data operations now go through API routes.

export interface GymAnalyticsData {
  // Revenue & Growth Metrics
  totalMembers: number
  activeMembers: number
  newMembersThisMonth: number
  memberGrowthRate: number // % change from last month
  monthlyRecurringRevenue: number // MRR
  
  // Member Health Metrics
  attendanceRate: number // % of active members who checked in this month
  averageVisitsPerMember: number
  atRiskMembers: number // Members with low attendance
  retentionRate: number
  
  // Operational Metrics
  todayCheckins: number
  peakHours: { hour: number; count: number }[]
  averageDailyCapacity: number // % of gym usage
  
  // Trend Data for Charts
  memberTrend: { date: string; count: number; new: number }[]
  revenueTrend: { month: string; amount: number }[]
  attendanceTrend: { date: string; checkins: number }[]
  
  // Actionable Insights
  insights: {
    type: 'success' | 'warning' | 'danger' | 'info'
    title: string
    description: string
    action?: string
  }[]
}

export function useGymAnalytics(gymId: string | null, periodDays: number = 30) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['gym-analytics', gymId, periodDays],
    queryFn: async (): Promise<GymAnalyticsData> => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Fetch analytics via API
      const response = await fetch(`/api/analytics?gym_id=${gymId}&period_days=${periodDays}`)
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Analytics fetch error:', { error: result.error, gymId })
        throw new Error(result.error || 'Failed to fetch analytics')
      }
      
      return result.analytics as GymAnalyticsData
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  })
}

