'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useInvitations, useInvitationSummary } from '@/hooks/use-invitations'
import { useRBAC } from '@/hooks/use-rbac'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreHorizontal,
  Copy,
  Send,
  Trash2,
  AlertCircle,
  Search,
  RotateCcw
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toastActions } from '@/stores/toast-store'
import { ROLE_LEVELS } from '@/types/rbac.types'
import { ROLE_COLORS } from '@/components/layout/RoleContextIndicator'
import type { GymRole } from '@/types/rbac.types'
import type { InvitationWithDetails, InvitationFilters } from '@/types/invite.types'
import { formatDistanceToNow } from 'date-fns'

// Form validation schema
const inviteFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member'], {
    required_error: 'Please select a role'
  }),
  expires_in_hours: z.number().min(1).max(168),
  message: z.string().max(500).optional(),
  notify_user: z.boolean()
})

type InviteFormData = z.infer<typeof inviteFormSchema>

interface TeamTabProps {
  className?: string
}

export const TeamTab: React.FC<TeamTabProps> = ({ className }) => {
  const { profile } = useAuth()
  const rbac = useRBAC()
  const [searchTerm, setSearchTerm] = useState('')
  type InviteStatusFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked'
  const [statusFilter, setStatusFilter] = useState<InviteStatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | GymRole>('all')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  // Check permissions
  const canManageTeam = rbac?.can('staff.create') || rbac?.can('staff.read') || false
  const canInviteMembers = rbac?.can('staff.create') || false

  // Create filters object
  const filters: InvitationFilters = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    role: roleFilter === 'all' ? undefined : roleFilter,
    search: searchTerm || undefined
  }), [searchTerm, statusFilter, roleFilter])

  // Fetch invitations and summary
  const { 
    invitations, 
    isLoading, 
    error, 
    createInvitation, 
    revokeInvitation, 
    resendInvitation, 
    refetch 
  } = useInvitations(profile?.gym_id ?? '', filters)

  const { data: summary } = useInvitationSummary(profile?.gym_id ?? '')

  // Form handling
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'member',
      expires_in_hours: 72,
      message: '',
      notify_user: true
    } as InviteFormData
  })

  // Handle invite creation
  const handleCreateInvite: SubmitHandler<InviteFormData> = async (data) => {
    try {
      const result = await createInvitation({
        email: data.email,
        role: data.role,
        expires_in_hours: data.expires_in_hours,
        message: data.message,
        notify_user: data.notify_user
      })

      if (result.success) {
        toastActions.success('Invitation Sent', `Invitation sent to ${data.email}`)
        form.reset()
        setIsInviteDialogOpen(false)
      } else {
        toastActions.error('Failed to Send Invitation', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error creating invitation:', error)
      toastActions.error('Error', 'Failed to send invitation')
    }
  }

  // Handle invitation actions
  const handleRevokeInvite = async (invitationId: string, email: string) => {
    try {
      const result = await revokeInvitation(invitationId)
      if (result.success) {
        toastActions.success('Invitation Revoked', `Invitation for ${email} has been revoked`)
      } else {
        toastActions.error('Failed to Revoke', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error revoking invitation:', error)
      toastActions.error('Error', 'Failed to revoke invitation')
    }
  }

  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      const result = await resendInvitation(invitationId)
      if (result.success) {
        toastActions.success('Invitation Resent', `New invitation sent to ${email}`)
      } else {
        toastActions.error('Failed to Resend', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      toastActions.error('Error', 'Failed to resend invitation')
    }
  }

  const copyInviteLink = async (invitation: InvitationWithDetails) => {
    // Note: In production, you'd generate the actual invite URL
    const inviteUrl = `${window.location.origin}/onboarding?invite=${invitation.id}`
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toastActions.success('Link Copied', 'Invitation link copied to clipboard')
    } catch (error) {
      console.error('Error copying invite link:', error)
      toastActions.error('Failed to Copy', 'Could not copy link to clipboard')
    }
  }

  // Helper functions
  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
      revoked: 'bg-red-100 text-red-800'
    }
    
    const icons = {
      pending: Clock,
      accepted: CheckCircle,
      expired: XCircle,
      revoked: XCircle
    }

    const Icon = icons[status as keyof typeof icons] || Clock
    const variant = variants[status as keyof typeof variants] || variants.pending

    return (
      <Badge className={`${variant} inline-flex items-center gap-1 px-2 py-0.5 w-auto`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => (
    <Badge className={`${ROLE_COLORS[role as keyof typeof ROLE_COLORS] || ROLE_COLORS.member} inline-flex items-center px-2 py-0.5 w-auto capitalize`}>
      {role}
    </Badge>
  )

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date()

  const canInviteRole = (role: GymRole): boolean => {
    if (!rbac) return false
    const userLevel = rbac.role_level
    const targetLevel = ROLE_LEVELS[role]
    return userLevel > targetLevel
  }

  if (!canManageTeam) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center">
            You don&apos;t have permission to manage team members and invitations.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Invite and manage team members for your gym
              </CardDescription>
            </div>
            
            {canInviteMembers && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your gym with a specific role.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={form.handleSubmit(handleCreateInvite)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        {...form.register('email')}
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={form.watch('role')}
                        onValueChange={(value) => form.setValue('role', value as GymRole)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['member', 'staff', 'trainer', 'manager', 'owner'] as GymRole[])
                            .filter(role => canInviteRole(role))
                            .map(role => (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  {getRoleBadge(role)}
                                  <span className="capitalize">{role}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.role && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {form.formState.errors.role.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expires_in_hours">Expires In</Label>
                      <Select
                        value={String(form.watch('expires_in_hours'))}
                        onValueChange={(value) => form.setValue('expires_in_hours', Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">2 days</SelectItem>
                          <SelectItem value="72">3 days</SelectItem>
                          <SelectItem value="168">1 week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Personal Message (Optional)</Label>
                      <Input
                        id="message"
                        placeholder="Add a personal note..."
                        {...form.register('message')}
                      />
                      <p className="text-sm text-muted-foreground">
                        This message will be included in the invitation email.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsInviteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        {summary && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total Invites</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.accepted}</div>
                <div className="text-sm text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{summary.expired}</div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.revoked}</div>
                <div className="text-sm text-muted-foreground">Revoked</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InviteStatusFilter)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as 'all' | GymRole)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={refetch}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invitations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Invitations</CardTitle>
          <CardDescription>
            Manage pending and completed invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-2">Loading invitations...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Invitations Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                  ? 'No invitations match your current filters.'
                  : 'Start by inviting team members to join your gym.'}
              </p>
              {canInviteMembers && (
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send First Invitation
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(invitation.role)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invitation.status)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{invitation.invited_by?.full_name || invitation.invited_by?.email || 'Unknown'}</div>
                          <div className="text-muted-foreground">
                            {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className={isExpired(invitation.expires_at) ? 'text-destructive' : ''}>
                            {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                          </div>
                          {invitation.status === 'accepted' && invitation.accepted_at && (
                            <div className="text-muted-foreground">
                              Accepted {formatDistanceToNow(new Date(invitation.accepted_at), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invitation.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => copyInviteLink(invitation)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResendInvite(invitation.id, invitation.email)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Resend
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleRevokeInvite(invitation.id, invitation.email)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Revoke
                                </DropdownMenuItem>
                              </>
                            )}
                            {invitation.status === 'expired' && (
                              <DropdownMenuItem onClick={() => handleResendInvite(invitation.id, invitation.email)}>
                                <Send className="h-4 w-4 mr-2" />
                                Resend
                              </DropdownMenuItem>
                            )}
                            {invitation.status === 'accepted' && (
                              <DropdownMenuItem disabled>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Invitation Accepted
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
