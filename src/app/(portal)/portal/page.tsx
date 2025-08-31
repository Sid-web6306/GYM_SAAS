'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Calendar,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudOff
} from 'lucide-react'
import { 
  useMemberStatus, 
  useMemberProfile, 
  useMemberStats,
  useMemberCheckin, 
  useMemberCheckout 
} from '@/hooks/use-member-portal'
import { useOfflineQueue } from '@/hooks/use-offline-queue'
import { format } from 'date-fns'

export default function MemberPortalDashboard() {
  const [checkinNotes, setCheckinNotes] = useState('')
  
  const { data: profile, isLoading: profileLoading, error: profileError } = useMemberProfile()
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useMemberStatus()
  const { stats, isLoading: statsLoading, error: statsError } = useMemberStats()
  const { isOnline, queuedItems, hasQueuedItems, processQueue } = useOfflineQueue()
  
  const checkinMutation = useMemberCheckin()
  const checkoutMutation = useMemberCheckout()

  const isLoading = profileLoading || statusLoading || statsLoading
  const hasError = profileError || statusError || statsError

  const handleCheckin = async () => {
    try {
      await checkinMutation.mutateAsync({
        method: 'portal',
        notes: checkinNotes || undefined
      })
      setCheckinNotes('')
    } catch (error) {
      console.error('Check-in error:', error)
    }
  }

  const handleCheckout = async () => {
    try {
      await checkoutMutation.mutateAsync({})
    } catch (error) {
      console.error('Check-out error:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (hasError) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Portal</h2>
          <p className="text-gray-600 mb-6">
            {profileError?.message || statusError?.message || statsError?.message || 'Something went wrong'}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-800">
            <WifiOff className="h-4 w-4" />
            <span className="font-medium">You&apos;re offline</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Check-ins and check-outs will be saved and synced when you&apos;re back online.
          </p>
        </div>
      )}

      {/* Queued Actions Banner */}
      {hasQueuedItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <CloudOff className="h-4 w-4" />
              <span className="font-medium">
                {queuedItems.length} action{queuedItems.length !== 1 ? 's' : ''} queued
              </span>
            </div>
            {isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={processQueue}
                className="text-blue-800 border-blue-300 hover:bg-blue-100"
              >
                Sync Now
              </Button>
            )}
          </div>
          <p className="text-sm text-blue-700 mt-1">
            {isOnline 
              ? 'Click "Sync Now" to process queued actions.'
              : 'Actions will sync automatically when you&apos;re back online.'
            }
          </p>
        </div>
      )}

      {/* Welcome Header */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Welcome back, {profile?.first_name || 'Member'}!
        </h1>
        <div className="flex items-center gap-2 mt-1 justify-center lg:justify-start">
          <span className="text-gray-600">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </span>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-500" />
          )}
        </div>
      </div>

      {/* Current Status Card */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {status?.is_checked_in ? (
                  <>
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-medium text-green-700">
                      Checked In
                    </span>
                    {status.check_in_at && (
                      <span className="text-sm text-gray-500">
                        since {format(new Date(status.check_in_at), 'h:mm a')}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 bg-gray-300 rounded-full" />
                    <span className="font-medium text-gray-600">
                      Not Checked In
                    </span>
                  </>
                )}
              </div>

              {status?.is_checked_in && status.total_seconds && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">
                      Current Session: {formatTime(status.total_seconds)}
                    </span>
                  </div>
                </div>
              )}

              {/* Check-in/Check-out Buttons */}
              <div className="flex gap-3">
                {status?.is_checked_in ? (
                  <Button
                    onClick={handleCheckout}
                    disabled={checkoutMutation.isPending}
                    size="lg"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    {checkoutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleCheckin}
                    disabled={checkinMutation.isPending}
                    size="lg"
                    className="flex-1"
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    {checkinMutation.isPending ? 'Checking In...' : 'Check In'}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => refetchStatus()}
                  disabled={statusLoading}
                  size="lg"
                >
                  <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Notes input for check-in */}
              {!status?.is_checked_in && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder="e.g., Leg day, Cardio session..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {stats?.weeklyVisits || 0}
                <span className="text-sm text-gray-500 font-normal ml-1">visits</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {stats?.todayTotalTime ? formatTime(stats.todayTotalTime) : '0m'}
                <span className="text-sm text-gray-500 font-normal ml-1">total</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className={`text-2xl font-bold ${
                status?.is_checked_in ? 'text-green-600' : 'text-gray-400'
              }`}>
                {status?.is_checked_in ? 'Active' : 'Away'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Your latest check-ins this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : stats?.recentSessions?.length ? (
            <div className="space-y-3">
              {stats.recentSessions.slice(0, 5).map((session) => (
                <div key={session.session_id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(session.check_in_at), 'MMM d, h:mm a')}
                    </p>
                    {session.notes && (
                      <p className="text-xs text-gray-500">{session.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {session.check_out_at ? formatTime(session.total_seconds) : 'In Progress'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.check_out_at ? 'Completed' : 'Active'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation shortcuts for mobile */}
      <div className="lg:hidden grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-16"
          onClick={() => { window.location.href = '/portal/history' }}
        >
          <div className="text-center">
            <Activity className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">View History</span>
          </div>
        </Button>
        
        <Button
          variant="outline"
          className="h-16"
          onClick={() => { window.location.href = '/portal/profile' }}
        >
          <div className="text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">Profile</span>
          </div>
        </Button>
      </div>
    </div>
  )
}
