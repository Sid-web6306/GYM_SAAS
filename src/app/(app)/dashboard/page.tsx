'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  Activity,
  UserPlus,
  Dumbbell,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useGymStats, useGymAnalytics } from '@/hooks/use-gym-data';
import { useRecentActivity } from '@/hooks/use-members-data';
import { useAuthStore } from '@/stores/auth-store';
import { MemberGrowthChart } from '@/components/charts/member-growth-chart';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CheckinTrendsChart } from '@/components/charts/checkin-trends-chart';
import Link from 'next/link';

const DashboardPage = () => {
  // Get auth state from TanStack Query
  const { profile, hasGym, isAuthenticated, isLoading: authLoading } = useAuth()
  const gymId = profile?.gym_id

  // Get UI state from Zustand (client-only state)
  const { showWelcomeMessage } = useAuthStore()

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
  
  const isLoading = authLoading || statsLoading || analyticsLoading || activityLoading

  // Show auth loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    )
  }

  // Show no gym state
  if (!hasGym) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Dumbbell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Welcome to Your Gym Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            Complete your gym setup to start managing members, tracking analytics, and growing your business.
          </p>
          <Link href="/onboarding">
            <Button size="lg">
              <Settings className="h-4 w-4 mr-2" />
              Complete Setup
            </Button>
          </Link>
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

  // Generate stat cards with loading states
  const statCards = [
    {
      title: "Total Members",
      value: isLoading ? "..." : (stats?.totalMembers || 0).toLocaleString(),
      change: isLoading ? "Loading..." : `+${stats?.newMembersThisMonth || 0} this month`,
      icon: Users,
      color: "text-blue-600",
      href: "/members",
      loading: isLoading
    },
    {
      title: "Active Members",
      value: isLoading ? "..." : (stats?.activeMembers || 0).toLocaleString(),
      change: isLoading ? "Loading..." : `${Math.round(((stats?.activeMembers || 0) / Math.max(stats?.totalMembers || 1, 1)) * 100)}% of total`,
      icon: Activity,
      color: "text-green-600",
      href: "/members?status=active",
      loading: isLoading
    },
    {
      title: "Monthly Revenue",
      value: isLoading ? "..." : `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      change: isLoading ? "Loading..." : `Projected: $${(stats?.projectedMonthlyRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      href: "/analytics",
      loading: isLoading
    },
    {
      title: "Today's Check-ins",
      value: isLoading ? "..." : (stats?.todayCheckins || 0).toLocaleString(),
      change: isLoading ? "Loading..." : `Avg: ${stats?.averageDailyCheckins || 0}/day`,
      icon: Clock,
      color: "text-orange-600",
      href: "/schedule",
      loading: isLoading
    }
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening at your gym today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/analytics">
            <Button size="sm" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/members">
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Welcome Message (UI State from Zustand) */}
      {showWelcomeMessage && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Dumbbell className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Welcome to your gym dashboard!</h3>
                  <p className="text-sm text-blue-700">
                    Start by adding members, setting up schedules, and tracking your business growth.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => useAuthStore.getState().setShowWelcomeMessage(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.loading ? (
                  <div className="h-7 bg-gray-200 rounded animate-pulse w-16"></div>
                ) : (
                  card.value
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {card.loading ? (
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mt-1"></div>
                ) : (
                  card.change
                )}
              </div>
              {!card.loading && (
                <Link 
                  href={card.href} 
                  className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors"
                >
                  View details <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest member check-ins and activities
              </p>
            </div>
            <Link href="/members">
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      activity.activity_type === 'check_in' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {activity.member?.first_name} {activity.member?.last_name}{' '}
                        <span className={activity.activity_type === 'check_in' ? 'text-green-600' : 'text-orange-600'}>
                          {activity.activity_type === 'check_in' ? 'checked in' : 'checked out'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>No recent activity</div>
                <div className="text-sm">Member activities will appear here</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Common tasks and shortcuts
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/members">
              <Button className="w-full justify-start" variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Member
              </Button>
            </Link>
            <Link href="/schedule">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Button>
            </Link>
            <Link href="/analytics">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full justify-start" variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Gym Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <MemberGrowthChart 
          data={analytics?.memberGrowthData} 
          isLoading={analyticsLoading}
        />
        
        {/* Revenue Chart */}
        <RevenueChart 
          data={analytics?.revenueData} 
          isLoading={analyticsLoading}
        />
      </div>

      {/* Check-in Trends Chart */}
      <CheckinTrendsChart 
        data={analytics?.checkinData} 
        isLoading={analyticsLoading}
      />

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
                <div className="text-2xl font-bold text-green-600">
                  {stats.memberRetentionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Retention Rate</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.averageMembershipLength.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg. Membership (months)</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.newMembersThisWeek}
                </div>
                <div className="text-sm text-muted-foreground">New This Week</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-orange-600">
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