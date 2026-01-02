'use client'

import { Badge } from '@/components/ui/badge'
import { getPermissionLabel } from '@/lib/permission-labels'
import type { Permission } from '@/types/rbac.types'

interface PermissionBadgeProps {
  permission: Permission
  showIcon?: boolean
  showDescription?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export function PermissionBadge({ 
  permission, 
  showIcon = true, 
  showDescription = false,
  variant = 'default'
}: PermissionBadgeProps) {
  const label = getPermissionLabel(permission)
  
  if (variant === 'compact') {
    return (
      <Badge className={label.color}>
        {showIcon && <label.icon className="h-3 w-3 mr-1" />}
        {label.title}
      </Badge>
    )
  }
  
  if (variant === 'detailed') {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
        <Badge className={label.color}>
          {showIcon && <label.icon className="h-3 w-3 mr-1" />}
          {label.title}
        </Badge>
        <div className="flex-1">
          <p className="text-sm font-medium">{label.title}</p>
          {showDescription && (
            <p className="text-xs text-muted-foreground">{label.description}</p>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <Badge className={label.color}>
      {showIcon && <label.icon className="h-3 w-3 mr-1" />}
      {label.title}
    </Badge>
  )
}

interface PermissionGroupProps {
  permissions: Permission[]
  title?: string
  maxVisible?: number
}

export function PermissionGroup({ 
  permissions, 
  title, 
  maxVisible = 3 
}: PermissionGroupProps) {
  const visiblePermissions = permissions.slice(0, maxVisible)
  const remainingCount = permissions.length - maxVisible
  
  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      )}
      <div className="flex flex-wrap gap-1">
        {visiblePermissions.map((permission) => (
          <PermissionBadge 
            key={permission} 
            permission={permission} 
            variant="compact"
          />
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-muted-foreground">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    </div>
  )
}

interface PermissionCategoryProps {
  category: string
  permissions: Permission[]
}

export function PermissionCategory({ category, permissions }: PermissionCategoryProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground border-b pb-1">
        {category}
      </h4>
      <div className="space-y-2">
        {permissions.map((permission) => (
          <PermissionBadge 
            key={permission} 
            permission={permission} 
            variant="detailed"
            showDescription={true}
          />
        ))}
      </div>
    </div>
  )
}
