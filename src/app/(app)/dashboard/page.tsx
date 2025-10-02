'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  DollarSign, 
  Activity,
  UserPlus,
  Settings,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Target,
  UserCheck,
  Calendar,
  Zap,
  Info
} from 'lucide-react';
import { useAuth, usePostOnboardingSync } from '@/hooks/use-auth';
import { useGymAnalytics } from '@/hooks/use-gym-analytics';
import { DashboardHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'
import { toastActions } from '@/stores/toast-store'
import React from 'react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'

const DashboardPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { profile, hasGym, isAuthenticated, isLoading: authLoading } = useAuth()
  const gymId = profile?.gym_id
  const postOnboardingSync = usePostOnboardingSync()
  
  // Check if this is a welcome redirect from onboarding
  const isWelcomeRedirect = searchParams?.get('welcome') === 'true'
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  
  // Check for payment success callback from Razorpay
  const paymentSuccess = searchParams?.get('payment_success') === 'true'
  const subscriptionId = searchParams?.get('subscription_id')

  // Use new analytics hook
  const { 
    data: analytics, 
    isLoading: analyticsLoading,
    refetch: refetchAnalytics
  } = useGymAnalytics(gymId || null, 30)

  // Clean up URL parameters
  React.useEffect(() => {
    if (isWelcomeRedirect) {
      router.replace('/dashboard')
    }
  }, [isWelcomeRedirect, router])

  // Handle payment success notification
  React.useEffect(() => {
    if (paymentSuccess && subscriptionId) {
      toastActions.success('Payment Successful! 🎉', 'Your subscription has been activated. Welcome to premium!')
      
      // Clean up URL parameters
      const url = new URL(window.location.href)
      url.searchParams.delete('payment_success')
      url.searchParams.delete('subscription_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [paymentSuccess, subscriptionId])

  // Sync auth data when coming from onboarding
  React.useEffect(() => {
    if (isWelcomeRedirect && !authLoading && !hasGym && !isRefreshing) {
      setIsRefreshing(true)
      postOnboardingSync().finally(() => {
        setIsRefreshing(false)
      })
    }
  }, [isWelcomeRedirect, authLoading, hasGym, postOnboardingSync, isRefreshing])

  // Show auth loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state if no gym
  if (!hasGym) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Account Setup Issue</h2>
          <p className="text-muted-foreground mb-6">
            There seems to be an issue with your account setup. Please contact support or try logging out and back in.
          </p>
          <div className="flex gap-2 justify-center">
            <Link href="/onboarding">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            </Link>
            <Link href="/login">
              <Button>
                Try Again
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <DashboardHeader
        title={`${greeting}, ${profile?.full_name?.split(' ')[0] || 'there'}! 👋`}
        subtitle="Here's your gym overview for today"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/members">
            <Button className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </Link>
          <Link href="/attendance">
            <Button variant="outline" className="w-full sm:w-auto">
              <Activity className="h-4 w-4 mr-2" />
              Check-In
            </Button>
          </Link>
        </div>
      </DashboardHeader>

      {/* Welcome Banner for New Users */}
      {isWelcomeRedirect && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">🎉 Welcome to Your Gym Dashboard!</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You&apos;re all set! Start by adding your first members, tracking attendance, and watching your business grow.
                </p>
                <div className="flex gap-2">
                  <Link href="/members">
                    <Button size="sm">
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add First Member
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure Settings
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analyticsLoading || isRefreshing ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your gym data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Today's Overview - Hero Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today&apos;s Overview
                  </CardTitle>
                  <CardDescription>Real-time activity for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchAnalytics()}>
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Check-ins Today */}
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {analytics?.todayCheckins || 0}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Check-ins Today
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    {(analytics?.averageVisitsPerMember || 0).toFixed(1)} avg/member/month
                  </div>
                </div>

                {/* Active Members */}
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {analytics?.activeMembers || 0}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Active Members
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                    {analytics?.totalMembers || 0} total
                  </div>
                </div>

                {/* Monthly Revenue */}
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    ${(analytics?.monthlyRecurringRevenue || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Monthly Revenue
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    ${((analytics?.monthlyRecurringRevenue || 0) / Math.max(analytics?.activeMembers || 1, 1)).toFixed(0)}/member
                  </div>
                </div>

                {/* Growth This Month */}
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                  <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                    +{analytics?.newMembersThisMonth || 0}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    New This Month
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {(analytics?.memberGrowthRate || 0) >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-orange-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${(analytics?.memberGrowthRate || 0) >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                      {Math.abs(analytics?.memberGrowthRate || 0).toFixed(0)}% growth
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Attendance Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {(analytics?.attendanceRate || 0).toFixed(0)}%
                  </div>
                  <Progress value={analytics?.attendanceRate || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {((analytics?.activeMembers || 0) * (analytics?.attendanceRate || 0) / 100).toFixed(0)} of {analytics?.activeMembers} visited this month
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Retention Rate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Retention Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {(analytics?.retentionRate || 0).toFixed(0)}%
                  </div>
                  <Progress value={analytics?.retentionRate || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {analytics?.activeMembers} of {analytics?.totalMembers} members active
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* At-Risk Members */}
            <Card className={analytics?.atRiskMembers && analytics.atRiskMembers > 0 ? "border-red-200 dark:border-red-800" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  At-Risk Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className={`text-2xl font-bold ${analytics?.atRiskMembers && analytics.atRiskMembers > 0 ? 'text-red-600' : ''}`}>
                    {analytics?.atRiskMembers || 0}
                  </div>
                  {analytics?.atRiskMembers && analytics.atRiskMembers > 0 ? (
                    <>
                      <Progress 
                        value={(analytics.atRiskMembers / Math.max(analytics.activeMembers, 1)) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Less than 2 visits - reach out today!
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-green-700 dark:text-green-400">
                      ✓ All members are engaged!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks to manage your gym</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/members">
                  <Button variant="outline" className="w-full justify-start">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New Member
                  </Button>
                </Link>
                <Link href="/attendance">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                </Link>
                <Link href="/members">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    View All Members
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Smart Insights */}
          {analytics && analytics.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Today&apos;s Insights
                </CardTitle>
                <CardDescription>Actionable recommendations to improve your gym</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.insights.slice(0, 3).map((insight, index) => {
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
                          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColorClasses[insight.type]}`} />
                          <div className="flex-1 min-w-0">
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
                  {analytics.insights.length > 3 && (
                    <Link href="/analytics">
                      <Button variant="outline" size="sm" className="w-full">
                        View All {analytics.insights.length} Insights
                        <ArrowUpRight className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Member Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Member Growth (Last 30 Days)</CardTitle>
                <CardDescription>Track how your membership is growing</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics?.memberTrend || []}>
                    <defs>
                      <linearGradient id="colorMembersDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorMembersDash)"
                      name="Total Members"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Check-ins (Last 7 Days)</CardTitle>
                <CardDescription>Monitor member activity patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics?.attendanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="checkins" fill="#10b981" radius={[4, 4, 0, 0]} name="Check-ins" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Peak Hours Analysis</CardTitle>
              <CardDescription>Optimize staffing based on busiest times</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics?.peakHours?.slice(0, 12) || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(hour) => {
                      const h = Number(hour)
                      return h > 12 ? `${h-12}PM` : h === 12 ? '12PM' : `${h}AM`
                    }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    labelFormatter={(hour) => {
                      const h = Number(hour)
                      return h > 12 ? `${h-12}:00 PM` : h === 12 ? '12:00 PM' : `${h}:00 AM`
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom CTA */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Need more detailed insights?</h3>
                  <p className="text-sm text-muted-foreground">
                    View your full analytics dashboard for comprehensive business metrics and trends.
                  </p>
                </div>
                <Link href="/analytics">
                  <Button>
                    View Full Analytics
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
