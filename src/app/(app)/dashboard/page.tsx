'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity,
  UserPlus,
  Dumbbell,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore, useGymStore, useMembersStore } from '@/stores';
import { MemberGrowthChart } from '@/components/charts/member-growth-chart';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CheckinTrendsChart } from '@/components/charts/checkin-trends-chart';
import Link from 'next/link';

const DashboardPage = () => {
  // Toasts now show immediately via toastActions - no hook needed
  
  // Session and store hooks
  const hasGym = useAuthStore((state) => state.hasGym());
  const stats = useGymStore(state => state.stats)
  const gymLoading = useGymStore(state => state.isLoading)
  const recentActivity = useMembersStore(state => state.recentActivity)
  const membersLoading = useMembersStore(state => state.isLoading)
  const fetchRecentActivity = useMembersStore(state => state.fetchRecentActivity)
  
  const isLoading = gymLoading || membersLoading

  useEffect(() => {
    const initializeDashboard = async () => {
      if (hasGym) {
        // Fetch gym stats and recent activity
        await fetchRecentActivity()
      }
    }

    initializeDashboard()
  }, [hasGym, fetchRecentActivity])

  const statCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      change: `+${stats?.newMembersThisMonth || 0} this month`,
      icon: Users,
      color: "text-blue-600",
      href: "/members"
    },
    {
      title: "Active Members",
      value: stats?.activeMembers || 0,
      change: `${Math.round(((stats?.activeMembers || 0) / (stats?.totalMembers || 1)) * 100)}% of total`,
      icon: Activity,
      color: "text-green-600",
      href: "/members"
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      change: "+12% from last month",
      icon: DollarSign,
      color: "text-emerald-600",
      href: "/analytics"
    },
    {
      title: "Today's Check-ins",
      value: stats?.todayCheckins || 0,
      change: `Avg: ${stats?.averageDailyCheckins || 0}/day`,
      icon: Clock,
      color: "text-orange-600",
      href: "/schedule"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Loading your gym&apos;s overview...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening at your gym today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-all duration-200 group cursor-pointer">
            <Link href={stat.href}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.change}
                </p>
              </CardContent>
            </Link>
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
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/members">
                View All
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Dumbbell className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {activity.member?.first_name} {activity.member?.last_name} {activity.activity_type === 'check_in' ? 'checked in' : 'checked out'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Member activities will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/members">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New Member
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/schedule">
                <Calendar className="mr-2 h-4 w-4" />
                View Schedule
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Analytics
              </Link>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <Link href="/settings">
                <DollarSign className="mr-2 h-4 w-4" />
                Manage Settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <MemberGrowthChart 
          data={undefined} 
          isLoading={isLoading}
        />
        
        {/* Revenue Chart */}
        <RevenueChart 
          data={undefined} 
          isLoading={isLoading}
        />
      </div>

      {/* Check-in Trends Chart */}
      <CheckinTrendsChart 
        data={undefined} 
        isLoading={isLoading}
      />
    </div>
  );
};

export default DashboardPage;
