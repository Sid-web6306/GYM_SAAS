'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRBAC, useRemoveRole } from '@/hooks/use-rbac'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Crown, 
  MoreHorizontal, 
  UserMinus, 
  AlertTriangle, 
  Users, 
  Dumbbell 
} from 'lucide-react'
import { ROLE_COLORS } from '@/components/layout/RoleContextIndicator'
import { PermissionBadge } from './PermissionBadge'
import { ROLE_PERMISSIONS } from '@/lib/constants/rbac'
import { toastActions } from '@/stores/toast-store'
import type { GymRole } from '@/types/rbac.types'

interface UserManagementProps {
  userId: string
  userEmail: string
  userName: string | null
  userRole: GymRole
  gymId: string
  isCurrentUser?: boolean
}

export function UserManagement({
  userId,
  userEmail,
  userName,
  userRole,
  gymId,
  isCurrentUser = false
}: UserManagementProps) {
  const { } = useAuth()
  const rbac = useRBAC()
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const removeRoleMutation = useRemoveRole()
  
  const isOwner = rbac?.isOwner || false
  const canRemoveUser = isOwner || (rbac?.can('staff.delete') && userRole !== 'owner')
  
  // Prevent removing self
  if (isCurrentUser) {
    return null
  }

  const handleRemoveUser = async () => {
    try {
      await removeRoleMutation.mutateAsync({
        user_id: userId,
        gym_id: gymId
      })
      
      toastActions.success(
        'User Removed', 
        `${userName || userEmail} has been successfully removed from the gym`
      )
      setConfirmDialogOpen(false)
    } catch (error) {
      logger.error('Error removing user:', {error})
      const errorMessage = error instanceof Error ? error.message : 'There was an error removing the user. Please try again.'
      toastActions.error(
        'Removal Failed', 
        errorMessage
      )
    }
  }

  const getRoleIcon = (role: GymRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 mr-2" />
      case 'trainer':
        return <Dumbbell className="h-4 w-4 mr-2" />
      default:
        return <Users className="h-4 w-4 mr-2" />
    }
  }

  if (!canRemoveUser) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setConfirmDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remove from Gym
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove User from Gym
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{userName || userEmail}</strong> from your gym?
              <br />
              <span className="text-sm text-muted-foreground mt-1 block">
                This will remove their access to the gym and clean up their associated data.
              </span>
              {userRole === 'owner' && (
                <div className="mt-2">
                  <Badge className={ROLE_COLORS.owner}>
                    {getRoleIcon(userRole)}
                    Owner
                  </Badge>
                  <p className="mt-2 text-destructive font-medium">
                    Warning: You are removing another owner from the gym. This action cannot be undone.
                  </p>
                </div>
              )}
              
              {/* Show user permissions */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {userName || userEmail}&apos;s permissions:
                </p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_PERMISSIONS[userRole].slice(0, 3).map((permission) => (
                    <PermissionBadge 
                      key={permission} 
                      permission={permission} 
                      variant="compact"
                    />
                  ))}
                  {ROLE_PERMISSIONS[userRole].length > 3 && (
                    <Badge variant="outline" className="text-muted-foreground">
                      +{ROLE_PERMISSIONS[userRole].length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={removeRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveUser}
              disabled={removeRoleMutation.isPending}
            >
              {removeRoleMutation.isPending ? 'Removing...' : 'Remove User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
