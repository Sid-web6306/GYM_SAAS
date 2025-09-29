import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/staff/status - Get current staff check-in status
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    logger.info('Staff status request', { userId: user.id })

    // Find the open session for this staff member (same logic as checkout)
    const { data: openSession, error: findError } = await supabase
      .from('attendance_sessions')
      .select('id, check_in_at')
      .eq('subject_type', 'staff')
      .eq('staff_user_id', user.id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (findError) {
      logger.error('Staff status error:', { findError })
      return NextResponse.json({ 
        error: 'Failed to get staff status' 
      }, { status: 500 })
    }

    // Calculate status
    const isCheckedIn = !!openSession
    const checkInAt = openSession?.check_in_at || null
    const totalSeconds = checkInAt ? Math.floor((Date.now() - new Date(checkInAt).getTime()) / 1000) : null

    // Return status data
    return NextResponse.json({
      success: true,
      status: {
        is_checked_in: isCheckedIn,
        session_id: openSession?.id || null,
        check_in_at: checkInAt,
        total_seconds: totalSeconds
      }
    })

  } catch (error) {
    logger.error('Error in /api/staff/status:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
