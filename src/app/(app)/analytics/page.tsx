'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  RefreshCw,
  Download,
  Clock,
  Target,
  UserCheck,
  Zap,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { useGymAnalytics } from '@/hooks/use-gym-analytics'
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function AnalyticsPage() {
  const { user, profile } = useAuth()
  const gymId = profile?.gym_id
  const [selectedPeriod, setSelectedPeriod] = useState(30)

  const { data: analytics, isLoading, refetch } = useGymAnalytics(gymId || null, selectedPeriod)

  const handleRefresh = () => {
    refetch()
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    const dataStr = JSON.stringify(analytics, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `gym-analytics-${new Date().toISOString()}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
          <h3 className="text-lg font-semibold mb-2">Loading Analytics...</h3>
          <p className="text-muted-foreground">Please wait while we calculate your gym metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <PageHeader
        title="Business Analytics"
        description="Key metrics and insights to grow your gym"
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* Time Period Selector */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Viewing data for the last:</span>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
            >
              {period} days
            </Button>
          ))}
        </div>
      </div>

      {/* 📊 SECTION 1: Revenue & Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Revenue & Growth
          </CardTitle>
          <CardDescription>Track your business performance and member acquisition</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Members</div>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{analytics?.totalMembers || 0}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {analytics?.activeMembers || 0} active
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div className="text-xs font-medium text-green-700 dark:text-green-300">New This Month</div>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{analytics?.newMembersThisMonth || 0}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {(analytics?.memberGrowthRate || 0) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${(analytics?.memberGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(analytics?.memberGrowthRate || 0).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="text-xs font-medium text-purple-700 dark:text-purple-300">Monthly Revenue</div>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                ${(analytics?.monthlyRecurringRevenue || 0).toLocaleString()}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                MRR
              </div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Retention Rate</div>
              </div>
              <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {(analytics?.retentionRate || 0).toFixed(0)}%
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {analytics?.activeMembers} / {analytics?.totalMembers}
              </div>
            </div>
          </div>

          {/* Member Growth Chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Member Growth Trend
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics?.memberTrend || []}>
                <defs>
                  <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorMembers)"
                  name="Total Members"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Trend Chart */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Trend (6 Months)
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 👥 SECTION 2: Member Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Member Engagement & Health
          </CardTitle>
          <CardDescription>Monitor member activity and identify at-risk members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Attendance Rate</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-2">{(analytics?.attendanceRate || 0).toFixed(0)}%</div>
              <Progress value={analytics?.attendanceRate || 0} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {((analytics?.activeMembers || 0) * (analytics?.attendanceRate || 0) / 100).toFixed(0)} of {analytics?.activeMembers} members visited
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Avg Visits/Member</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold mb-2">{(analytics?.averageVisitsPerMember || 0).toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Per month (last {selectedPeriod} days)
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">At-Risk Members</span>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold mb-2 text-red-600">{analytics?.atRiskMembers || 0}</div>
              <p className="text-xs text-red-700 dark:text-red-400">
                Less than 2 visits this month
              </p>
            </div>
          </div>

          {/* Attendance Trend */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Daily Attendance (Last 7 Days)
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={analytics?.attendanceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="checkins" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Check-ins" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ⚙️ SECTION 3: Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Operational Insights
          </CardTitle>
          <CardDescription>Optimize staffing and facility usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Today's Activity */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Today&apos;s Activity</h4>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg text-center">
                <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                  {analytics?.todayCheckins || 0}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Check-ins today
                </div>
                <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                  Capacity: {(analytics?.averageDailyCapacity || 0).toFixed(0)}% utilization
                </div>
              </div>
            </div>

            {/* Peak Hours */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Peak Hours (Last {selectedPeriod} Days)</h4>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={analytics?.peakHours?.slice(0, 12) || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(hour) => hour > 12 ? `${hour-12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelFormatter={(hour) => {
                      const h = Number(hour)
                      return h > 12 ? `${h-12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 💡 SECTION 4: Actionable Insights */}
      {analytics && analytics.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>Data-driven actions to improve your gym</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.insights.map((insight, index) => {
                const Icon = insight.type === 'success' ? CheckCircle2 : 
                             insight.type === 'danger' ? AlertCircle :
                             insight.type === 'warning' ? AlertCircle : Info
                
                const colorClasses = {
                  success: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
                  danger: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
                  warning: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
                  info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                }

                const iconColorClasses = {
                  success: 'text-green-600 dark:text-green-400',
                  danger: 'text-red-600 dark:text-red-400',
                  warning: 'text-yellow-600 dark:text-yellow-400',
                  info: 'text-blue-600 dark:text-blue-400'
                }

                return (
                  <div key={index} className={`p-4 border rounded-lg ${colorClasses[insight.type]}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${iconColorClasses[insight.type]}`} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        {insight.action && (
                          <p className="text-sm font-medium">→ {insight.action}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Analytics update every 5 minutes • Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  )
}
