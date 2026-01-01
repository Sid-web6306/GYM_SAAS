import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { 
  assignRoleToUser,
  deleteUserFromGym,
  reactivateUser,
  getGymRoles,
  getInactiveGymRoles,
  getAllRoles,
  getAllPermissions,
  checkUserPermission,
  getUserRole,
  getUserPermissions
} from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'
import type { Permission, RoleAssignmentRequest } from '@/types/rbac.types'
import { ROLE_LEVELS } from '@/types/rbac.types'

// Validation schemas
const assignRoleSchema = z.object({
  user_id: z.string().uuid().optional(),
  user_email: z.string().email().optional(),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid(),
  expires_at: z.string().optional(),
  notify_user: z.boolean().default(true)
})

const deleteUserSchema = z.object({
  user_id: z.string().uuid(),
  gym_id: z.string().uuid()
})

const reactivateUserSchema = z.object({
  user_id: z.string().uuid(),
  gym_id: z.string().uuid()
})

// GET /api/rbac - Get RBAC data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const gym_id = searchParams.get('gym_id')
    const user_id = searchParams.get('user_id')
    const permission = searchParams.get('permission')
    const include_inactive = searchParams.get('include_inactive') === 'true'

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'gym-roles':
        if (!gym_id) {
          return NextResponse.json({ error: 'gym_id is required' }, { status: 400 })
        }
        const roles = include_inactive 
          ? await getInactiveGymRoles(gym_id)
          : await getGymRoles(gym_id)
        return NextResponse.json({ roles })

      case 'all-roles':
        const allRoles = await getAllRoles()
        return NextResponse.json({ roles: allRoles })

      case 'all-permissions':
        const allPermissions = await getAllPermissions()
        return NextResponse.json({ permissions: allPermissions })

      case 'user-role':
        if (!user_id || !gym_id) {
          return NextResponse.json({ error: 'user_id and gym_id are required' }, { status: 400 })
        }
        const role = await getUserRole(user_id, gym_id)
        return NextResponse.json({ role })

      case 'user-permissions':
        if (!user_id || !gym_id) {
          return NextResponse.json({ error: 'user_id and gym_id are required' }, { status: 400 })
        }
        
        const [userRole, userPermissions] = await Promise.all([
          getUserRole(user_id, gym_id),
          getUserPermissions(user_id, gym_id)
        ])

        // Determine role level
        // We need to import ROLE_LEVELS or map it locally if import fails
        const roleLevel = userRole && userRole in ROLE_LEVELS ? ROLE_LEVELS[userRole] : 0

        const userPermissionsObj = {
          gym_id,
          role: userRole || 'member',
          role_level: roleLevel,
          permissions: userPermissions,
          custom_permissions: {}
        }
        
        return NextResponse.json({ permissions: userPermissionsObj })

      case 'check-permission':
        if (!gym_id || !permission) {
          return NextResponse.json({ error: 'gym_id and permission are required' }, { status: 400 })
        }
        const hasPermission = await checkUserPermission(user.id, gym_id, permission as Permission)
        return NextResponse.json({ hasPermission })

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 })
    }
  } catch (error) {
    logger.error('RBAC GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/rbac - Create/assign role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = assignRoleSchema.parse(body)
    
    // Ensure either user_id or user_email is provided
    if (!validatedData.user_id && !validatedData.user_email) {
      return NextResponse.json({ 
        error: 'Either user_id or user_email must be provided' 
      }, { status: 400 })
    }

    // Convert to RoleAssignmentRequest
    const requestData: RoleAssignmentRequest = {
      role: validatedData.role,
      gym_id: validatedData.gym_id,
      expires_at: validatedData.expires_at,
      notify_user: validatedData.notify_user,
      ...(validatedData.user_id && { user_id: validatedData.user_id }),
      ...(validatedData.user_email && { user_email: validatedData.user_email })
    }

    const result = await assignRoleToUser(requestData)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to assign role' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    }, { status: 201 })

  } catch (error) {
    logger.error('RBAC POST error:', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/rbac - Remove user from gym
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const gym_id = searchParams.get('gym_id')

    if (!user_id || !gym_id) {
      return NextResponse.json({ 
        error: 'user_id and gym_id are required' 
      }, { status: 400 })
    }

    // Validate
    const validatedData = deleteUserSchema.parse({ user_id, gym_id })

    const result = await deleteUserFromGym(validatedData.user_id, validatedData.gym_id)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to remove user' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    logger.error('RBAC DELETE error:', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/rbac - Reactivate user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = reactivateUserSchema.parse(body)

    const result = await reactivateUser(validatedData.user_id, validatedData.gym_id)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to reactivate user' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.message
    })

  } catch (error) {
    logger.error('RBAC PUT error:', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

