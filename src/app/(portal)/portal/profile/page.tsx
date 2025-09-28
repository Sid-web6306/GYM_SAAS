'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Phone,
  Calendar,
  Shield,
  CheckCircle,
  PlayCircle,
  Activity,
  Clock
} from 'lucide-react'
import { usePortalData } from '@/components/providers/portal-data-provider'
import { format } from 'date-fns'

export default function MemberProfilePage() {
  const { profile, stats } = usePortalData()
  
  // Extract data and loading states from the context
  const { data: profileData, isLoading: profileLoading, error: profileError } = profile
  const { stats: statsData, isLoading: statsLoading } = stats

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <User className="h-6 w-6 lg:h-8 lg:w-8" />
          My Profile
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage your member information
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your member details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
            </div>
          ) : profileError ? (
            <div className="text-center py-6 text-red-500">
              Failed to load profile information
            </div>
          ) : (
            <div className="space-y-6">
              {/* Name and Status */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {profileData?.first_name} {profileData?.last_name}
                  </h3>
                  <p className="text-gray-500">Member</p>
                </div>
                <Badge className={getStatusColor(profileData?.status)}>
                  {profileData?.status || 'Unknown'}
                </Badge>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Contact Details</h4>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{profileData?.email || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{profileData?.phone_number || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 border-b pb-2">Membership Details</h4>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Join Date</p>
                      <p className="text-sm text-gray-600">
                        {profileData?.join_date ? format(new Date(profileData.join_date), 'MMM d, yyyy') : 'Not set'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Member Since</p>
                      <p className="text-sm text-gray-600">
                        {profileData?.created_at ? format(new Date(profileData.created_at), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Summary
          </CardTitle>
          <CardDescription>
            Your workout statistics and recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center space-y-2">
                  <Skeleton className="h-8 w-16 mx-auto" />
                  <Skeleton className="h-4 w-20 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {statsData?.weeklyVisits || 0}
                </div>
                <p className="text-sm text-blue-700">Visits This Week</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {statsData?.todayTotalTime ? formatTime(statsData.todayTotalTime) : '0m'}
                </div>
                <p className="text-sm text-green-700">Time Today</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {statsData?.recentSessions?.length || 0}
                </div>
                <p className="text-sm text-purple-700">Recent Sessions</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions Preview */}
      {!statsLoading && statsData?.recentSessions && statsData.recentSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
            <CardDescription>
              Your latest gym visits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statsData.recentSessions.slice(0, 3).map((session: { session_id: string; check_in_at: string; check_out_at?: string; total_seconds?: number; notes?: string }) => (
                <div key={session.session_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {session.check_out_at ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(session.check_in_at), 'MMM d, h:mm a')}
                      </p>
                      {session.notes && (
                        <p className="text-xs text-gray-500">{session.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatTime(session.total_seconds || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.check_out_at ? 'Completed' : 'Active'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portal Access
          </CardTitle>
          <CardDescription>
            Information about your member portal access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium text-green-700">
                Portal access is active
              </span>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>What you can do:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check in and out of the gym</li>
                <li>View your attendance history</li>
                <li>Track your workout statistics</li>
                <li>Update your profile information</li>
              </ul>
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t">
              If you have questions about your membership or need assistance, 
              please contact the gym staff.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
