import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// Helper to get user's gym_id
async function getUserGymId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gym_id')
    .eq('id', userId)
    .single()
  
  return profile?.gym_id || null
}

// GET /api/staff - List staff members for a gym
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gym_id')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve gym ID
    let targetGymId = gymId
    if (!targetGymId) {
      targetGymId = await getUserGymId(supabase, user.id)
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, targetGymId, 'staff.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Build query for profiles who have roles in this gym (staff members)
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        default_role,
        created_at,
        user_roles!inner(
          gym_id,
          is_active,
          role_id,
          roles(name, display_name)
        )
      `, { count: 'exact' })
      .eq('user_roles.gym_id', targetGymId)
      .eq('user_roles.is_active', true)
      .order('full_name', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply role filter
    if (role) {
      query = query.eq('user_roles.roles.name', role)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error('Staff query failed:', { error })
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    // Transform data to flatten the role information
    const staff = (data || []).map(profile => ({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      default_role: profile.default_role || null,
      created_at: profile.created_at,
    }))

    return NextResponse.json({
      staff,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Staff GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
