'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  RefreshCw,
  Download,
  Activity,
  Zap,
  BarChart3
} from 'lucide-react'
import { useMemberPortalStats } from '@/hooks/use-member-analytics'
import { useGymAnalytics } from '@/hooks/use-gym-data'

interface RetentionAnalysisProps {
  gymId: string
  periodDays?: number
}

// Mock data for retention analysis
const generateRetentionData = () => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  
  return months.map((month, index) => {
    const baseRetention = 85 + Math.random() * 10 // 85-95% base retention
    const churnRate = 100 - baseRetention
    const newMembers = Math.floor(Math.random() * 20) + 10 // 10-30 new members
    const churnedMembers = Math.floor((churnRate / 100) * (100 + index * 5)) // Growing base
    
    return {
      month,
      retentionRate: Math.round(baseRetention * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      newMembers,
      churnedMembers,
      totalMembers: 100 + index * 5 + newMembers - churnedMembers
    }
  })
}

export function RetentionAnalysis({ 
  gymId, 
  periodDays = 30 
}: RetentionAnalysisProps) {
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

  const isLoading = portalLoading || gymLoading
  const hasError = portalError || gymError

  const handleRefresh = () => {
    refetchPortal()
    refetchGym()
  }

  // Generate retention data
  const retentionData = generateRetentionData()
  const currentMonth = retentionData[retentionData.length - 1]
  const previousMonth = retentionData[retentionData.length - 2]
  
  const retentionTrend = currentMonth.retentionRate - previousMonth.retentionRate
  const avgRetention = retentionData.reduce((sum, month) => sum + month.retentionRate, 0) / retentionData.length
  const totalChurned = retentionData.reduce((sum, month) => sum + month.churnedMembers, 0)
  const totalNew = retentionData.reduce((sum, month) => sum + month.newMembers, 0)

  // Calculate churn risk indicators
  const churnRiskFactors = {
    lowEngagement: portalStats ? (portalStats.portal_enabled - portalStats.active_portal_users) : 0,
    noPortalAccess: portalStats ? (portalStats.total_members - portalStats.portal_enabled) : 0,
    recentChurn: currentMonth.churnedMembers
  }

  const churnRiskScore = Math.min(100, 
    (churnRiskFactors.lowEngagement * 0.3) + 
    (churnRiskFactors.noPortalAccess * 0.2) + 
    (churnRiskFactors.recentChurn * 0.5)
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Retention Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading retention data...</span>
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
            <Users className="h-5 w-5" />
            Member Retention Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load retention data</p>
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
              <Users className="h-5 w-5" />
              Member Retention Analysis
            </CardTitle>
            <CardDescription>
              Track member retention, churn rates, and identify at-risk members
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
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="risk">Churn Risk</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Retention Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Retention</p>
                      <p className="text-2xl font-bold">{currentMonth.retentionRate}%</p>
                    </div>
                    <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {retentionTrend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {retentionTrend > 0 ? '+' : ''}{retentionTrend.toFixed(1)}% vs last month
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Retention</p>
                      <p className="text-2xl font-bold">{avgRetention.toFixed(1)}%</p>
                    </div>
                    <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last 12 months
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
                      <p className="text-2xl font-bold">{currentMonth.churnRate}%</p>
                    </div>
                    <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {currentMonth.churnedMembers} members this month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Net Growth</p>
                      <p className="text-2xl font-bold text-green-600">
                        +{currentMonth.newMembers - currentMonth.churnedMembers}
                      </p>
                    </div>
                    <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {currentMonth.newMembers} new, {currentMonth.churnedMembers} churned
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Retention Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Retention Performance
                </CardTitle>
                <CardDescription>
                  How well you&apos;re retaining members compared to industry standards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Month Retention</span>
                    <Badge variant={currentMonth.retentionRate >= 90 ? 'default' : currentMonth.retentionRate >= 80 ? 'secondary' : 'destructive'}>
                      {currentMonth.retentionRate >= 90 ? 'Excellent' : currentMonth.retentionRate >= 80 ? 'Good' : 'Needs Improvement'}
                    </Badge>
                  </div>
                  <Progress value={currentMonth.retentionRate} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Industry average: 85% | Your rate: {currentMonth.retentionRate}%
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {totalNew}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">New Members (12m)</div>
                  </div>
                  
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      {totalChurned}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Churned Members (12m)</div>
                  </div>
                  
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {((totalNew - totalChurned) / totalNew * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Net Growth Rate</div>
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
                  <BarChart3 className="h-5 w-5" />
                  Retention Trends
                </CardTitle>
                <CardDescription>
                  Monthly retention and churn patterns over the last 12 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {retentionData.slice(-6).map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium">{month.month}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant={month.retentionRate >= 90 ? 'default' : month.retentionRate >= 80 ? 'secondary' : 'destructive'}>
                            {month.retentionRate}%
                          </Badge>
                          <span className="text-sm text-muted-foreground">retention</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <div className="font-medium text-green-600">+{month.newMembers}</div>
                          <div className="text-muted-foreground">new</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">-{month.churnedMembers}</div>
                          <div className="text-muted-foreground">churned</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{month.totalMembers}</div>
                          <div className="text-muted-foreground">total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Churn Risk Tab */}
          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Churn Risk Assessment
                </CardTitle>
                <CardDescription>
                  Identify members at risk of churning and take preventive action
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Risk Score */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Churn Risk Score</span>
                    <Badge variant={churnRiskScore < 30 ? 'default' : churnRiskScore < 60 ? 'secondary' : 'destructive'}>
                      {churnRiskScore < 30 ? 'Low' : churnRiskScore < 60 ? 'Medium' : 'High'}
                    </Badge>
                  </div>
                  <Progress value={churnRiskScore} className="h-3" />
                  <div className="text-sm text-muted-foreground">
                    Based on engagement patterns, portal usage, and recent activity
                  </div>
                </div>

                <Separator />

                {/* Risk Factors */}
                <div className="space-y-4">
                  <h4 className="font-medium">Risk Factors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-sm">Low Engagement</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-600">{churnRiskFactors.lowEngagement}</div>
                      <div className="text-sm text-muted-foreground">Portal users not active</div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-sm">No Portal Access</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{churnRiskFactors.noPortalAccess}</div>
                      <div className="text-sm text-muted-foreground">Members without portal</div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-sm">Recent Churn</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600">{churnRiskFactors.recentChurn}</div>
                      <div className="text-sm text-muted-foreground">Churned this month</div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Risk Mitigation Recommendations
                  </h4>
                  <div className="space-y-2">
                    {churnRiskFactors.lowEngagement > 5 && (
                      <div className="text-sm p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="font-medium text-orange-800 dark:text-orange-200">Low Engagement Alert</div>
                        <div className="text-orange-700 dark:text-orange-300">
                          {churnRiskFactors.lowEngagement} portal users are inactive. Consider sending re-engagement campaigns.
                        </div>
                      </div>
                    )}
                    
                    {churnRiskFactors.noPortalAccess > 10 && (
                      <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="font-medium text-blue-800 dark:text-blue-200">Portal Adoption Opportunity</div>
                        <div className="text-blue-700 dark:text-blue-300">
                          {churnRiskFactors.noPortalAccess} members don&apos;t have portal access. Invite them to improve engagement.
                        </div>
                      </div>
                    )}
                    
                    {churnRiskScore < 30 && (
                      <div className="text-sm p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="font-medium text-green-800 dark:text-green-200">Excellent Retention</div>
                        <div className="text-green-700 dark:text-green-300">
                          Your retention metrics are strong! Continue current strategies.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Retention Insights
                </CardTitle>
                <CardDescription>
                  AI-powered insights and recommendations for improving retention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Advanced retention insights coming soon...</p>
                  <p className="text-sm">This will include predictive churn modeling, personalized retention strategies, and automated alerts</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
