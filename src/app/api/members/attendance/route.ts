import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/members/attendance - Get member's own attendance history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    // Validate and parse parameters
    const from = fromParam ? new Date(fromParam).toISOString() : null
    const to = toParam ? new Date(toParam).toISOString() : null
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50 // Max 100 records
    const offset = offsetParam ? parseInt(offsetParam) : 0

    logger.info('Member attendance history request', { 
      userId: user.id,
      from,
      to,
      limit,
      offset
    })

    // Call the get_my_member_attendance RPC function
    const { data: attendanceHistory, error: attendanceError } = await supabase
      .rpc('get_my_member_attendance', {
        p_from: from,
        p_to: to,
        p_limit: limit,
        p_offset: offset
      })

    if (attendanceError) {
      logger.error('Member attendance history error:', { attendanceError })
      return NextResponse.json({ 
        error: 'Failed to fetch attendance history' 
      }, { status: 500 })
    }

    // Get current status as well
    const { data: currentStatus, error: statusError } = await supabase
      .rpc('get_member_current_status')

    if (statusError) {
      logger.error('Member current status error:', { statusError })
      // Don't fail the request, just log the error
    }

    // Return attendance data
    return NextResponse.json({
      success: true,
      attendance: attendanceHistory || [],
      current_status: currentStatus?.[0] || {
        is_checked_in: false,
        session_id: null,
        check_in_at: null,
        total_seconds: null
      },
      pagination: {
        limit,
        offset,
        has_more: (attendanceHistory?.length || 0) >= limit
      }
    })

  } catch (error) {
    logger.error('Error in /api/members/attendance:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
