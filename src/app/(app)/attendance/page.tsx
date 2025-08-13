'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
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
import { CalendarDays, Users, BookUser, Search } from 'lucide-react'
import { StaffManagementGuard, MemberManagementGuard, AccessDenied } from '@/components/rbac/rbac-guards'
import { useAuth } from '@/hooks/use-auth'
import { useMemberAttendance, useStaffAttendance, formatDurationFromSeconds, useEndAttendance } from '@/hooks/use-attendance'
import { Button } from '@/components/ui/button'
import DateRangePopover from '@/components/ui/date-range-popover'
import { cn } from '@/lib/utils'

export default function AttendancePage() {
  const [memberSearch, setMemberSearch] = useState('')
  const [staffSearch, setStaffSearch] = useState('')
  const [activeView, setActiveView] = useState<'members' | 'staff'>('members')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 50
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initializedFromUrl = useRef(false)
  const { profile } = useAuth()
  const gymId = profile?.gym_id || null

  const memberFilters = useMemo(() => ({
    search: memberSearch || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  }), [memberSearch, fromDate, toDate, currentPage])

  const staffFilters = useMemo(() => ({
    search: staffSearch || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  }), [staffSearch, fromDate, toDate, currentPage])

  const { data: memberAttendance = [], isLoading: membersLoading, error: membersError } = useMemberAttendance(gymId, memberFilters)
  const { data: staffAttendance = [], isLoading: staffLoading, error: staffError } = useStaffAttendance(gymId, staffFilters)
  const endAttendance = useEndAttendance()

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

  // Persist state to URL when filters change
  useEffect(() => {
    if (!initializedFromUrl.current) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', activeView)
    const q = activeView === 'members' ? memberSearch : staffSearch
    if (q) params.set('q', q); else params.delete('q')
    if (fromDate) params.set('from', fromDate); else params.delete('from')
    if (toDate) params.set('to', toDate); else params.delete('to')
    if (currentPage > 0) params.set('page', String(currentPage)); else params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }, [activeView, memberSearch, staffSearch, fromDate, toDate, currentPage, router, pathname, searchParams])

  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Attendance"
        description="Track daily attendance of members and staff"
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>
                  All {activeView === 'members' ? 'Members' : 'Staff'} Attendance ({(activeView === 'members' ? memberAttendance.length : staffAttendance.length).toLocaleString()})
                </CardTitle>
                <CardDescription>Review today’s check-ins and check-outs</CardDescription>
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
                  onClick={() => { setActiveView('members'); setCurrentPage(0) }}
                  className={cn(
                    'relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out flex items-center gap-2',
                    activeView === 'members' ? 'text-primary-foreground scale-105 font-semibold' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Users className="h-4 w-4" /> Members
                </button>
                <button
                  onClick={() => { setActiveView('staff'); setCurrentPage(0) }}
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

          {/* Quick Stats */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Members Present</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{(memberAttendance || []).filter(r => !r.check_out_at).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Staff Present</CardTitle>
                <BookUser className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{(staffAttendance || []).filter(r => !r.check_out_at).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">Total Present</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{((memberAttendance || []).filter(r => !r.check_out_at).length) + ((staffAttendance || []).filter(r => !r.check_out_at).length)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters - search and date side-by-side */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeView === 'members' ? 'members' : 'staff'}...`}
                value={activeView === 'members' ? memberSearch : staffSearch}
                onChange={(e) => {
                  if (activeView === 'members') setMemberSearch(e.target.value); else setStaffSearch(e.target.value)
                  setCurrentPage(0)
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3 items-center">
              <DateRangePopover
                value={{ from: fromDate || null, to: toDate || null }}
                weekStartsOn={1}
                onChange={({ from, to }) => {
                  setFromDate(from || '')
                  setToDate(to || '')
                  setCurrentPage(0)
                }}
              />
            </div>
          </div>

            {/* Members Attendance View */}
            {activeView === 'members' && (
              <MemberManagementGuard
                action="read"
                fallback={<AccessDenied message="You don't have permission to view member attendance." />}
              >
                <div className="space-y-4">
                  <AttendanceList
                    rows={memberAttendance || []}
                    loading={membersLoading}
                    error={!!membersError}
                    onCheckout={(sessionId) => endAttendance.mutateAsync({ sessionId })}
                  />
                  <AttendancePager
                    page={currentPage}
                    pageSize={pageSize}
                    hasMore={(memberAttendance || []).length === pageSize}
                    onPrev={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    onNext={() => setCurrentPage(currentPage + 1)}
                  />
                </div>
              </MemberManagementGuard>
            )}

            {/* Staff Attendance View */}
            {activeView === 'staff' && (
              <StaffManagementGuard
                action="read"
                fallback={<AccessDenied message="You don't have permission to view staff attendance." />}
              >
                <div className="space-y-4">
                  <AttendanceList
                    rows={staffAttendance || []}
                    loading={staffLoading}
                    error={!!staffError}
                    onCheckout={(sessionId) => endAttendance.mutateAsync({ sessionId })}
                    showRole
                  />
                  <AttendancePager
                    page={currentPage}
                    pageSize={pageSize}
                    hasMore={(staffAttendance || []).length === pageSize}
                    onPrev={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    onNext={() => setCurrentPage(currentPage + 1)}
                  />
                </div>
              </StaffManagementGuard>
            )}
        </CardContent>
      </Card>

    </div>
  )
}


function AttendanceList({
  rows,
  loading,
  error,
  onCheckout,
  showRole = false,
}: {
  rows: Array<{
    session_id: string
    name: string
    role: string
    check_in_at: string
    check_out_at: string | null
    total_seconds: number
  }>
  loading: boolean
  error: boolean
  onCheckout: (sessionId: string) => void
  showRole?: boolean
}) {
  if (loading) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Loading attendance...
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-md border p-8 text-center text-destructive">
        Failed to load attendance.
      </div>
    )
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No attendance records found.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[240px]">Name</TableHead>
            {showRole && <TableHead className="w-[160px]">Role</TableHead>}
            <TableHead className="w-[200px]">Check-in</TableHead>
            <TableHead className="w-[200px]">Check-out</TableHead>
            <TableHead className="w-[140px]">Total Time</TableHead>
            <TableHead className="w-[140px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.session_id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {showRole && <TableCell className="capitalize">{row.role}</TableCell>}
              <TableCell>{new Date(row.check_in_at).toLocaleString()}</TableCell>
              <TableCell>{row.check_out_at ? new Date(row.check_out_at).toLocaleString() : '—'}</TableCell>
              <TableCell>{formatDurationFromSeconds(row.total_seconds)}</TableCell>
              <TableCell className="text-right">
                {!row.check_out_at ? (
                  <Button
                    size="sm"
                    onClick={() => onCheckout(row.session_id)}
                  >
                    Check-out
                  </Button>
                ) : (
                  <Badge variant="secondary">Completed</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AttendancePager({
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
}

// QuickDatePresets removed in favor of unified DateRangeControl