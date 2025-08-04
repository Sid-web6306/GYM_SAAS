import React from 'react'
import { useRBAC, useCanAccess, useHasRole, useHasMinimumRole } from '@/hooks/use-rbac'
import type { GymRole, Permission } from '@/types/rbac.types'

// ========== COMPONENT PROPS ==========

interface RBACGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  loading?: React.ReactNode
}

interface PermissionGuardProps extends RBACGuardProps {
  permission: Permission
}

interface RoleGuardProps extends RBACGuardProps {
  role: GymRole | GymRole[]
}

interface MinimumRoleGuardProps extends RBACGuardProps {
  minimumRole: GymRole
}

interface ConditionalRenderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

// ========== LOADING COMPONENT ==========

const DefaultLoading: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
  </div>
)

// ========== MAIN RBAC GUARD COMPONENTS ==========

/**
 * Guards content based on specific permission
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback = null,
  loading = <DefaultLoading />
}) => {
  const rbac = useRBAC()
  const canAccess = useCanAccess(permission)

  if (!rbac) {
    return <>{loading}</>
  }

  if (!canAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Guards content based on specific role(s)
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  role,
  fallback = null,
  loading = <DefaultLoading />
}) => {
  const rbac = useRBAC()
  const hasRole = useHasRole(role)

  if (!rbac) {
    return <>{loading}</>
  }

  if (!hasRole) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Guards content based on minimum role level
 */
export const MinimumRoleGuard: React.FC<MinimumRoleGuardProps> = ({
  children,
  minimumRole,
  fallback = null,
  loading = <DefaultLoading />
}) => {
  const rbac = useRBAC()
  const hasMinimumRole = useHasMinimumRole(minimumRole)

  if (!rbac) {
    return <>{loading}</>
  }

  if (!hasMinimumRole) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Advanced RBAC guard with multiple conditions
 */
export const RBACGuard: React.FC<{
  children: React.ReactNode
  permission?: Permission
  role?: GymRole | GymRole[]
  minimumRole?: GymRole
  requireAll?: boolean // If true, all conditions must be met (AND). If false, any condition can be met (OR)
  fallback?: React.ReactNode
  loading?: React.ReactNode
}> = ({
  children,
  permission,
  role,
  minimumRole,
  requireAll = true,
  fallback = null,
  loading = <DefaultLoading />
}) => {
  const rbac = useRBAC()
  const canAccess = useCanAccess(permission!)
  const hasRole = useHasRole(role!)
  const hasMinimumRole = useHasMinimumRole(minimumRole!)

  if (!rbac) {
    return <>{loading}</>
  }

  const conditions: boolean[] = []
  
  if (permission) conditions.push(canAccess)
  if (role) conditions.push(hasRole)
  if (minimumRole) conditions.push(hasMinimumRole)

  if (conditions.length === 0) {
    // No conditions specified, allow access
    return <>{children}</>
  }

  const hasAccess = requireAll 
    ? conditions.every(condition => condition)
    : conditions.some(condition => condition)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ========== CONDITIONAL RENDER COMPONENTS ==========

/**
 * Shows content only for owners
 */
export const OwnerOnly: React.FC<ConditionalRenderProps> = ({ children, fallback }) => (
  <RoleGuard role="owner" fallback={fallback}>
    {children}
  </RoleGuard>
)

/**
 * Shows content only for managers and above
 */
export const ManagerOnly: React.FC<ConditionalRenderProps> = ({ children, fallback }) => (
  <MinimumRoleGuard minimumRole="manager" fallback={fallback}>
    {children}
  </MinimumRoleGuard>
)

/**
 * Shows content only for staff and above
 */
export const StaffOnly: React.FC<ConditionalRenderProps> = ({ children, fallback }) => (
  <MinimumRoleGuard minimumRole="staff" fallback={fallback}>
    {children}
  </MinimumRoleGuard>
)

/**
 * Shows content for trainers and above
 */
export const TrainerOnly: React.FC<ConditionalRenderProps> = ({ children, fallback }) => (
  <MinimumRoleGuard minimumRole="trainer" fallback={fallback}>
    {children}
  </MinimumRoleGuard>
)

/**
 * Shows content for authenticated users with any role
 */
export const AuthenticatedOnly: React.FC<ConditionalRenderProps> = ({ children, fallback }) => (
  <MinimumRoleGuard minimumRole="member" fallback={fallback}>
    {children}
  </MinimumRoleGuard>
)

// ========== FEATURE-SPECIFIC GUARDS ==========

/**
 * Guards member management features
 */
export const MemberManagementGuard: React.FC<{
  action: 'create' | 'read' | 'update' | 'delete'
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ action, children, fallback }) => (
  <PermissionGuard permission={`members.${action}` as Permission} fallback={fallback}>
    {children}
  </PermissionGuard>
)

/**
 * Guards analytics features
 */
export const AnalyticsGuard: React.FC<{
  action?: 'read' | 'export'
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ action = 'read', children, fallback }) => (
  <PermissionGuard permission={`analytics.${action}` as Permission} fallback={fallback}>
    {children}
  </PermissionGuard>
)

/**
 * Guards staff management features
 */
export const StaffManagementGuard: React.FC<{
  action: 'create' | 'read' | 'update' | 'delete'
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ action, children, fallback }) => (
  <PermissionGuard permission={`staff.${action}` as Permission} fallback={fallback}>
    {children}
  </PermissionGuard>
)

/**
 * Guards billing features
 */
export const BillingGuard: React.FC<{
  action?: 'read' | 'update'
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ action = 'read', children, fallback }) => (
  <PermissionGuard permission={`billing.${action}` as Permission} fallback={fallback}>
    {children}
  </PermissionGuard>
)

/**
 * Guards gym settings
 */
export const GymSettingsGuard: React.FC<{
  action?: 'read' | 'update'
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ action = 'read', children, fallback }) => (
  <PermissionGuard permission={`gym.${action}` as Permission} fallback={fallback}>
    {children}
  </PermissionGuard>
)

// ========== ACCESS DENIED COMPONENT ==========

export const AccessDenied: React.FC<{
  message?: string
  showRetry?: boolean
  onRetry?: () => void
}> = ({ 
  message = "You don't have permission to access this feature.", 
  showRetry = false,
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="mb-4">
      <svg
        className="w-16 h-16 text-gray-400 mx-auto"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m0 0v2m0-2h2m-2 0H8m13-9a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
    <p className="text-gray-600 mb-4 max-w-md">{message}</p>
    {showRetry && onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
)

// ========== HIGHER-ORDER COMPONENT ==========

/**
 * HOC for protecting entire components with RBAC
 */
export function withRBACGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  guardConfig: {
    permission?: Permission
    role?: GymRole | GymRole[]
    minimumRole?: GymRole
    requireAll?: boolean
    fallback?: React.ComponentType
  }
) {
  const GuardedComponent: React.FC<P> = (props) => {
    const FallbackComponent = guardConfig.fallback || (() => <AccessDenied />)

    return (
      <RBACGuard
        permission={guardConfig.permission}
        role={guardConfig.role}
        minimumRole={guardConfig.minimumRole}
        requireAll={guardConfig.requireAll}
        fallback={<FallbackComponent />}
      >
        <WrappedComponent {...props} />
      </RBACGuard>
    )
  }

  GuardedComponent.displayName = `withRBACGuard(${WrappedComponent.displayName || WrappedComponent.name})`

  return GuardedComponent
}