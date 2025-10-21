'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { 
  useMembers, 
  useDeleteMember,
  useMembersStats,
  type MemberFilters 
} from '@/hooks/use-members-data'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { 
  ResponsiveTable, 
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableCell,
  ResponsiveTableActionsCell,
  ResponsiveTableSkeleton
} from '@/components/ui/responsive-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone,
  Calendar,
  Trash2,
  Filter,
  Download,
  Upload,
  Activity,
  UserCheck,
  UserX,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MemberManagementGuard, AnalyticsGuard, AccessDenied } from '@/components/rbac/rbac-guards'
import { EnhancedMemberDialog } from '@/components/members/EnhancedMemberDialog'
import { BulkPortalInvite } from '@/components/members/BulkPortalInvite'
import { BulkImportDialog } from '@/components/members/BulkImportDialog'
import { MemberActionsMenu, MemberPortalStatusBadge } from '@/components/members/MemberActionsMenu'
import { exportMembersToCSV } from '@/lib/member-csv'
import { toast } from 'sonner'


const MembersPage = () => {
  const { profile } = useAuth()
  const gymId = profile?.gym_id

  // Local state for UI
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'name' | 'join_date' | 'status' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(0)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bulkInviteDialogOpen, setBulkInviteDialogOpen] = useState(false)
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false)

  const pageSize = 10

  // Build filters for TanStack Query
  const filters: MemberFilters = useMemo(() => ({
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? null : statusFilter,
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: currentPage * pageSize,
  }), [searchQuery, statusFilter, sortBy, sortOrder, currentPage, pageSize])

  // TanStack Query hooks
  const { 
    data: membersResponse, 
    isLoading: membersLoading, 
    error: membersError,
    refetch: refetchMembers 
  } = useMembers(gymId || null, filters)

  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useMembersStats(gymId || null)

  const deleteMemberMutation = useDeleteMember()

  // Forms (only for add member - edit is handled by EnhancedMemberDialog)

  // Get current member data for editing
  const selectedMember = useMemo(() => {
    if (!selectedMemberId || !membersResponse?.members) return null
    return membersResponse.members.find(m => m.id === selectedMemberId) || null
  }, [selectedMemberId, membersResponse?.members])


  // Handlers


  const handleDeleteMember = async () => {
    if (!selectedMemberId) return
    
    setIsSubmitting(true)
    try {
      await deleteMemberMutation.mutateAsync(selectedMemberId)
      setDeleteDialogOpen(false)
      setSelectedMemberId(null)
    } catch (error) {
      logger.error('Error deleting member:', {error})
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (memberId: string) => {
    setSelectedMemberId(memberId)
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (memberId: string) => {
    setSelectedMemberId(memberId)
    setDeleteDialogOpen(true)
  }

  const handleExportMembers = async () => {
    if (!members || members.length === 0) {
      toast.error('No members to export')
      return
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `members-export-${timestamp}.csv`
      await exportMembersToCSV(members, filename)
      toast.success(`Exported members successfully`)
    } catch (error) {
      logger.error('Error exporting members:', { error: error instanceof Error ? error.message : String(error) })
      toast.error('Failed to export members')
    }
  }

  const handleImportSuccess = () => {
    refetchMembers()
    toast.success('Members imported successfully. Refreshing list...')
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
      case 'inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200 text-gray-800">Unknown</span>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  // Loading state
  if (membersLoading && !membersResponse) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground">Loading your gym members...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (membersError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Members</h1>
            <p className="text-muted-foreground">Error loading members</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to load members</h2>
              <p className="text-muted-foreground mb-6">
                There was an error loading your members data. Please try again.
              </p>
              <Button onClick={() => refetchMembers()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const members = membersResponse?.members || []
  const totalCount = membersResponse?.totalCount || 0
  const hasMore = membersResponse?.hasMore || false

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <PageHeader
        title="Members"
        description="Manage your gym members and track their activities"
      >
        <AnalyticsGuard action="export" fallback={
          <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled title="Export requires staff privileges">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleExportMembers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </AnalyticsGuard>
        <MemberManagementGuard action="create" fallback={
          <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled title="Import requires staff privileges">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        }>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setBulkImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </MemberManagementGuard>
        <MemberManagementGuard action="create" fallback={
          <Button disabled className="w-full sm:w-auto" title="Adding members requires staff privileges">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        }>
          <Button onClick={() => setAddDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </MemberManagementGuard>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setBulkInviteDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Mail className="h-4 w-4 mr-2" />
          Bulk Invite
        </Button>
      </PageHeader>

      {/* Simple Member Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : (stats?.total || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.newThisMonth || 0} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : (stats?.active || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Inactive Members</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '...' : (stats?.inactive || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">New This Week</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : (stats?.newThisWeek || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recent signups
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Members ({totalCount.toLocaleString()})</CardTitle>
              <CardDescription>
                A complete list of all members registered at your gym
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0) // Reset to first page on search
                }}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select 
                value={statusFilter || 'all'} 
                onValueChange={(value) => {
                  setStatusFilter(value === 'all' ? null : value)
                  setCurrentPage(0)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={`${sortBy}-${sortOrder}`} 
                onValueChange={(value) => {
                  const [newSortBy, newSortOrder] = value.split('-') as [typeof sortBy, typeof sortOrder]
                  setSortBy(newSortBy)
                  setSortOrder(newSortOrder)
                  setCurrentPage(0)
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="join_date-desc">Join Date (Recent)</SelectItem>
                  <SelectItem value="join_date-asc">Join Date (Oldest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Responsive Table */}
          <ResponsiveTable>
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableCell>Name</ResponsiveTableCell>
                <ResponsiveTableCell>Email</ResponsiveTableCell>
                <ResponsiveTableCell>Phone</ResponsiveTableCell>
                <ResponsiveTableCell>Join Date</ResponsiveTableCell>
                <ResponsiveTableCell>Status</ResponsiveTableCell>
                <ResponsiveTableCell>Portal</ResponsiveTableCell>
                <ResponsiveTableCell className="text-right">Actions</ResponsiveTableCell>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
                {membersLoading ? (
                  <ResponsiveTableSkeleton rows={5} columns={7} />
                ) : members.length === 0 ? (
                  <ResponsiveTableRow>
                    <ResponsiveTableCell colSpan={7} className="h-96">
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                        <Users className="h-20 w-20 text-muted-foreground opacity-40" />
                        <div className="space-y-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {searchQuery || statusFilter 
                              ? 'No members found' 
                              : 'No members yet'}
                          </h3>
                          <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                            {searchQuery || statusFilter
                              ? 'Try adjusting your search or filters'
                              : 'Get started by adding your first member'}
                          </p>
                        </div>
                        {!searchQuery && !statusFilter && (
                          <MemberManagementGuard action="create" fallback={
                            <div className="text-center py-4">
                              <AccessDenied 
                                message="You need staff privileges or above to add members. Contact your gym manager to request access." 
                              />
                            </div>
                          }>
                            <Button onClick={() => setAddDialogOpen(true)} size="lg" className="mt-4">
                              <UserPlus className="h-5 w-5 mr-2" />
                              Add Your First Member
                            </Button>
                          </MemberManagementGuard>
                        )}
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ) : (
                  members.map((member) => (
                    <ResponsiveTableRow key={member.id}>
                      <ResponsiveTableCell 
                        label="Name" 
                        className="font-medium"
                        mobileOrder={1}
                      >
                        {member.first_name} {member.last_name}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell 
                        label="Email"
                        mobileOrder={2}
                      >
                        {member.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No email</span>
                        )}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell 
                        label="Phone"
                        mobileOrder={3}
                      >
                        {member.phone_number ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{member.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No phone</span>
                        )}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell 
                        label="Join Date"
                        mobileOrder={4}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(member.join_date || null)}</span>
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell 
                        label="Status"
                        mobileOrder={5}
                      >
                        {getStatusBadge(member.status)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell 
                        label="Portal"
                        mobileOrder={6}
                      >
                        <MemberPortalStatusBadge member={member} />
                      </ResponsiveTableCell>
                      <ResponsiveTableActionsCell>
                        <MemberActionsMenu 
                          member={member}
                          onEdit={(member) => openEditDialog(member.id)}
                          onDelete={(member) => openDeleteDialog(member.id)}
                          onSuccess={() => refetchMembers()}
                        />
                      </ResponsiveTableActionsCell>
                    </ResponsiveTableRow>
                  ))
                )}
            </ResponsiveTableBody>
          </ResponsiveTable>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} members
              </div>
              <div className="flex items-center justify-center gap-2 md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Add Member Dialog */}
      {gymId && (
        <EnhancedMemberDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          mode="add"
          gymId={gymId}
          onSuccess={() => refetchMembers()}
        />
      )}
      
      {/* Enhanced Edit Member Dialog */}
      {gymId && selectedMember && (
        <EnhancedMemberDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          mode="edit"
          gymId={gymId}
          member={selectedMember}
          onSuccess={() => refetchMembers()}
        />
      )}

      {/* Bulk Portal Invite Dialog */}
      {gymId && (
        <BulkPortalInvite
          open={bulkInviteDialogOpen}
          onOpenChange={setBulkInviteDialogOpen}
          gymId={gymId}
          onSuccess={() => refetchMembers()}
        />
      )}

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportDialogOpen}
        onOpenChange={setBulkImportDialogOpen}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMember?.first_name} {selectedMember?.last_name}? 
              This action cannot be undone and will permanently remove all member data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isSubmitting || deleteMemberMutation.isPending}
            >
              {isSubmitting || deleteMemberMutation.isPending ? 'Deleting...' : 'Delete Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MembersPage 