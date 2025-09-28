'use client'

import React, { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { type Member } from '@/types/member.types'
import { MemberPortalInvite } from './MemberPortalInvite'

interface MemberActionsMenuProps {
  member: Member
  onEdit?: (member: Member) => void
  onDelete?: (member: Member) => void
  onSuccess?: () => void
}

export function MemberActionsMenu({ 
  member, 
  onEdit, 
  onDelete, 
  onSuccess 
}: MemberActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getPortalStatus = () => {
    if (member.user_id) {
      return {
        status: 'active',
        label: 'Portal Active',
        icon: CheckCircle,
        color: 'text-green-600'
      }
    }
    
    if (member.portal_invited_at) {
      return {
        status: 'invited',
        label: 'Portal Invited',
        icon: Clock,
        color: 'text-yellow-600'
      }
    }
    
    if (member.email) {
      return {
        status: 'eligible',
        label: 'Portal Eligible',
        icon: UserCheck,
        color: 'text-blue-600'
      }
    }
    
    return {
      status: 'not_eligible',
      label: 'No Email',
      icon: AlertCircle,
      color: 'text-gray-400'
    }
  }

  const portalStatus = getPortalStatus()
  const StatusIcon = portalStatus.icon

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Portal Status Indicator */}
        <div className="px-2 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${portalStatus.color}`} />
            <span className="text-muted-foreground">{portalStatus.label}</span>
          </div>
          {member.portal_invited_at && (
            <div className="text-xs text-muted-foreground mt-1">
              Invited: {new Date(member.portal_invited_at).toLocaleDateString()}
              {member.invitation_count && member.invitation_count > 1 && (
                <span className="ml-1">({member.invitation_count} times)</span>
              )}
            </div>
          )}
          {member.last_activity_at && (
            <div className="text-xs text-muted-foreground">
              Last active: {new Date(member.last_activity_at).toLocaleDateString()}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Core Actions */}
        <DropdownMenuItem onClick={() => onEdit?.(member)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Details
        </DropdownMenuItem>

        {/* Portal Access Management */}
        {!member.user_id ? (
          <MemberPortalInvite member={member} onSuccess={onSuccess} />
        ) : (
          <DropdownMenuItem disabled className="text-green-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            Portal Access Active
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Status Actions */}
        {member.status !== 'active' && (
          <DropdownMenuItem 
            onClick={() => {
              // This would trigger a status update
              logger.info('Activate member:', { memberId: member.id })
            }}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate Member
          </DropdownMenuItem>
        )}

        {member.status === 'active' && (
          <DropdownMenuItem 
            onClick={() => {
              // This would trigger a status update
              logger.info('Deactivate member:', { memberId: member.id })
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Deactivate Member
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Danger Zone */}
        <DropdownMenuItem 
          onClick={() => onDelete?.(member)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export a simple portal status badge component for use elsewhere
export function MemberPortalStatusBadge({ member }: { member: Member }) {
  if (member.user_id) {
    return (
      <Badge variant="secondary" className="text-green-700 bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        Portal Active
      </Badge>
    )
  }
  
  if (member.portal_invited_at) {
    return (
      <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">
        <Clock className="h-3 w-3 mr-1" />
        Invited
      </Badge>
    )
  }
  
  if (member.email) {
    return (
      <Badge variant="outline" className="text-blue-700 border-blue-200">
        <UserCheck className="h-3 w-3 mr-1" />
        Eligible
      </Badge>
    )
  }
  
  return (
    <Badge variant="outline" className="text-gray-500">
      <AlertCircle className="h-3 w-3 mr-1" />
      No Email
    </Badge>
  )
}
