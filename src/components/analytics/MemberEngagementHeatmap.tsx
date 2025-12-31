'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Activity,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Zap,
  Target
} from 'lucide-react'
import { useGymAnalytics } from '@/hooks/use-gym-analytics'
import { useMemberPortalStats } from '@/hooks/use-member-analytics'

interface MemberEngagementHeatmapProps {
  gymId: string
  periodDays?: number
}

// Mock data for engagement heatmap
const generateEngagementData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const data: { [key: string]: { [key: number]: number } } = {}

  days.forEach(day => {
    data[day] = {}
    hours.forEach(hour => {
      // Generate realistic engagement patterns
      let baseEngagement = 0

      // Morning rush (6-9 AM)
      if (hour >= 6 && hour <= 9) {
        baseEngagement = Math.random() * 40 + 60
      }
      // Lunch time (12-2 PM)
      else if (hour >= 12 && hour <= 14) {
        baseEngagement = Math.random() * 30 + 40
      }
      // Evening rush (5-8 PM)
      else if (hour >= 17 && hour <= 20) {
        baseEngagement = Math.random() * 50 + 70
      }
      // Late evening (8-10 PM)
      else if (hour >= 20 && hour <= 22) {
        baseEngagement = Math.random() * 30 + 30
      }
      // Night/early morning (10 PM - 6 AM)
      else {
        baseEngagement = Math.random() * 10
      }

      // Weekend adjustments
      if (day === 'Sat' || day === 'Sun') {
        if (hour >= 8 && hour <= 12) {
          baseEngagement = Math.random() * 40 + 50 // Higher morning activity
        } else if (hour >= 14 && hour <= 18) {
          baseEngagement = Math.random() * 35 + 45 // Good afternoon activity
        } else {
          baseEngagement *= 0.7 // Lower overall activity
        }
      }

      data[day][hour] = Math.round(Math.max(0, Math.min(100, baseEngagement)))
    })
  })

  return data
}

export function MemberEngagementHeatmap({
  gymId,
  periodDays = 30
}: MemberEngagementHeatmapProps) {
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

  // Generate engagement data
  const engagementData = generateEngagementData()
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Calculate peak engagement
  let maxEngagement = 0
  let peakDay = ''
  let peakHour = 0

  Object.entries(engagementData).forEach(([day, dayData]) => {
    Object.entries(dayData).forEach(([hour, engagement]) => {
      if (engagement > maxEngagement) {
        maxEngagement = engagement
        peakDay = day
        peakHour = parseInt(hour)
      }
    })
  })

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'bg-green-500'
    if (engagement >= 60) return 'bg-green-400'
    if (engagement >= 40) return 'bg-yellow-400'
    if (engagement >= 20) return 'bg-orange-400'
    return 'bg-red-400'
  }


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Member Engagement Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading engagement data...</span>
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
            <Activity className="h-5 w-5" />
            Member Engagement Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load engagement data</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Member Engagement Heatmap
            </CardTitle>
            <CardDescription>
              Visualize member activity patterns throughout the week
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
      <CardContent className="space-y-6">
        {/* Peak Engagement Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-green-600" />
                <span className="font-medium">Peak Engagement</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{maxEngagement}%</div>
              <div className="text-sm text-muted-foreground">
                {peakDay} at {peakHour}:00
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Most Active Day</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{peakDay}</div>
              <div className="text-sm text-muted-foreground">
                Highest average engagement
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Peak Hours</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.max(...hours.filter(h =>
                  days.some(day => engagementData[day][h] >= 70)
                ))}:00
              </div>
              <div className="text-sm text-muted-foreground">
                Most consistent high activity
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Heatmap Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Weekly Engagement Heatmap</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <div className="w-3 h-3 bg-orange-400 rounded"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                <div className="w-3 h-3 bg-green-400 rounded"></div>
                <div className="w-3 h-3 bg-green-500 rounded"></div>
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header with hours */}
              <div className="grid grid-cols-25 gap-1 mb-2">
                <div className="w-12"></div> {/* Empty cell for day labels */}
                {hours.map(hour => (
                  <div key={hour} className="text-xs text-center text-muted-foreground font-medium">
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>

              {/* Heatmap rows */}
              {days.map(day => (
                <div key={day} className="grid grid-cols-25 gap-1 mb-1">
                  <div className="w-12 text-sm font-medium text-muted-foreground flex items-center">
                    {day}
                  </div>
                  {hours.map(hour => {
                    const engagement = engagementData[day][hour]
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={`
                          w-6 h-6 rounded-sm cursor-pointer transition-all hover:scale-110
                          ${getEngagementColor(engagement)}
                          ${engagement === maxEngagement ? 'ring-2 ring-blue-500' : ''}
                        `}
                        title={`${day} ${hour}:00 - ${engagement}% engagement`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Engagement Insights */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Engagement Insights
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h5 className="font-medium text-sm">Peak Activity Periods</h5>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Morning Rush</span>
                  <Badge variant="secondary">6:00 AM - 9:00 AM</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Lunch Time</span>
                  <Badge variant="secondary">12:00 PM - 2:00 PM</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Evening Rush</span>
                  <Badge variant="default">5:00 PM - 8:00 PM</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-sm">Recommendations</h5>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                  <div className="font-medium text-blue-800 dark:text-blue-200">Peak Hours</div>
                  <div className="text-blue-700 dark:text-blue-300">
                    Consider adding more staff during evening rush hours
                  </div>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                  <div className="font-medium text-green-800 dark:text-green-200">Low Activity</div>
                  <div className="text-green-700 dark:text-green-300">
                    Promote off-peak memberships for quieter hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Hover over cells to see exact engagement percentages</p>
          <p>Darker colors indicate higher member activity</p>
        </div>
      </CardContent>
    </Card>
  )
}
