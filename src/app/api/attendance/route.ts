import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// GET /api/attendance - Get attendance data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gym_id')
    const type = searchParams.get('type') || 'members' // 'members' or 'staff'
    const search = searchParams.get('search')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const summary = searchParams.get('summary') === 'true'

    if (!gymId) {
      return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 })
    }

    // Check permissions
    const permission = type === 'staff' ? 'staff.read' : 'members.read'
    const canView = await checkUserPermission(user.id, gymId, permission)
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (summary) {
      // Efficiently fetch counts of active sessions
      const [membersResult, staffResult] = await Promise.all([
        supabase
          .from('attendance_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('subject_type', 'member')
          .is('check_out_at', null),
        supabase
          .from('attendance_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('gym_id', gymId)
          .eq('subject_type', 'staff')
          .is('check_out_at', null)
      ])

      if (membersResult.error) logger.error('Error counting member attendance:', { error: membersResult.error.message })
      if (staffResult.error) logger.error('Error counting staff attendance:', { error: staffResult.error.message })

      return NextResponse.json({
        stats: {
          membersPresent: membersResult.count || 0,
          staffPresent: staffResult.count || 0,
          totalPresent: (membersResult.count || 0) + (staffResult.count || 0)
        }
      })
    }

    // Call the appropriate RPC function
    const rpcFunction = type === 'staff' ? 'get_staff_attendance' : 'get_member_attendance'
    
    const { data, error } = await supabase.rpc(rpcFunction, {
      p_gym_id: gymId,
      p_search: search ?? undefined,
      p_from: from ?? undefined,
      p_to: to ?? undefined,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      logger.error('Attendance query failed:', { error, type })
      return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 })
    }

    return NextResponse.json({ 
      attendance: data || [],
      pagination: {
        limit,
        offset,
        hasMore: (data?.length || 0) === limit
      }
    })

  } catch (error) {
    logger.error('Attendance GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
