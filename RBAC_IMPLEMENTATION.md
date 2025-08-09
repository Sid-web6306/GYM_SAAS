# RBAC Implementation Guide

This document describes the Role-Based Access Control (RBAC) system implemented for the Gym SaaS application.

## Overview

The RBAC system provides granular access control with five predefined roles and 17 specific permissions. Each role has different levels of access to gym features and operations.

## Roles & Permissions

### Role Hierarchy (highest to lowest level)

1. **Owner (Level 100)** 👑
   - Full access to all gym features and settings
   - Can manage all other roles
   - Cannot be removed or demoted

2. **Manager (Level 75)** 👔
   - Manage members, staff, and day-to-day operations
   - View analytics and reports
   - Cannot manage billing or gym owners

3. **Personal Trainer (Level 60)** 💪
   - Access to assigned members and training features
   - Can log and view member activities
   - Limited member management

4. **Staff Member (Level 50)** 👷
   - Access to member management and basic features
   - Can add, view, and edit members
   - Cannot delete members or manage other staff

5. **Member (Level 25)** 👤
   - Limited access to personal information and activities
   - Can view own profile and activities
   - Cannot access gym management features

### Permissions by Category

#### Member Management
- `members.create` - Add new members
- `members.read` - View member list and details
- `members.update` - Edit member information
- `members.delete` - Remove members

#### Analytics & Reports
- `analytics.read` - Access gym analytics
- `analytics.export` - Export analytics data

#### Gym Settings
- `gym.read` - View gym information
- `gym.update` - Modify gym settings

#### Staff Management
- `staff.create` - Invite new staff members
- `staff.read` - View staff list and roles
- `staff.update` - Update staff roles
- `staff.delete` - Remove staff members

#### Financial
- `billing.read` - Access billing information
- `billing.update` - Update billing settings

#### Activities
- `activities.create` - Log member activities
- `activities.read` - View member activities
- `activities.update` - Modify activity records
- `activities.delete` - Remove activity records

#### Personal
- `profile.read` - View personal profile
- `profile.update` - Update personal profile

## Database Schema

### New Tables

1. **roles** - System roles (owner, manager, staff, trainer, member)
2. **permissions** - Granular permissions for actions
3. **role_permissions** - Maps roles to their permissions
4. **user_roles** - Assigns roles to users within specific gyms

### Updated Tables

- **profiles** - Added RBAC fields (default_role, custom_permissions, is_gym_owner)
- **gyms** - Added owner_id field

## Usage Examples

### Using React Hooks

```tsx
import { useRole, useCanAccess, useRBAC } from '@/hooks/use-rbac'

function MemberManagement() {
  const role = useRole()
  const canCreateMembers = useCanAccess('members.create')
  const canDeleteMembers = useCanAccess('members.delete')
  
  return (
    <div>
      <h2>Members ({role})</h2>
      {canCreateMembers && <button>Add Member</button>}
      {canDeleteMembers && <button>Delete</button>}
    </div>
  )
}
```

### Using Component Guards

```tsx
import { PermissionGuard, RoleGuard, ManagerOnly } from '@/components/rbac/rbac-guards'

function Dashboard() {
  return (
    <div>
      <PermissionGuard permission="members.read">
        <MembersList />
      </PermissionGuard>
      
      <RoleGuard role={['owner', 'manager']}>
        <StaffManagement />
      </RoleGuard>
      
      <ManagerOnly>
        <AnalyticsDashboard />
      </ManagerOnly>
    </div>
  )
}
```

### Using Server Actions

```tsx
import { requirePermission, assignUserRole } from '@/actions/rbac.actions'

// In a server action or API route
async function createMember(formData: FormData) {
  // Check permission
  const { success, error } = await requirePermission('members.create')
  if (!success) {
    return { success: false, error }
  }
  
  // Proceed with member creation
  // ...
}

// Assign role to user
async function assignRole(formData: FormData) {
  return await assignUserRole(formData)
}
```

### Using Utilities

```tsx
import { canAssignRole, getRoleDisplayName } from '@/lib/rbac-utils'

function RoleManager({ userRole, targetRole }) {
  const canAssign = canAssignRole(userRole, targetRole)
  const displayName = getRoleDisplayName(targetRole)
  
  return (
    <div>
      <span>{displayName}</span>
      {canAssign && <button>Assign Role</button>}
    </div>
  )
}
```

## Database Migration

Run the migration files in order:

1. `19_create_rbac_tables.sql` - Creates RBAC tables and seed data
2. `20_update_profiles_for_rbac.sql` - Updates profiles table with RBAC fields
3. `21_create_rbac_policies.sql` - Creates RLS policies and helper functions
4. `22_update_existing_policies_with_rbac.sql` - Updates existing policies to use RBAC

## Key Features

### Multi-Tenant Support
- Roles are scoped to specific gyms
- Users can have different roles in different gyms
- Gym isolation through RLS policies

### Role Hierarchy
- Users can only assign roles lower than their own
- Role levels determine access permissions
- Automatic role inheritance

### Custom Permissions
- Individual users can have custom permissions beyond their role
- Stored in profiles.custom_permissions JSONB field
- Merged with role-based permissions

### Security
- Row Level Security (RLS) policies on all tables
- Permission checks at database level
- Server-side validation for all role operations

### Performance
- Indexed foreign keys and commonly queried fields
- Database functions for complex permission checks
- Efficient query patterns in React hooks

## Best Practices

1. **Always check permissions** before showing UI elements or allowing actions
2. **Use the appropriate guard level**:
   - Use PermissionGuard for specific actions
   - Use RoleGuard for role-based features
   - Use MinimumRoleGuard for hierarchical access
3. **Handle loading states** in guards for better UX
4. **Provide meaningful fallbacks** for denied access
5. **Use server-side checks** as the final authority
6. **Test role transitions** thoroughly
7. **Document custom permissions** when added

## API Reference

### Hooks
- `useRBAC()` - Get full RBAC context
- `useRole()` - Get current user's role
- `usePermissions()` - Get user's permissions array
- `useCanAccess(permission)` - Check specific permission
- `useHasRole(role)` - Check specific role(s)
- `useHasMinimumRole(role)` - Check minimum role level

### Components
- `<PermissionGuard permission="..." />` - Guard by permission
- `<RoleGuard role="..." />` - Guard by role
- `<MinimumRoleGuard minimumRole="..." />` - Guard by minimum role
- `<OwnerOnly />`, `<ManagerOnly />`, etc. - Convenience guards

### Server Actions
- `assignUserRole(formData)` - Assign role to user
- `updateUserRole(formData)` - Update user's role
- `removeUserRole(formData)` - Remove user's role
- `checkUserPermission(userId, gymId, permission)` - Check permission
- `requirePermission(permission, gymId?)` - Require permission with error

### Utilities
- `canAssignRole(assignerRole, targetRole)` - Check if role can be assigned
- `getRoleDisplayName(role)` - Get friendly role name
- `hasPermission(permissions, permission)` - Check permission in array
- `createRBACContext(role, permissions)` - Create context object

This RBAC system provides comprehensive access control while maintaining flexibility and performance. The multi-layered approach (database, server, and client-side checks) ensures security while providing a smooth user experience.