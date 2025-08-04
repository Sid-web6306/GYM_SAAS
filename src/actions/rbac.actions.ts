'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { 
  GymRole, 
  Permission, 
  RoleAssignmentRequest,
  UserRole,
  Role,
  PermissionDefinition 
} from '@/types/rbac.types'

// ========== VALIDATION SCHEMAS ==========

const assignRoleSchema = z.object({
  user_email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid('Invalid gym ID'),
  expires_at: z.string().optional(),
  notify_user: z.boolean().default(true)
})

const updateRoleSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid('Invalid gym ID'),
  custom_permissions: z.record(z.boolean()).optional(),
  expires_at: z.string().optional()
})

const removeRoleSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  gym_id: z.string().uuid('Invalid gym ID')
})

// ========== PERMISSION CHECKING UTILITIES ==========

export async function checkUserPermission(
  user_id: string,
  gym_id: string,
  permission: Permission
): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('has_permission', {
      user_uuid: user_id,
      gym_uuid: gym_id,
      permission_name: permission
    })

    if (error) {
      console.error('Error checking permission:', error)
      return false
    }

    return data || false
  } catch (error) {
    console.error('Error in checkUserPermission:', error)
    return false
  }
}

export async function getUserRole(
  user_id: string,
  gym_id: string
): Promise<GymRole | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_user_role', {
      user_uuid: user_id,
      gym_uuid: gym_id
    })

    if (error) {
      console.error('Error getting user role:', error)
      return null
    }

    return (data as GymRole) || null
  } catch (error) {
    console.error('Error in getUserRole:', error)
    return null
  }
}

export async function getUserPermissions(
  user_id: string,
  gym_id: string
): Promise<Permission[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_user_permissions', {
      user_uuid: user_id,
      gym_uuid: gym_id
    })

    if (error) {
      console.error('Error getting user permissions:', error)
      return []
    }

    return (data as Permission[]) || []
  } catch (error) {
    console.error('Error in getUserPermissions:', error)
    return []
  }
}

// ========== ROLE MANAGEMENT ACTIONS ==========

// Core role assignment function that accepts RoleAssignmentRequest
export async function assignRoleToUser(request: RoleAssignmentRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate request - either user_id or user_email must be provided
    if (!request.user_id && !request.user_email) {
      return { success: false, error: 'Either user_id or user_email must be provided' }
    }

    // Check if assigner has permission to assign roles
    const canAssignRoles = await checkUserPermission(user.id, request.gym_id, 'staff.create')
    if (!canAssignRoles) {
      return { success: false, error: 'Insufficient permissions to assign roles' }
    }

    let targetUserId = request.user_id

    // If email provided, get user ID
    if (request.user_email && !targetUserId) {
      const { data: targetUser, error: userError } = await supabase.rpc('get_user_id_by_email', {
        p_email: request.user_email
      })

      if (userError || !targetUser) {
        return { success: false, error: 'User not found with that email address' }
      }
      targetUserId = targetUser
    }

    if (!targetUserId) {
      return { success: false, error: 'Unable to identify target user' }
    }

    // Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id, level')
      .eq('name', request.role)
      .single()

    if (roleError || !roleData) {
      return { success: false, error: 'Invalid role specified' }
    }

    // Check if assigner can assign this role level
    const assignerRole = await getUserRole(user.id, request.gym_id)
    if (!assignerRole) {
      return { success: false, error: 'No role assigned to assigner' }
    }
    
    const { data: assignerRoleData } = await supabase
      .from('roles')
      .select('level')
      .eq('name', assignerRole)
      .single()

    const assignerLevel = assignerRoleData?.level || 0
    if (assignerLevel <= roleData.level) {
      return { success: false, error: 'Cannot assign roles equal to or higher than your own' }
    }

    // Assign the role
    const { error: assignError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: targetUserId,
        role_id: roleData.id,
        gym_id: request.gym_id,
        assigned_by: user.id,
        expires_at: request.expires_at || null,
        is_active: true
      }, {
        onConflict: 'user_id,gym_id'
      })

    if (assignError) {
      console.error('Error assigning role:', assignError)
      return { success: false, error: 'Failed to assign role' }
    }

    // Update user's profile if needed
    await supabase
      .from('profiles')
      .update({ 
        default_role: request.role,
        last_role_sync: new Date().toISOString()
      })
      .eq('id', targetUserId)

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    const userIdentifier = request.user_email || targetUserId
    return { 
      success: true, 
      message: `Successfully assigned ${request.role} role to ${userIdentifier}` 
    }

  } catch (error) {
    console.error('Error in assignRoleToUser:', error)
    return { success: false, error: 'Failed to assign role' }
  }
}

// FormData wrapper for backward compatibility
export async function assignUserRole(formData: FormData) {
  try {
    // Validate form data
    const validatedData = assignRoleSchema.parse({
      user_email: formData.get('user_email'),
      role: formData.get('role'),
      gym_id: formData.get('gym_id'),
      expires_at: formData.get('expires_at') || undefined,
      notify_user: formData.get('notify_user') === 'true'
    })

    // Convert to RoleAssignmentRequest and call core function
    const request: RoleAssignmentRequest = {
      user_email: validatedData.user_email,
      role: validatedData.role,
      gym_id: validatedData.gym_id,
      expires_at: validatedData.expires_at || undefined,
      notify_user: validatedData.notify_user
    }

    return await assignRoleToUser(request)

  } catch (error) {
    console.error('Error in assignUserRole:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to assign role' }
  }
}

export async function updateUserRole(formData: FormData) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate form data
    const validatedData = updateRoleSchema.parse({
      user_id: formData.get('user_id'),
      role: formData.get('role'),
      gym_id: formData.get('gym_id'),
      custom_permissions: JSON.parse(formData.get('custom_permissions') as string || '{}'),
      expires_at: formData.get('expires_at') || undefined
    })

    // Check permissions
    const canManageStaff = await checkUserPermission(user.id, validatedData.gym_id, 'staff.update')
    if (!canManageStaff) {
      return { success: false, error: 'Insufficient permissions to update roles' }
    }

    // Get role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', validatedData.role)
      .single()

    if (roleError || !roleData) {
      return { success: false, error: 'Invalid role specified' }
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({
        role_id: roleData.id,
        expires_at: validatedData.expires_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', validatedData.user_id)
      .eq('gym_id', validatedData.gym_id)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return { success: false, error: 'Failed to update role' }
    }

    // Update profile with custom permissions
    if (validatedData.custom_permissions) {
      await supabase
        .from('profiles')
        .update({
          default_role: validatedData.role,
          custom_permissions: validatedData.custom_permissions,
          last_role_sync: new Date().toISOString()
        })
        .eq('id', validatedData.user_id)
    }

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, message: 'Role updated successfully' }

  } catch (error) {
    console.error('Error in updateUserRole:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to update role' }
  }
}

export async function removeUserRole(formData: FormData) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate form data
    const validatedData = removeRoleSchema.parse({
      user_id: formData.get('user_id'),
      gym_id: formData.get('gym_id')
    })

    // Check permissions
    const canManageStaff = await checkUserPermission(user.id, validatedData.gym_id, 'staff.delete')
    if (!canManageStaff) {
      return { success: false, error: 'Insufficient permissions to remove roles' }
    }

    // Cannot remove owner role
    const targetRole = await getUserRole(validatedData.user_id, validatedData.gym_id)
    if (targetRole === 'owner') {
      return { success: false, error: 'Cannot remove owner role' }
    }

    // Deactivate user role
    const { error: removeError } = await supabase
      .from('user_roles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', validatedData.user_id)
      .eq('gym_id', validatedData.gym_id)

    if (removeError) {
      console.error('Error removing role:', removeError)
      return { success: false, error: 'Failed to remove role' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/settings')

    return { success: true, message: 'Role removed successfully' }

  } catch (error) {
    console.error('Error in removeUserRole:', error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to remove role' }
  }
}

// ========== DATA FETCHING ACTIONS ==========

export async function getGymRoles(gym_id: string): Promise<UserRole[]> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return []
    }

    // Check if user has access to this gym
    const hasAccess = await checkUserPermission(user.id, gym_id, 'staff.read')
    if (!hasAccess) {
      return []
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        role:roles(*),
        gym:gyms(id, name)
      `)
      .eq('gym_id', gym_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching gym roles:', error)
      return []
    }

    return data as UserRole[]
  } catch (error) {
    console.error('Error in getGymRoles:', error)
    return []
  }
}

export async function getAllRoles(): Promise<Role[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('level', { ascending: false })

    if (error) {
      console.error('Error fetching roles:', error)
      return []
    }

    return data as Role[]
  } catch (error) {
    console.error('Error in getAllRoles:', error)
    return []
  }
}

export async function getAllPermissions(): Promise<PermissionDefinition[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    if (error) {
      console.error('Error fetching permissions:', error)
      return []
    }

    return data as PermissionDefinition[]
  } catch (error) {
    console.error('Error in getAllPermissions:', error)
    return []
  }
}

// ========== RBAC GUARD UTILITIES ==========

export async function requirePermission(
  permission: Permission,
  gym_id?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get user's gym_id if not provided
    let targetGymId = gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id || ''
    }

    if (!targetGymId) {
      return { success: false, error: 'No gym association found' }
    }

    const hasPermission = await checkUserPermission(user.id, targetGymId, permission)
    if (!hasPermission) {
      return { success: false, error: 'Insufficient permissions' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in requirePermission:', error)
    return { success: false, error: 'Permission check failed' }
  }
}

export async function requireRole(
  role: GymRole | GymRole[],
  gym_id?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Get user's gym_id if not provided
    let targetGymId = gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id || ''
    }

    if (!targetGymId) {
      return { success: false, error: 'No gym association found' }
    }

    const userRole = await getUserRole(user.id, targetGymId)
    if (!userRole) {
      return { success: false, error: 'No role assigned' }
    }

    const requiredRoles = Array.isArray(role) ? role : [role]
    if (!requiredRoles.includes(userRole)) {
      return { success: false, error: 'Insufficient role level' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in requireRole:', error)
    return { success: false, error: 'Role check failed' }
  }
}