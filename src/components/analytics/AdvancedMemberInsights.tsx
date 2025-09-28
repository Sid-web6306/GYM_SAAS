'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Star,
  Zap
} from 'lucide-react'
import { useMemberPortalStats, useMemberAnalyticsInsights } from '@/hooks/use-member-analytics'
import { useGymAnalytics } from '@/hooks/use-gym-data'

interface AdvancedMemberInsightsProps {
  gymId: string
  periodDays?: number
}

export function AdvancedMemberInsights({ 
  gymId, 
  periodDays = 30 
}: AdvancedMemberInsightsProps) {
  const { 
    data: portalStats, 
    isLoading: portalLoading, 
    error: portalError,
    refetch: refetchPortal 
  } = useMemberPortalStats(gymId, periodDays)

  const { 
    data: gymAnalytics, 
    isLoading: gymLoading, 
    error: gymError,
    refetch: refetchGym 
  } = useGymAnalytics(gymId)

  const insights = useMemberAnalyticsInsights(portalStats)

  const isLoading = portalLoading || gymLoading
  const hasError = portalError || gymError

  const handleRefresh = () => {
    refetchPortal()
    refetchGym()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Member Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading insights...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasError || !portalStats || !gymAnalytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Member Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load insights</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate additional metrics
  const totalCheckins = gymAnalytics.checkinData?.reduce((sum, day) => sum + day.checkins, 0) || 0
  const avgDailyCheckins = Math.round(totalCheckins / 7)
  const peakDay = gymAnalytics.checkinData?.reduce((peak, day) => 
    day.checkins > peak.checkins ? day : peak
  ) || { day: 'N/A', checkins: 0 }

  const memberGrowthRate = gymAnalytics.memberGrowthData?.length > 1 
    ? ((gymAnalytics.memberGrowthData[gymAnalytics.memberGrowthData.length - 1].members - 
        gymAnalytics.memberGrowthData[gymAnalytics.memberGrowthData.length - 2].members) / 
        gymAnalytics.memberGrowthData[gymAnalytics.memberGrowthData.length - 2].members * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Member Insights
            </CardTitle>
            <CardDescription>
              Deep analytics and behavioral patterns for the last {periodDays} days
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Portal Adoption</p>
                      <p className="text-2xl font-bold">{portalStats.portal_adoption_rate}%</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={portalStats.portal_adoption_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Engagement Rate</p>
                      <p className="text-2xl font-bold">{insights.engagementRate}%</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={insights.engagementRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Daily Check-ins</p>
                      <p className="text-2xl font-bold">{avgDailyCheckins}</p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Peak: {peakDay.day} ({peakDay.checkins} check-ins)
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                      <p className="text-2xl font-bold">
                        {memberGrowthRate > 0 ? '+' : ''}{memberGrowthRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      {memberGrowthRate > 0 ? (
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Month over month
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Member Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Member Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {portalStats.active_portal_users}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Active Portal Users</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {((portalStats.active_portal_users / portalStats.total_members) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {portalStats.portal_enabled - portalStats.active_portal_users}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Portal Enabled (Inactive)</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(((portalStats.portal_enabled - portalStats.active_portal_users) / portalStats.total_members) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {portalStats.total_members - portalStats.portal_enabled}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">No Portal Access</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(((portalStats.total_members - portalStats.portal_enabled) / portalStats.total_members) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Metrics
                </CardTitle>
                <CardDescription>
                  How actively members are using the portal and gym facilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Engagement Score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      <span className="font-medium">Overall Engagement Score</span>
                    </div>
                    <Badge variant={insights.engagementRate > 70 ? 'default' : 'secondary'}>
                      {insights.engagementRate > 70 ? 'High' : insights.engagementRate > 40 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  <Progress value={insights.engagementRate} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Based on portal usage, check-in frequency, and activity patterns
                  </div>
                </div>

                <Separator />

                {/* Portal Usage Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Portal Usage</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Daily Active Users</span>
                        <span className="font-medium">{portalStats.active_portal_users}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Portal Users</span>
                        <span className="font-medium">{portalStats.portal_enabled}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Usage Rate</span>
                        <span className="font-medium">{insights.engagementRate}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Check-in Activity</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Avg. Daily Check-ins</span>
                        <span className="font-medium">{avgDailyCheckins}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Peak Day</span>
                        <span className="font-medium">{peakDay.day}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Peak Check-ins</span>
                        <span className="font-medium">{peakDay.checkins}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Usage Patterns
                </CardTitle>
                <CardDescription>
                  Discover when and how members are most active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Usage pattern charts coming soon...</p>
                  <p className="text-sm">This will include hourly patterns, weekly trends, and seasonal analysis</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Predictive Insights
                </CardTitle>
                <CardDescription>
                  AI-powered predictions and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recommendations */}
                  {insights.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Smart Recommendations
                      </h4>
                      <div className="space-y-2">
                        {insights.recommendations.map((recommendation, index) => (
                          <div key={index} className="text-sm p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Star className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{recommendation}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Future Features Placeholder */}
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Predictive analytics coming soon...</p>
                    <p className="text-sm">This will include churn prediction, optimal invitation timing, and growth forecasting</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
