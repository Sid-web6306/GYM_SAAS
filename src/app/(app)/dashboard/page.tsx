'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  Activity,
  UserPlus,
  Dumbbell,
  Clock,
  TrendingUp,
  Settings,
  AlertCircle,
  Timer,
  Database
} from 'lucide-react';
import { useAuth, usePostOnboardingSync, useAuthSession, useAuthMetrics } from '@/hooks/use-auth';
import { useGymStats, useGymAnalytics } from '@/hooks/use-gym-data';
import { useRecentActivity } from '@/hooks/use-members-data';

import { MemberGrowthChart } from '@/components/charts/member-growth-chart';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CheckinTrendsChart } from '@/components/charts/checkin-trends-chart';
import { DashboardHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'
import { toastActions } from '@/stores/toast-store'
import React from 'react';
import { 
  StatsCardSkeleton, 
  ChartSkeleton, 
  RecentActivitySkeleton
} from '@/components/ui/skeletons';

const DashboardPage = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Get auth state from TanStack Query with enhanced features
  const { profile, hasGym, isAuthenticated, isLoading: authLoading, error: authError } = useAuth()
  const gymId = profile?.gym_id
  const postOnboardingSync = usePostOnboardingSync()
  
  // Get auth session info and metrics
  const { sessionId, lastRefresh } = useAuthSession()
  const metrics = useAuthMetrics()

  // UI state (simplified - no longer using Zustand store)
  const showWelcomeMessage = false

  // Check if this is a welcome redirect from onboarding
  const isWelcomeRedirect = searchParams?.get('welcome') === 'true'
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  
  // Check for payment success callback from Razorpay
  const paymentSuccess = searchParams?.get('payment_success') === 'true'
  const subscriptionId = searchParams?.get('subscription_id')

  // Handle auth errors
  React.useEffect(() => {
    if (authError) {
      console.error('Auth error:', authError)
    }
  }, [authError])

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

  // Use TanStack Query hooks for all server state
  const { 
    data: stats, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useGymStats(gymId || null)
  
  const { 
    data: analytics, 
    isLoading: analyticsLoading 
  } = useGymAnalytics(gymId || null)
  
  const { 
    data: recentActivity, 
    isLoading: activityLoading 
  } = useRecentActivity(gymId || null)
  
  // Show auth loading state only for critical auth issues
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

  // Show error state if no gym (this should be extremely rare)
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

  // Show error state
  if (statsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-muted-foreground mb-6">
            There was an error loading your dashboard data. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => refetchStats()} variant="outline">
              Try Again
            </Button>
            <Link href="/members">
              <Button>Go to Members</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Format session duration for display
  const formatSessionDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  // Calculate session health score
  const getSessionHealthScore = () => {
    const errorRate = metrics.errorCount / (metrics.refreshCount || 1)
    const activityScore = Date.now() - metrics.lastActivity < 300000 ? 1 : 0.5 // 5 minutes
    const baseScore = 100 - (errorRate * 50) + (activityScore * 10)
    return Math.max(0, Math.min(100, baseScore))
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Enhanced Header with Session Info */}
      <DashboardHeader
        title={`Welcome back, ${profile?.full_name || 'User'}!`}
        subtitle={`Here's what's happening with your gym today${process.env.NODE_ENV === 'development' ? ` • Session: ${sessionId || 'N/A'}` : ''}`}
      >
        <Link href="/members">
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Members
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
      </DashboardHeader>

      {/* Welcome Message */}
      {showWelcomeMessage && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">🎉 Welcome to your gym dashboard!</h3>
                  <p className="text-sm text-primary/80">
                    Congratulations on setting up your gym! Start by adding members, setting up schedules, and tracking your business growth.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  // Clear welcome message (simplified - no longer using Zustand store)
                  // useAuthStore.getState().setShowWelcomeMessage(false)
                  // useAuthStore.getState().setIsNewUser(false)
                }}
                className="text-primary hover:text-primary/80"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Stats Cards with Session Health */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading || isRefreshing ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">
                  {(stats?.activeMembers || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.newMembersThisMonth || 0} new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-primary">
                  ${(stats?.monthlyRevenue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Projected: ${(stats?.projectedMonthlyRevenue || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Today&apos;s Check-ins</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-primary">
                  {(stats?.todayCheckins || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {stats?.averageDailyCheckins || 0}/day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Session Health</CardTitle>
                <Database className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-primary">
                  {getSessionHealthScore().toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.errorCount} errors, {metrics.refreshCount} refreshes
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Session Information (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-secondary/50 bg-secondary/20">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Session Information (Development)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Session ID:</span>
                <p className="text-muted-foreground truncate">{sessionId || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Last Refresh:</span>
                <p className="text-muted-foreground">
                  {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="font-medium">Session Duration:</span>
                <p className="text-muted-foreground">
                  {formatSessionDuration(metrics.sessionDuration)}
                </p>
              </div>
              <div>
                <span className="font-medium">Error Rate:</span>
                <p className="text-muted-foreground">
                  {metrics.refreshCount > 0 ? ((metrics.errorCount / metrics.refreshCount) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {analyticsLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Member Growth</CardTitle>
                <CardDescription>
                  Track your gym&apos;s membership growth over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MemberGrowthChart data={analytics?.memberGrowthData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>
                  Monitor your monthly revenue and growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={analytics?.revenueData} />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Check-in Trends */}
      {analyticsLoading ? (
        <ChartSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Check-in Activity</CardTitle>
            <CardDescription>
              Daily check-in patterns and member engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CheckinTrendsChart data={analytics?.checkinData} />
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {activityLoading ? (
        <RecentActivitySkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest member check-ins and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="font-medium">
                        {activity.member?.first_name} {activity.member?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.activity_type === 'check_in' ? 'Checked in' : 'Checked out'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity to display
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Key performance indicators for your gym
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                {(stats?.memberRetentionRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Retention Rate</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                  {stats.averageMembershipLength.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Membership (months)</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                  {stats.newMembersThisWeek}
                </div>
                <div className="text-sm text-muted-foreground">New This Week</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((stats.todayCheckins / Math.max(stats.activeMembers, 1)) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Today&apos;s Check-in Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage; 