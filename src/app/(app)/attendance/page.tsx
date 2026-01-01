'use client'
import { useEffect, useMemo, useState, useDeferredValue, useCallback, memo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/layout/PageHeader'
import { logger } from '@/lib/logger'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Users, BookUser, Search, Clock, LogIn, LogOut } from 'lucide-react'
import { StaffManagementGuard, MemberManagementGuard, AccessDenied } from '@/components/rbac/rbac-guards'
import { useAuth } from '@/hooks/use-auth'
import { useMemberAttendance, useStaffAttendance, useAttendanceStats, formatDurationFromSeconds } from '@/hooks/use-attendance'
import type { AttendanceRow } from '@/hooks/use-attendance'
import { useStaffStatus, useStaffCheckin, useStaffCheckout } from '@/hooks/use-staff-portal'
import { Button } from '@/components/ui/button'
import DateRangePopover from '@/components/ui/date-range-popover'

export default function AttendancePage() {
  const { profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [memberSearch, setMemberSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [activeView, setActiveView] = useState<'members' | 'staff'>(
    (searchParams.get('view') as 'members' | 'staff') || 'members'
  )
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 20

  // Get gym ID from user profile
  const gymId = profile?.gym_id || null

  // Initialize URL params on mount
  useEffect(() => {
    const currentView = searchParams.get('view')
    if (!currentView) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', 'members')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Function to update URL when view changes
  const updateView = useCallback((view: 'members' | 'staff') => {
    setActiveView(view)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, pathname, router])

  // Staff check-in/check-out functionality
  const { data: staffStatus, isLoading: staffStatusLoading } = useStaffStatus()
  const staffCheckinMutation = useStaffCheckin()
  const staffCheckoutMutation = useStaffCheckout()

  // Debounced search values
  const debouncedMemberSearch = useDebounce(memberSearch, 300)
  const debouncedStaffSearch = useDebounce(staffSearch, 300)

  // Deferred values for better performance
  const deferredMemberSearch = useDeferredValue(debouncedMemberSearch)
  const deferredStaffSearch = useDeferredValue(debouncedStaffSearch)
  const deferredFromDate = useDeferredValue(fromDate)
  const deferredToDate = useDeferredValue(toDate)

  // Memoize filter objects to prevent unnecessary re-renders
  // This ensures stable queryKeys for react-query, which triggers proper refetches
  // when filter values actually change (date, search, pagination)
  const memberFilters = useMemo(() => ({
    search: deferredMemberSearch || undefined,
    from: deferredFromDate || undefined,
    to: deferredToDate || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  }), [deferredMemberSearch, deferredFromDate, deferredToDate, currentPage, pageSize])

  const staffFilters = useMemo(() => ({
    search: deferredStaffSearch || undefined,
    from: deferredFromDate || undefined,
    to: deferredToDate || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  }), [deferredStaffSearch, deferredFromDate, deferredToDate, currentPage, pageSize])

  // For present counts, we need all current check-ins without date filters
  const presentFilters = useMemo(() => ({
    limit: 1000,
    offset: 0
  }), [])

  // Attendance data queries for history view
  const {
    data: memberAttendance,
    isLoading: membersLoading,
    error: membersError
  } = useMemberAttendance(gymId, memberFilters, {
    enabled: !!gymId
  })

  const {
    data: staffAttendance,
    isLoading: staffLoading,
    error: staffError
  } = useStaffAttendance(gymId, staffFilters, {
    enabled: !!gymId
  })

  // Stats query (replaces heavy count queries)
  const { data: attendanceStats } = useAttendanceStats(gymId)


  // URL state management
  // Update URL when view changes
  const handleViewChange = useCallback((view: 'members' | 'staff') => {
    updateView(view)
    setCurrentPage(1) // Reset to first page when switching views
  }, [updateView])

  // Search handlers
  const handleSearchChange = useCallback((value: string) => {
    if (activeView === 'members') {
      setMemberSearch(value)
    } else {
      setStaffSearch(value)
    }
    setCurrentPage(1) // Reset to first page when searching
  }, [activeView])

  // Date range handler
  const handleDateRangeChange = useCallback((range: { from: string | null; to: string | null }) => {
    setFromDate(range.from)
    setToDate(range.to)
    setCurrentPage(1) // Reset to first page when changing date range
  }, [])

  // Page change handler
  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    setCurrentPage(prev => {
      const newPage = direction === 'next' ? prev + 1 : prev - 1
      return Math.max(1, newPage) // Ensure page is at least 1
    })
  }, [])

  // Staff check-in/check-out handlers
  const handleStaffCheckin = useCallback(async () => {
    try {
      await staffCheckinMutation.mutateAsync({
        method: 'portal',
        notes: undefined
      })
    } catch (error) {
      
    }
  }, [staffCheckinMutation])

  const handleStaffCheckout = useCallback(async () => {
    try {
      await staffCheckoutMutation.mutateAsync({})
    } catch (error) {
      
    }
  }, [staffCheckoutMutation])

  // Calculate present counts for display (from unfiltered data)

  const presentCounts = useMemo(() => {
    return {
      membersPresent: attendanceStats?.membersPresent || 0,
      staffPresent: attendanceStats?.staffPresent || 0,
      totalPresent: attendanceStats?.totalPresent || 0
    }
  }, [attendanceStats])

  // Reset search when switching views
  useEffect(() => {
    if (activeView === 'members') {
      setStaffSearch('')
    } else {
      setMemberSearch('')
    }
  }, [activeView])

  // Log page view and data for debugging
  useEffect(() => {
    logger.info('Attendance page state', {
      view: activeView,
      gymId,
      filters: {
        fromDate: deferredFromDate,
        toDate: deferredToDate,
        memberSearch: deferredMemberSearch,
        staffSearch: deferredStaffSearch,
        page: currentPage
      },
      hasFilters: !!(deferredFromDate || deferredToDate || deferredMemberSearch || deferredStaffSearch),
      memberAttendanceCount: memberAttendance?.length || 0,
      staffAttendanceCount: staffAttendance?.length || 0,
      membersLoading,
      staffLoading,
      membersError: !!membersError,
      staffError: !!staffError,
      presentCounts
    })
  }, [activeView, gymId, deferredFromDate, deferredToDate, deferredMemberSearch, deferredStaffSearch, currentPage, memberAttendance, staffAttendance, membersLoading, staffLoading, membersError, staffError, presentCounts])

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8">
      <PageHeader
        title="Attendance Dashboard"
        description="View attendance history and current status"
      />

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Members Present</p>
                <p className="text-2xl font-bold">{presentCounts.membersPresent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BookUser className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Staff Present</p>
                <p className="text-2xl font-bold">{presentCounts.staffPresent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Present</p>
                <p className="text-2xl font-bold">{presentCounts.totalPresent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Check-in/Check-out Section */}
      <StaffManagementGuard
        action="read"
        fallback={null}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookUser className="h-5 w-5" />
              Staff Check-in/Check-out
            </CardTitle>
            <CardDescription>
              Check yourself in or out of work
            </CardDescription>
          </CardHeader>
          <CardContent>
            {staffStatusLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Status */}
                <div className="flex items-center gap-3">
                  {staffStatus?.is_checked_in ? (
                    <>
                      <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-medium text-green-700">
                        Checked In
                      </span>
                      {staffStatus.check_in_at && (
                        <span className="text-sm text-muted-foreground">
                          since {new Date(staffStatus.check_in_at).toLocaleTimeString()}
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

                {/* Current Session Duration */}
                {staffStatus?.is_checked_in && staffStatus.total_seconds && (
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        Current Session: {formatDurationFromSeconds(staffStatus.total_seconds)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Check-in/Check-out Buttons */}
                <div className="flex gap-3">
                  {staffStatus?.is_checked_in ? (
                    <Button
                      onClick={handleStaffCheckout}
                      disabled={staffCheckoutMutation.isPending}
                      size="lg"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      {staffCheckoutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStaffCheckin}
                      disabled={staffCheckinMutation.isPending}
                      size="lg"
                      className="flex-1"
                    >
                      <LogIn className="h-5 w-5 mr-2" />
                      {staffCheckinMutation.isPending ? 'Checking In...' : 'Check In'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </StaffManagementGuard>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                View and track attendance records for members and staff
              </CardDescription>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                variant={activeView === 'members' ? 'default' : 'outline'}
                onClick={() => handleViewChange('members')}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Members
              </Button>
              <Button
                variant={activeView === 'staff' ? 'default' : 'outline'}
                onClick={() => handleViewChange('staff')}
                className="flex items-center gap-2"
              >
                <BookUser className="h-4 w-4" />
                Staff
              </Button>
            </div>
          </div>

          {/* Filters - search and date side-by-side */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeView === 'members' ? 'members' : 'staff'}...`}
                value={activeView === 'members' ? memberSearch : staffSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-auto">
              <DateRangePopover
                value={{ from: fromDate, to: toDate }}
                weekStartsOn={1}
                onChange={handleDateRangeChange}
                numberOfMonths={1}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Attendance Views */}
          <AttendanceViews
            activeView={activeView}
            memberAttendance={memberAttendance || []}
            staffAttendance={staffAttendance || []}
            membersLoading={membersLoading}
            staffLoading={staffLoading}
            membersError={!!membersError}
            staffError={!!staffError}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Read-only attendance list component
const AttendanceList = memo(function AttendanceList({
  rows,
  loading,
  error,
  showRole = false
}: {
  rows: AttendanceRow[]
  loading: boolean
  error: boolean
  showRole?: boolean
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Failed to load attendance data</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          {showRole && <TableHead>Role</TableHead>}
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!rows || rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showRole ? 6 : 5} className="text-center py-8 text-muted-foreground">
              No attendance records found.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.session_id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {showRole && <TableCell className="capitalize">{row.role}</TableCell>}
              <TableCell>{new Date(row.check_in_at).toLocaleString()}</TableCell>
              <TableCell>{row.check_out_at ? new Date(row.check_out_at).toLocaleString() : '—'}</TableCell>
              <TableCell>{formatDurationFromSeconds(row.total_seconds)}</TableCell>
              <TableCell>
                {!row.check_out_at ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Checked In
                  </Badge>
                ) : (
                  <Badge variant="secondary">Completed</Badge>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
})

// Pagination component
const AttendancePager = memo(function AttendancePager({
  page,
  pageSize,
  hasMore,
  onPrev,
  onNext
}: {
  page: number
  pageSize: number
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} • {pageSize} per page
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  )
})

// Memoized view components to prevent cross-contamination between member and staff views
const AttendanceViews = memo(function AttendanceViews({
  activeView,
  memberAttendance,
  staffAttendance,
  membersLoading,
  staffLoading,
  membersError,
  staffError,
  currentPage,
  pageSize,
  onPageChange
}: {
  activeView: 'members' | 'staff'
  memberAttendance: AttendanceRow[]
  staffAttendance: AttendanceRow[]
  membersLoading: boolean
  staffLoading: boolean
  membersError: boolean
  staffError: boolean
  currentPage: number
  pageSize: number
  onPageChange: (direction: 'prev' | 'next') => void
}) {
  if (activeView === 'members') {
    return (
      <MemberManagementGuard
        action="read"
        fallback={<AccessDenied message="You don't have permission to view member attendance." />}
      >
        <div className="space-y-4">
          <AttendanceList
            rows={memberAttendance}
            loading={membersLoading}
            error={membersError}
          />
          <AttendancePager
            page={currentPage}
            pageSize={pageSize}
            hasMore={memberAttendance.length === pageSize}
            onPrev={() => onPageChange('prev')}
            onNext={() => onPageChange('next')}
          />
        </div>
      </MemberManagementGuard>
    )
  }

  return (
    <StaffManagementGuard
      action="read"
      fallback={<AccessDenied message="You don't have permission to view staff attendance." />}
    >
      <div className="space-y-4">
        <AttendanceList
          rows={staffAttendance}
          loading={staffLoading}
          error={staffError}
          showRole
        />
        <AttendancePager
          page={currentPage}
          pageSize={pageSize}
          hasMore={staffAttendance.length === pageSize}
          onPrev={() => onPageChange('prev')}
          onNext={() => onPageChange('next')}
        />
      </div>
    </StaffManagementGuard>
  )
})