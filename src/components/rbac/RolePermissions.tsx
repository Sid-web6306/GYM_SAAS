'use client'

import { ROLE_PERMISSIONS } from '@/lib/constants/rbac'
import { PermissionBadge, PermissionCategory, PermissionGroup } from './PermissionBadge'
import type { GymRole } from '@/types/rbac.types'

interface RolePermissionsProps {
  role: GymRole
  variant?: 'grouped' | 'categorized' | 'compact'
  showTitle?: boolean
}

export function RolePermissions({ 
  role, 
  variant = 'grouped',
  showTitle = true
}: RolePermissionsProps) {
  const permissions = ROLE_PERMISSIONS[role]
  
  if (variant === 'categorized') {
    // Group permissions by category
    const permissionsByCategory = permissions.reduce((acc, permission) => {
      const label = getPermissionLabel(permission)
      const category = label.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    }, {} as Record<string, typeof permissions>)
    
    return (
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold capitalize">{role} Permissions</h3>
        )}
        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
          <PermissionCategory 
            key={category} 
            category={category} 
            permissions={categoryPermissions} 
          />
        ))}
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        {showTitle && (
          <h3 className="text-lg font-semibold capitalize">{role} Permissions</h3>
        )}
        <PermissionGroup permissions={permissions} maxVisible={5} />
      </div>
    )
  }
  
  // Default grouped variant
  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-lg font-semibold capitalize">{role} Permissions</h3>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {permissions.map((permission) => (
          <div key={permission} className="p-3 rounded-lg border bg-card">
            <PermissionBadge 
              permission={permission} 
              showDescription={true}
              variant="detailed"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper function to get permission label (imported from lib/permission-labels)
function getPermissionLabel(permission: string) {
  // This would be imported from '@/lib/permission-labels'
  // For now, returning a placeholder
  return {
    title: permission,
    description: '',
    category: 'General',
    color: 'bg-gray-100 text-gray-800',
    icon: null
  }
}
