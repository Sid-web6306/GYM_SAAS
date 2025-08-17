'use client'
import { useEffect, useMemo, useRef, useState, useDeferredValue, useCallback, memo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QuickActions } from '@/components/attendance/QuickActions'
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
import { CalendarDays, Users, BookUser, Search, Edit3 } from 'lucide-react'
import { EditSessionModal } from '@/components/attendance/EditSessionModal'
import { StaffManagementGuard, MemberManagementGuard, AccessDenied } from '@/components/rbac/rbac-guards'
import { useAuth } from '@/hooks/use-auth'
import { useMemberAttendance, useStaffAttendance, formatDurationFromSeconds, useEndAttendance } from '@/hooks/use-attendance'
import type { AttendanceRow } from '@/hooks/use-attendance'
import { Button } from '@/components/ui/button'
import DateRangePopover from '@/components/ui/date-range-popover'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AttendancePage() {
  const [memberSearch, setMemberSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [activeView, setActiveView] = useState<'members' | 'staff'>('members')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [editingSession, setEditingSession] = useState<AttendanceRow | null>(null)
  const pageSize = 50
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initializedFromUrl = useRef(false)
  const { profile } = useAuth()
  const gymId = profile?.gym_id || null

  // Debounced values to reduce query frequency and eliminate scroll jumps
  const debouncedMemberSearch = useDebounce(memberSearch, 300)
  const debouncedStaffSearch = useDebounce(staffSearch, 300)
  const debouncedFromDate = useDebounce(fromDate, 500) // Longer delay for date changes
  const debouncedToDate = useDebounce(toDate, 500)

  // Deferred values for non-urgent updates (React 18 concurrent feature)
  const deferredCurrentPage = useDeferredValue(currentPage)

  const memberFilters = useMemo(() => ({
    search: debouncedMemberSearch || undefined,
    from: debouncedFromDate || undefined,
    to: debouncedToDate || undefined,
    limit: pageSize,
    offset: deferredCurrentPage * pageSize,
  }), [debouncedMemberSearch, debouncedFromDate, debouncedToDate, deferredCurrentPage])

  const staffFilters = useMemo(() => ({
    search: debouncedStaffSearch || undefined,
    from: debouncedFromDate || undefined,
    to: debouncedToDate || undefined,
    limit: pageSize,
    offset: deferredCurrentPage * pageSize,
  }), [debouncedStaffSearch, debouncedFromDate, debouncedToDate, deferredCurrentPage])

  const { data: memberAttendance = [], isLoading: membersLoading, error: membersError } = useMemberAttendance(gymId, memberFilters)
  const { data: staffAttendance = [], isLoading: staffLoading, error: staffError } = useStaffAttendance(gymId, staffFilters)
  const endAttendance = useEndAttendance(gymId)

  // Memoized present count calculations to avoid redundant filtering
  const presentCounts = useMemo(() => {
    const membersPresentCount = (memberAttendance || []).filter(r => !r.check_out_at).length
    const staffPresentCount = (staffAttendance || []).filter(r => !r.check_out_at).length
    const totalPresentCount = membersPresentCount + staffPresentCount
    return { membersPresentCount, staffPresentCount, totalPresentCount }
  }, [memberAttendance, staffAttendance])

  // Memoized event handlers to prevent re-creation on every render
  const handleToggleView = useCallback((view: 'members' | 'staff') => {
    if (view === activeView) return // Prevent unnecessary state updates
    setActiveView(view)
    setCurrentPage(0)
  }, [activeView])

  const handleSearchChange = useCallback((value: string) => {
    if (activeView === 'members') {
      setMemberSearch(value)
    } else {
      setStaffSearch(value)
    }
    setCurrentPage(0)
  }, [activeView])

  const handleDateRangeChange = useCallback(({ from, to }: { from: string | null; to: string | null }) => {
    setFromDate(from || '')
    setToDate(to || '')
    setCurrentPage(0)
  }, [])

  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    setCurrentPage(prev => direction === 'prev' ? Math.max(0, prev - 1) : prev + 1)
  }, [])

  const handleCheckout = useCallback(async (sessionId: string, type: 'member' | 'staff') => {
    try {
      await endAttendance.mutateAsync({ sessionId })
      toast.success(`${type === 'member' ? 'Member' : 'Staff'} checked out successfully! 👋`)
    } catch (error) {
      console.error('Checkout failed:', error)
      toast.error('Failed to check out. Please try again.')
    }
  }, [endAttendance])

  // Initialize state from URL on first render
  useEffect(() => {
    if (initializedFromUrl.current) return
    const view = searchParams.get('view')
    const q = searchParams.get('q')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = searchParams.get('page')
    if (view === 'members' || view === 'staff') setActiveView(view)
    if (q) {
      if (view === 'staff') setStaffSearch(q)
      else setMemberSearch(q)
    }
    if (from) setFromDate(from)
    if (to) setToDate(to)
    if (page) setCurrentPage(Math.max(0, parseInt(page, 10) || 0))
    initializedFromUrl.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced URL updates to prevent excessive router calls
  const debouncedUrlUpdate = useMemo(() => {
    let timeoutId: NodeJS.Timeout
    return () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (!initializedFromUrl.current) return
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', activeView)
        const q = activeView === 'members' ? memberSearch : staffSearch
        if (q) params.set('q', q); else params.delete('q')
        if (fromDate) params.set('from', fromDate); else params.delete('from')
        if (toDate) params.set('to', toDate); else params.delete('to')
        if (currentPage > 0) params.set('page', String(currentPage)); else params.delete('page')
        router.replace(`${pathname}?${params.toString()}`)
      }, 150) // 150ms debounce
    }
  }, [activeView, memberSearch, staffSearch, fromDate, toDate, currentPage, router, pathname, searchParams])

  // Trigger debounced URL updates when filters change
  useEffect(() => {
    debouncedUrlUpdate()
  }, [debouncedUrlUpdate])

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Attendance"
        description="Track daily attendance of members and staff"
      />

      {/* Quick Actions Section - includes both actions and live stats */}
      <QuickActions
        membersPresentCount={presentCounts.membersPresentCount}
        staffPresentCount={presentCounts.staffPresentCount}
        totalPresentCount={presentCounts.totalPresentCount}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>
                  {activeView === 'members' ? 'Members' : 'Staff'} Attendance ({(activeView === 'members' ? memberAttendance.length : staffAttendance.length).toLocaleString()})
                </CardTitle>
                <CardDescription>Review check-ins and check-outs • Real-time updates</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Smooth toggle styled like subscription components */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex items-center p-1 rounded-lg bg-muted/50 border border-border relative overflow-hidden">
                <div 
                  className={cn(
                    'absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-primary to-primary/80 shadow-lg transition-all duration-500 ease-in-out transform',
                    activeView === 'members' ? 'left-1 right-[50%]' : 'left-[50%] right-1'
                  )}
                />
                <button
                  onClick={() => handleToggleView('members')}
                  className={cn(
                    'relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out flex items-center gap-2',
                    activeView === 'members' ? 'text-primary-foreground scale-105 font-semibold' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className="h-4 w-4" /> Members
                </button>
                <button
                  onClick={() => handleToggleView('staff')}
                  className={cn(
                    'relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out flex items-center gap-2',
                    activeView === 'staff' ? 'text-primary-foreground scale-105 font-semibold' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <BookUser className="h-4 w-4" /> Staff
                </button>
              </div>
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
            <div className="flex gap-3 items-center">
              <DateRangePopover
                value={{ from: fromDate || null, to: toDate || null }}
                weekStartsOn={1}
                onChange={handleDateRangeChange}
              />
            </div>
          </div>

          {/* Attendance Views */}
          <AttendanceViews
            activeView={activeView}
            memberAttendance={memberAttendance || []}
            staffAttendance={staffAttendance || []}
            membersLoading={membersLoading}
            staffLoading={staffLoading}
            membersError={!!membersError}
            staffError={!!staffError}
            isCheckingOut={endAttendance.isPending}
            currentPage={currentPage}
            pageSize={pageSize}
            onCheckout={handleCheckout}
            onEdit={setEditingSession}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      {/* Edit Session Modal */}
      {gymId && (
        <EditSessionModal
          session={editingSession}
          open={!!editingSession}
          onClose={() => setEditingSession(null)}
          gymId={gymId}
        />
      )}

    </div>
  )
}


const AttendanceList = memo(function AttendanceList({
  rows,
  loading,
  error,
  onCheckout,
  onEdit,
  isCheckingOut = false,
  showRole = false,
}: {
  rows: AttendanceRow[]
  loading: boolean
  error: boolean
  onCheckout: (sessionId: string) => void
  onEdit: (session: AttendanceRow) => void
  isCheckingOut?: boolean
  showRole?: boolean
}) {
  // In-place loading: Always render table structure, use overlay and states instead of replacement
  return (
    <div className="relative">
      {/* Loading overlay - appears over content without replacing it */}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm">Loading attendance...</span>
          </div>
        </div>
      )}
      
      <div className={`rounded-md border overflow-x-auto transition-opacity duration-200 ${loading ? 'opacity-40' : 'opacity-100'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Name</TableHead>
              {showRole && <TableHead className="w-[160px]">Role</TableHead>}
              <TableHead className="w-[200px]">Check-in</TableHead>
              <TableHead className="w-[200px]">Check-out</TableHead>
              <TableHead className="w-[140px]">Total Time</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              // Error state: single row with error message
              <TableRow>
                <TableCell colSpan={showRole ? 6 : 5} className="text-center py-8 text-destructive">
                  Failed to load attendance. Please try again.
                </TableCell>
              </TableRow>
            ) : !rows || rows.length === 0 ? (
              // Empty state: single row with no data message
              <TableRow>
                <TableCell colSpan={showRole ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No attendance records found.
                </TableCell>
              </TableRow>
            ) : (
              // Data state: render actual rows
              rows.map((row) => (
                <TableRow key={row.session_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  {showRole && <TableCell className="capitalize">{row.role}</TableCell>}
                  <TableCell>{new Date(row.check_in_at).toLocaleString()}</TableCell>
                  <TableCell>{row.check_out_at ? new Date(row.check_out_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>{formatDurationFromSeconds(row.total_seconds)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(row)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {!row.check_out_at ? (
                        <Button
                          size="sm"
                          onClick={() => onCheckout(row.session_id)}
                          disabled={isCheckingOut}
                          className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        >
                          {isCheckingOut ? 'Checking out...' : 'Check-out'}
                        </Button>
                      ) : (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})

const AttendancePager = memo(function AttendancePager({
  page,
  pageSize,
  hasMore,
  onPrev,
  onNext,
}: {
  page: number
  pageSize: number
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4">
      <div className="text-sm text-muted-foreground">
        Page {page + 1} • {pageSize} per page
      </div>
      <div className="flex items-center justify-center gap-2 md:justify-end">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasMore}>
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
  isCheckingOut,
  currentPage,
  pageSize,
  onCheckout,
  onEdit,
  onPageChange,
}: {
  activeView: 'members' | 'staff'
  memberAttendance: AttendanceRow[]
  staffAttendance: AttendanceRow[]
  membersLoading: boolean
  staffLoading: boolean
  membersError: boolean
  staffError: boolean
  isCheckingOut: boolean
  currentPage: number
  pageSize: number
  onCheckout: (sessionId: string, type: 'member' | 'staff') => Promise<void>
  onEdit: (session: AttendanceRow | null) => void
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
            isCheckingOut={isCheckingOut}
            onCheckout={(sessionId) => onCheckout(sessionId, 'member')}
            onEdit={onEdit}
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
          isCheckingOut={isCheckingOut}
          onCheckout={(sessionId) => onCheckout(sessionId, 'staff')}
          onEdit={onEdit}
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
