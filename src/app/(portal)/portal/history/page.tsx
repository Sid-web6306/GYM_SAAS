'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  History, 
  Search,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle,
  PlayCircle
} from 'lucide-react'
import { useMemberAttendance } from '@/hooks/use-member-portal'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

export default function MemberHistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('week')
  const [currentPage, setCurrentPage] = useState(0)
  
  const pageSize = 20

  // Calculate date range based on filter
  const { from, to } = useMemo(() => {
    const now = new Date()
    switch (dateFilter) {
      case 'today':
        return {
          from: startOfDay(now).toISOString(),
          to: endOfDay(now).toISOString()
        }
      case 'week':
        return {
          from: subDays(now, 7).toISOString(),
          to: now.toISOString()
        }
      case 'month':
        return {
          from: subDays(now, 30).toISOString(),
          to: now.toISOString()
        }
      default:
        return { from: undefined, to: undefined }
    }
  }, [dateFilter])

  const { 
    data: attendanceData, 
    isLoading, 
    error 
  } = useMemberAttendance({
    from,
    to,
    limit: pageSize,
    offset: currentPage * pageSize
  })

  // Filter attendance by search query
  const filteredAttendance = useMemo(() => {
    if (!attendanceData?.attendance) return []
    
    if (!searchQuery) return attendanceData.attendance
    
    return attendanceData.attendance.filter(session => 
      session.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.method?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [attendanceData?.attendance, searchQuery])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const totalPages = attendanceData?.pagination.has_more ? currentPage + 2 : currentPage + 1

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <History className="h-6 w-6 lg:h-8 lg:w-8" />
          Attendance History
        </h1>
        <p className="text-gray-600 mt-1">
          Track your gym visits and workout sessions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by notes or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div className="flex gap-2">
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
                { key: 'all', label: 'All Time' }
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={dateFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDateFilter(filter.key as typeof dateFilter)
                    setCurrentPage(0)
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sessions</span>
            {!isLoading && filteredAttendance.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                {filteredAttendance.length} session{filteredAttendance.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load attendance history</p>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredAttendance.map((session) => (
                  <div
                    key={session.session_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        session.check_out_at ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">
                          {format(new Date(session.check_in_at), 'EEEE, MMM d')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(session.check_in_at), 'h:mm a')}
                          {session.check_out_at && (
                            <> - {format(new Date(session.check_out_at), 'h:mm a')}</>
                          )}
                        </p>
                        {session.notes && (
                          <p className="text-xs text-gray-600 mt-1">{session.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {session.check_out_at ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <PlayCircle className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-medium text-sm">
                          {formatTime(session.total_seconds)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {session.check_out_at ? 'Completed' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Page {currentPage + 1} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!attendanceData?.pagination.has_more}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
