'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Users,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Target,
  Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { AdvancedMemberInsights } from '@/components/analytics/AdvancedMemberInsights'
import { GymUtilizationAnalytics } from '@/components/analytics/GymUtilizationAnalytics'
import { MemberEngagementHeatmap } from '@/components/analytics/MemberEngagementHeatmap'
import { RetentionAnalysis } from '@/components/analytics/RetentionAnalysis'
import { MemberAnalytics } from '@/components/members/MemberAnalytics'

export default function AnalyticsPage() {
  const { user, profile } = useAuth()
  const gymId = profile?.gym_id
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    logger.info('Export analytics data')
  }

  if (!user || !gymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Required</h3>
          <p className="text-muted-foreground">Please log in to view analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Analytics Dashboard"
        description="Comprehensive insights into your gym's performance and member engagement"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Analytics Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Real-time data collection
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Last 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Insights Generated</p>
                <p className="text-2xl font-bold">23</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              AI-powered recommendations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-2xl font-bold">2m</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              ago
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Analysis Period</h3>
              <p className="text-sm text-muted-foreground">Select the time range for your analytics</p>
            </div>
            <div className="flex gap-2">
              {[7, 30, 90, 365].map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period === 365 ? '1Y' : `${period}D`}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MemberAnalytics 
              gymId={gymId} 
              periodDays={selectedPeriod}
            />
            <AdvancedMemberInsights 
              gymId={gymId} 
              periodDays={selectedPeriod}
            />
          </div>
          
          <GymUtilizationAnalytics 
            gymId={gymId} 
            periodDays={selectedPeriod}
          />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <AdvancedMemberInsights 
            gymId={gymId} 
            periodDays={selectedPeriod}
          />
        </TabsContent>

        {/* Utilization Tab */}
        <TabsContent value="utilization" className="space-y-6">
          <GymUtilizationAnalytics 
            gymId={gymId} 
            periodDays={selectedPeriod}
          />
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <MemberEngagementHeatmap 
            gymId={gymId} 
            periodDays={selectedPeriod}
          />
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="retention" className="space-y-6">
          <RetentionAnalysis 
            gymId={gymId} 
            periodDays={selectedPeriod}
          />
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Real-time analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Last {selectedPeriod} days</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Phase 2</Badge>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
