'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Zap,
  Target,
  Timer
} from 'lucide-react'
import { useGymAnalytics } from '@/hooks/use-gym-data'
import { useMemberPortalStats } from '@/hooks/use-member-analytics'

interface GymUtilizationAnalyticsProps {
  gymId: string
  periodDays?: number
}

export function GymUtilizationAnalytics({ 
  gymId, 
  periodDays = 30 
}: GymUtilizationAnalyticsProps) {
  const { 
    data: gymAnalytics, 
    isLoading: gymLoading, 
    error: gymError,
    refetch: refetchGym 
  } = useGymAnalytics(gymId)

  const { 
    data: portalStats, 
    isLoading: portalLoading, 
    error: portalError,
    refetch: refetchPortal 
  } = useMemberPortalStats(gymId, periodDays)

  const isLoading = gymLoading || portalLoading
  const hasError = gymError || portalError

  const handleRefresh = () => {
    refetchGym()
    refetchPortal()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gym Utilization Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading utilization data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasError || !gymAnalytics || !portalStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gym Utilization Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load utilization data</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate utilization metrics
  const totalCheckins = gymAnalytics.checkinData?.reduce((sum, day) => sum + day.checkins, 0) || 0
  const avgDailyCheckins = Math.round(totalCheckins / 7)
  const peakDay = gymAnalytics.checkinData?.reduce((peak, day) => 
    day.checkins > peak.checkins ? day : peak
  ) || { day: 'N/A', checkins: 0 }
  const lowDay = gymAnalytics.checkinData?.reduce((low, day) => 
    day.checkins < low.checkins ? day : low
  ) || { day: 'N/A', checkins: 0 }

  // Calculate capacity utilization (assuming 50% capacity for demo)
  const estimatedCapacity = Math.max(portalStats.total_members * 0.5, 20)
  const capacityUtilization = Math.min((avgDailyCheckins / estimatedCapacity) * 100, 100)

  // Calculate peak hours (mock data for now)
  const peakHours = {
    morning: { start: '6:00 AM', end: '9:00 AM', utilization: 85 },
    evening: { start: '5:00 PM', end: '8:00 PM', utilization: 92 },
    afternoon: { start: '12:00 PM', end: '2:00 PM', utilization: 45 }
  }

  const utilizationTrend = avgDailyCheckins > (totalCheckins / 7 * 1.1) ? 'up' : 'down'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Gym Utilization Analytics
            </CardTitle>
            <CardDescription>
              Track gym capacity, peak hours, and member activity patterns
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
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="peak-hours">Peak Hours</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Utilization Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Daily Check-ins</p>
                      <p className="text-2xl font-bold">{avgDailyCheckins}</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Last 7 days average
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Capacity Utilization</p>
                      <p className="text-2xl font-bold">{capacityUtilization.toFixed(0)}%</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={capacityUtilization} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Peak Day</p>
                      <p className="text-2xl font-bold">{peakDay.checkins}</p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {peakDay.day}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Utilization Trend</p>
                      <p className="text-2xl font-bold">
                        {utilizationTrend === 'up' ? '+' : '-'}5.2%
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                      {utilizationTrend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-orange-600" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    vs last week
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Activity Summary
                </CardTitle>
                <CardDescription>
                  Check-in patterns over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {gymAnalytics.checkinData?.map((day, index) => {
                    const isPeak = day.checkins === peakDay.checkins
                    const isLow = day.checkins === lowDay.checkins
                    const utilization = (day.checkins / peakDay.checkins) * 100
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-16 text-sm font-medium">{day.day}</div>
                          <div className="flex items-center gap-2">
                            {isPeak && <Badge variant="default" className="bg-green-100 text-green-800">Peak</Badge>}
                            {isLow && <Badge variant="secondary">Low</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">{day.checkins} check-ins</div>
                            <div className="text-sm text-muted-foreground">
                              {utilization.toFixed(0)}% of peak
                            </div>
                          </div>
                          <div className="w-20">
                            <Progress value={utilization} className="h-2" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Capacity Tab */}
          <TabsContent value="capacity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Capacity Management
                </CardTitle>
                <CardDescription>
                  Monitor gym capacity and optimize member experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Capacity Status */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Current Capacity Status</h4>
                    <Badge variant={capacityUtilization > 80 ? 'destructive' : capacityUtilization > 60 ? 'default' : 'secondary'}>
                      {capacityUtilization > 80 ? 'High' : capacityUtilization > 60 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Estimated Capacity</span>
                      <span className="font-medium">{estimatedCapacity} members</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Daily Usage</span>
                      <span className="font-medium">{avgDailyCheckins} members</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Utilization Rate</span>
                      <span className="font-medium">{capacityUtilization.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <Progress value={capacityUtilization} className="h-3" />
                  
                  <div className="text-sm text-muted-foreground">
                    {capacityUtilization > 80 
                      ? 'High utilization - consider expanding hours or capacity'
                      : capacityUtilization > 60 
                      ? 'Good utilization - monitor for peak times'
                      : 'Low utilization - consider marketing or schedule adjustments'
                    }
                  </div>
                </div>

                <Separator />

                {/* Capacity Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Capacity Recommendations
                  </h4>
                  <div className="space-y-2">
                    {capacityUtilization > 80 && (
                      <div className="text-sm p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-red-800 dark:text-red-200">High Capacity Usage</div>
                            <div className="text-red-700 dark:text-red-300">
                              Consider extending operating hours or adding more equipment to accommodate demand.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {capacityUtilization < 40 && (
                      <div className="text-sm p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-yellow-800 dark:text-yellow-200">Low Capacity Usage</div>
                            <div className="text-yellow-700 dark:text-yellow-300">
                              Consider marketing campaigns or schedule adjustments to increase member engagement.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {capacityUtilization >= 40 && capacityUtilization <= 80 && (
                      <div className="text-sm p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-green-800 dark:text-green-200">Optimal Capacity Usage</div>
                            <div className="text-green-700 dark:text-green-300">
                              Great utilization! Continue monitoring and consider minor optimizations.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Peak Hours Tab */}
          <TabsContent value="peak-hours" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Peak Hours Analysis
                </CardTitle>
                <CardDescription>
                  Identify the busiest times and optimize scheduling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Peak Time Slots */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(peakHours).map(([period, data]) => (
                      <Card key={period} className={data.utilization > 80 ? 'ring-2 ring-green-500' : ''}>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold capitalize mb-2">{period}</div>
                            <div className="text-sm text-muted-foreground mb-3">
                              {data.start} - {data.end}
                            </div>
                            <div className="text-2xl font-bold mb-2">{data.utilization}%</div>
                            <Progress value={data.utilization} className="h-2 mb-2" />
                            <div className="text-xs text-muted-foreground">
                              Utilization Rate
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Peak Hours Insights */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Peak Hours Insights</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-200">Busiest Period</span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Evening hours (5:00 PM - 8:00 PM) show the highest utilization at 92%
                        </div>
                      </div>
                      
                      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Timer className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200">Optimal Time</span>
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          Afternoon hours (12:00 PM - 2:00 PM) offer the most space availability
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Utilization Trends
                </CardTitle>
                <CardDescription>
                  Track utilization patterns over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Trend analysis charts coming soon...</p>
                  <p className="text-sm">This will include weekly trends, seasonal patterns, and growth projections</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
