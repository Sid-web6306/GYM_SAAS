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

    // Get current status using the get_member_current_status function (works for staff too)
    const { data: status, error: statusError } = await supabase
      .rpc('get_member_current_status')

    if (statusError) {
      logger.error('Staff status error:', { statusError })
      return NextResponse.json({ 
        error: 'Failed to get staff status' 
      }, { status: 500 })
    }

    // Return status data
    return NextResponse.json({
      success: true,
      status: status?.[0] || {
        is_checked_in: false,
        session_id: null,
        check_in_at: null,
        total_seconds: null
      }
    })

  } catch (error) {
    logger.error('Error in /api/staff/status:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
