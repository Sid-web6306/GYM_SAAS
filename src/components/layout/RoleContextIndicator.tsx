'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { 
  Crown, 
  Users, 
  Dumbbell, 
  ClipboardList, 
  User,
  Building2,
  Shield
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useGymData, useGymOwner } from '@/hooks/use-gym-data'
import { ROLE_LEVELS } from '@/types/rbac.types'
import { cn } from '@/lib/utils'

type GymRole = 'owner' | 'manager' | 'trainer' | 'staff' | 'member'

// Role icon mapping
export const ROLE_ICONS = {
  owner: Crown,
  manager: Users,
  trainer: Dumbbell,
  staff: ClipboardList,
  member: User,
} as const

// Role color mapping
export const ROLE_COLORS = {
  owner: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  manager: 'bg-purple-100 text-purple-800 border-purple-200',
  trainer: 'bg-blue-100 text-blue-800 border-blue-200',
  staff: 'bg-green-100 text-green-800 border-green-200',
  member: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

interface RoleContextIndicatorProps {
  variant?: 'compact' | 'full' | 'chip'
  showGym?: boolean
  showPermissions?: boolean
  className?: string
}

export function RoleContextIndicator({ 
  variant = 'compact', 
  showGym = true,
  className 
}: RoleContextIndicatorProps) {
  const { profile } = useAuth()
  const { data: gym } = useGymData(profile?.gym_id || null)
  const { data: gymOwner } = useGymOwner(profile?.gym_id || null)
  
  const role = profile?.default_role as GymRole
  const gymName = gym?.name || 'Unknown Gym'
  const roleLevel = role ? ROLE_LEVELS[role] : 0
  const shouldShowOwner = roleLevel < 100 && gymOwner
  
  if (!role || !profile?.gym_id) {
    return null
  }

  const RoleIcon = ROLE_ICONS[role]
  const roleColors = ROLE_COLORS[role]

  // Chip variant - minimal inline display
  if (variant === 'chip') {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <Badge variant="outline" className={cn("capitalize", roleColors)}>
          <RoleIcon className="w-3 h-3 mr-1" />
          {role}
        </Badge>
        {showGym && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Building2 className="w-3 h-3 mr-1" />
            {gymName}
            {shouldShowOwner && (
              <span className="text-xs ml-1 opacity-75">
                (Owner: {gymOwner.full_name || gymOwner.email})
              </span>
            )}
          </Badge>
        )}
      </div>
    )
  }

  // Compact variant - sidebar display
  if (variant === 'compact') {
    return (
      <Card className={cn("p-3 bg-gradient-to-r from-gray-50 to-white border", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", roleColors.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-'))}>
              <RoleIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                {role}
              </p>
              {showGym && (
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600 truncate" title={gymName}>
                    {gymName}
                  </p>
                  {shouldShowOwner && (
                    <p className="text-xs text-gray-500 truncate" title={`Owner: ${gymOwner.full_name || gymOwner.email}`}>
                      Owner: {gymOwner.full_name || gymOwner.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <Shield className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 ml-1">{roleLevel}</span>
          </div>
        </div>
      </Card>
    )
  }

  // Full variant - detailed display
  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", roleColors.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 text-'))}>
              <RoleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {role}
              </h3>
              <p className="text-sm text-gray-600">
                Access Level: {roleLevel}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={roleColors}>
            Active
          </Badge>
        </div>

        {/* Gym Information */}
        {showGym && roleLevel<= 75 && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <Building2 className="w-4 h-4 text-gray-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{gymName}</p>
              <p className="text-xs text-gray-600">Current Gym</p>
              {shouldShowOwner && (
                <p className="text-xs text-gray-500 mt-1">
                  Owner: {gymOwner.full_name || gymOwner.email}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// Quick role display for headers
export function QuickRoleDisplay({ className }: { className?: string }) {
  const { profile } = useAuth()
  const role = profile?.default_role
  
  if (!role) return null
  
  const RoleIcon = ROLE_ICONS[role]
  const roleColors = ROLE_COLORS[role]
  
  return (
    <Badge variant="outline" className={cn("capitalize", roleColors, className)}>
      <RoleIcon className="w-3 h-3 mr-1" />
      {role}
    </Badge>
  )
}

// Gym context display
export function GymContextDisplay({ className }: { className?: string }) {
  const { profile } = useAuth()
  const { data: gym } = useGymData(profile?.gym_id || null)
  const { data: gymOwner } = useGymOwner(profile?.gym_id || null)
  
  const role = profile?.default_role as GymRole
  const roleLevel = role ? ROLE_LEVELS[role] : 0
  const shouldShowOwner = roleLevel < 100 && gymOwner
  
  if (!gym) return null
  
  return (
    <div className={cn("flex items-center gap-2 text-sm text-gray-600", className)}>
      <Building2 className="w-4 h-4" />
      <div className="truncate">
        <span title={gym.name || ''}>{gym.name}</span>
        {shouldShowOwner && (
          <span className="text-xs text-gray-500 ml-2">
            (Owner: {gymOwner.full_name || gymOwner.email})
          </span>
        )}
      </div>
    </div>
  )
}
