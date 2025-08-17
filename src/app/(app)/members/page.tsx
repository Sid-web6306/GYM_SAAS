'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { 
  useMembers, 
  useCreateMember, 
  useUpdateMember, 
  useDeleteMember,
  useMembersStats,
  type MemberFilters 
} from '@/hooks/use-members-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone,
  Calendar,
  Edit,
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { MemberManagementGuard, AnalyticsGuard, AccessDenied } from '@/components/rbac/rbac-guards'

// Form schema
const memberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
})

type MemberFormData = z.infer<typeof memberSchema>

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

  const createMemberMutation = useCreateMember()
  const updateMemberMutation = useUpdateMember()
  const deleteMemberMutation = useDeleteMember()

  // Forms
  const addForm = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      status: 'active',
    },
  })

  const editForm = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      status: 'active',
    },
  })

  // Get current member data for editing
  const selectedMember = useMemo(() => {
    if (!selectedMemberId || !membersResponse?.members) return null
    return membersResponse.members.find(m => m.id === selectedMemberId) || null
  }, [selectedMemberId, membersResponse?.members])

  // Update edit form when selected member changes
  useEffect(() => {
    if (selectedMember) {
      console.log('Pre-filling edit form with member data:', selectedMember)
      editForm.reset({
        first_name: selectedMember.first_name || '',
        last_name: selectedMember.last_name || '',
        email: selectedMember.email || '',
        phone_number: selectedMember.phone_number || '',
        status: (selectedMember.status as 'active' | 'inactive' | 'pending') || 'active',
      })
    }
  }, [selectedMember, editForm])

  // Reset edit form when dialog closes
  useEffect(() => {
    if (!editDialogOpen) {
      editForm.reset()
    }
  }, [editDialogOpen, editForm])

  // Handlers
  const handleAddMember = async (data: MemberFormData) => {
    if (!gymId) return
    
    setIsSubmitting(true)
    try {
      await createMemberMutation.mutateAsync({
        gymId,
        memberData: {
          ...data,
          email: data.email || null,
          phone_number: data.phone_number || null,
        }
      })
      addForm.reset()
      setAddDialogOpen(false)
    } catch (error) {
      console.error('Error creating member:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMember = async (data: MemberFormData) => {
    if (!selectedMemberId) return
    
    setIsSubmitting(true)
    try {
      await updateMemberMutation.mutateAsync({
        memberId: selectedMemberId,
        updates: {
          ...data,
          email: data.email || null,
          phone_number: data.phone_number || null,
        }
      })
      setEditDialogOpen(false)
      setSelectedMemberId(null)
      // Reset form after successful update
      editForm.reset()
    } catch (error) {
      console.error('Error updating member:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Close edit dialog and cleanup
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false)
    setSelectedMemberId(null)
    // Reset form when dialog is closed
    editForm.reset()
  }

  const handleDeleteMember = async () => {
    if (!selectedMemberId) return
    
    setIsSubmitting(true)
    try {
      await deleteMemberMutation.mutateAsync(selectedMemberId)
      setDeleteDialogOpen(false)
      setSelectedMemberId(null)
    } catch (error) {
      console.error('Error deleting member:', error)
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
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </AnalyticsGuard>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
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
      </PageHeader>

      {/* Stats Cards */}
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
          
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[250px]">Email</TableHead>
                  <TableHead className="w-[180px]">Phone</TableHead>
                  <TableHead className="w-[140px]">Join Date</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-8 ml-auto"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <Users className="h-16 w-16 text-muted-foreground opacity-50" />
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">
                            {searchQuery || statusFilter 
                              ? 'No members found' 
                              : 'No members yet'}
                          </h3>
                          <p className="text-muted-foreground max-w-sm">
                            {searchQuery || statusFilter
                              ? 'Try adjusting your search or filters'
                              : 'Get started by adding your first member'}
                          </p>
                        </div>
                        {!searchQuery && !statusFilter && (
                          <MemberManagementGuard action="create" fallback={
                            <div className="text-center py-8">
                              <AccessDenied 
                                message="You need staff privileges or above to add members. Contact your gym manager to request access." 
                              />
                            </div>
                          }>
                            <Button onClick={() => setAddDialogOpen(true)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Your First Member
                            </Button>
                          </MemberManagementGuard>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium py-4">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell className="py-4">
                        {member.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No email</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        {member.phone_number ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{member.phone_number}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No phone</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(member.join_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(member.status)}
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <MemberManagementGuard action="update" fallback={
                              <DropdownMenuItem disabled className="text-gray-400">
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Member (Staff Only)
                              </DropdownMenuItem>
                            }>
                              <DropdownMenuItem onClick={() => openEditDialog(member.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Member
                              </DropdownMenuItem>
                            </MemberManagementGuard>
                            <MemberManagementGuard action="delete" fallback={
                              <DropdownMenuItem disabled className="text-gray-400">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Member (Staff Only)
                              </DropdownMenuItem>
                            }>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(member.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Member
                              </DropdownMenuItem>
                            </MemberManagementGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Member
            </DialogTitle>
            <DialogDescription>
              Add a new member to your gym. All fields except email and phone are required.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddMember)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Used for notifications and communication.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Used for emergency contact and notifications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Initial membership status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || createMemberMutation.isPending}
                >
                  {isSubmitting || createMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseEditDialog()
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Member
            </DialogTitle>
            <DialogDescription>
              Update member information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditMember)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditDialog}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || updateMemberMutation.isPending}
                >
                  {isSubmitting || updateMemberMutation.isPending ? 'Updating...' : 'Update Member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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