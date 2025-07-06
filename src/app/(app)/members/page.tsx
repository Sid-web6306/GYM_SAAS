'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useMembersStore } from '@/stores'
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
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Phone,
  Calendar,
  Edit,
  Trash2,
  Filter
} from 'lucide-react'
import { toastActions } from '@/stores/toast-store'
import { AddMemberDialog } from './components/add-member-dialog'
import { EditMemberDialog } from './components/edit-member-dialog'

const MembersPage = () => {
  const gymId = useAuthStore((state) => state.profile?.gym_id)
  
  const members = useMembersStore(state => state.members)
  const isLoading = useMembersStore(state => state.isLoading)
  const searchQuery = useMembersStore(state => state.searchQuery)
  const statusFilter = useMembersStore(state => state.statusFilter)
  const getFilteredMembers = useMembersStore(state => state.getFilteredMembers)
  const setSearchQuery = useMembersStore(state => state.setSearchQuery)
  const setStatusFilter = useMembersStore(state => state.setStatusFilter)
  const fetchMembers = useMembersStore(state => state.fetchMembers)
  const deleteMember = useMembersStore(state => state.deleteMember)
  
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  
  const filteredMembers = getFilteredMembers()
  
  // Fetch members on mount
  useEffect(() => {
    if (gymId) {
      fetchMembers(gymId)
    }
  }, [gymId, fetchMembers])
  
  const handleEdit = (memberId: string) => {
    setSelectedMemberId(memberId)
    setEditDialogOpen(true)
  }
  
  const handleDelete = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return
    }
    
    try {
      await deleteMember(memberId)
      toastActions.success('Member Deleted', 'Member has been deleted successfully.')
    } catch (error) {
      console.log("Error deleting member", error)
      toastActions.error('Delete Failed', 'Failed to delete member. Please try again.')
    }
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }
  
  const getStatusBadge = (status: string | null) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    }
    
    const displayStatus = status || 'pending'
    const colorClass = statusColors[displayStatus as keyof typeof statusColors] || statusColors.pending
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
      </span>
    )
  }
  
  if (isLoading && members.length === 0) {
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
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage your gym members and their information
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              All registered members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => m.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active members
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {members.filter(m => {
                const joinDate = new Date(m.created_at)
                const now = new Date()
                return joinDate.getMonth() === now.getMonth() && 
                       joinDate.getFullYear() === now.getFullYear()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Joined this month
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            A list of all members registered at your gym
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}>
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
          </div>
          
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {searchQuery || statusFilter 
                            ? 'No members found matching your criteria' 
                            : 'No members yet. Add your first member!'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {member.email || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {member.phone_number || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(member.join_date)}</TableCell>
                      <TableCell>{getStatusBadge(member.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(member.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(member.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialogs */}
      <AddMemberDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        gymId={gymId!}
      />
      
      {selectedMemberId && (
        <EditMemberDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          memberId={selectedMemberId}
        />
      )}
    </div>
  )
}

export default MembersPage 