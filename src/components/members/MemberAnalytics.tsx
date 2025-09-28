'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  UserCheck,
  Activity,
  Mail,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { useMemberPortalStats, useMemberAnalyticsInsights, useRefreshMemberAnalytics } from '@/hooks/use-member-analytics'

interface MemberAnalyticsProps {
  gymId: string
  periodDays?: number
  onBulkInviteClick?: () => void
}

export function MemberAnalytics({ 
  gymId, 
  periodDays = 30,
  onBulkInviteClick 
}: MemberAnalyticsProps) {
  const { 
    data: stats, 
    isLoading, 
    error,
    refetch 
  } = useMemberPortalStats(gymId, periodDays)

  const insights = useMemberAnalyticsInsights(stats)
  const { refreshStats } = useRefreshMemberAnalytics()

  const handleRefresh = () => {
    refreshStats(gymId)
    refetch()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Portal Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Portal Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load analytics</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const adoptionTrendIcon = {
    low: TrendingDown,
    medium: Activity,
    high: TrendingUp,
    unknown: Activity
  }[insights.adoptionTrend]

  const adoptionTrendColor = {
    low: 'text-red-500',
    medium: 'text-yellow-500', 
    high: 'text-green-500',
    unknown: 'text-gray-500'
  }[insights.adoptionTrend]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Portal Analytics
            </CardTitle>
            <CardDescription>
              Portal adoption and engagement metrics for the last {periodDays} days
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total_members}</div>
            <div className="text-sm text-muted-foreground">Total Members</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.portal_enabled}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Portal Enabled</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {stats.active_portal_users}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">Active Users</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.invitations_sent_period}
            </div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Invites Sent</div>
          </div>
        </div>

        <Separator />

        {/* Portal Adoption Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <span className="font-medium">Portal Adoption Rate</span>
            </div>
            <div className="flex items-center gap-2">
              {React.createElement(adoptionTrendIcon, { 
                className: `h-4 w-4 ${adoptionTrendColor}` 
              })}
              <Badge 
                variant={insights.adoptionTrend === 'high' ? 'default' : 'secondary'}
                className={insights.adoptionTrend === 'high' ? 'bg-green-100 text-green-800' : ''}
              >
                {stats.portal_adoption_rate}%
              </Badge>
            </div>
          </div>
          <Progress value={stats.portal_adoption_rate} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {stats.portal_enabled} of {stats.total_members} members have portal access
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <span className="font-medium">Engagement Rate</span>
            </div>
            <Badge variant="secondary">
              {insights.engagementRate}%
            </Badge>
          </div>
          <Progress value={insights.engagementRate} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {stats.active_portal_users} of {stats.portal_enabled} portal users active in last {periodDays} days
          </div>
        </div>

        {/* Invitation Effectiveness */}
        {stats.invitations_sent_period > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Invitation Effectiveness</span>
              </div>
              <Badge variant="secondary">
                {insights.invitationEffectiveness}%
              </Badge>
            </div>
            <Progress value={insights.invitationEffectiveness} className="h-2" />
            <div className="text-sm text-muted-foreground">
              {stats.activations_period} of {stats.invitations_sent_period} invitations accepted
            </div>
          </div>
        )}

        {/* Average Activation Time */}
        {stats.avg_activation_time_hours && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Avg. Activation Time</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {Math.round(stats.avg_activation_time_hours)} hours
              </div>
              <div className="text-sm text-muted-foreground">
                {(stats.avg_activation_time_hours / 24).toFixed(1)} days
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {insights.recommendations.map((recommendation, index) => (
                <div key={index} className="text-sm p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onBulkInviteClick && stats.portal_adoption_rate < 80 && (
            <Button onClick={onBulkInviteClick} className="flex-1">
              <Mail className="h-4 w-4 mr-2" />
              Bulk Invite Members
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(stats.generated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}
