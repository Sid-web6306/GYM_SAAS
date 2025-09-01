import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/members/status - Get member's current check-in status
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    logger.info('Member status request', { userId: user.id })

    // Call the get_member_current_status RPC function
    const { data: statusData, error: statusError } = await supabase
      .rpc('get_member_current_status')

    if (statusError) {
      logger.error('Member status error:', {statusError})
      return NextResponse.json({ 
        error: 'Failed to fetch member status' 
      }, { status: 500 })
    }

    // Return current status
    const currentStatus = statusData?.[0] || {
      is_checked_in: false,
      session_id: null,
      check_in_at: null,
      total_seconds: null
    }

    return NextResponse.json({
      success: true,
      status: currentStatus
    })

  } catch (error) {
    logger.error('Error in /api/members/status:', {error})
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
