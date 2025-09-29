import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Request validation schema
const checkoutSchema = z.object({
  checkout_at: z.string().optional() // Optional custom checkout time
})

// POST /api/staff/checkout - End attendance session for staff
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const validatedData = checkoutSchema.parse(body)

    logger.info('Staff check-out request', { 
      userId: user.id,
      customCheckoutTime: validatedData.checkout_at 
    })

    // Find the open session for this staff member
    const { data: openSession, error: findError } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('subject_type', 'staff')
      .eq('staff_user_id', user.id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !openSession) {
      return NextResponse.json({ 
        error: 'No open attendance session found' 
      }, { status: 404 })
    }

    // Call the end_attendance_session function
    const { data: session, error: checkoutError } = await supabase
      .rpc('end_attendance_session', {
        p_session_id: openSession.id,
        p_checkout_at: validatedData.checkout_at ? validatedData.checkout_at : undefined
      })

    if (checkoutError) {
      logger.error('Staff check-out error:', { checkoutError })
      return NextResponse.json({ 
        error: 'Failed to check out' 
      }, { status: 500 })
    }

    // Return session data
    return NextResponse.json({
      success: true,
      session: session,
      message: 'Successfully checked out'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }

    logger.error('Error in /api/staff/checkout:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
