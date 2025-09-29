import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Request validation schema
const checkinSchema = z.object({
  method: z.string().default('portal'),
  notes: z.string().optional()
})

// POST /api/staff/checkin - Start attendance session for staff
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
    const validatedData = checkinSchema.parse(body)

    logger.info('Staff check-in request', { 
      userId: user.id, 
      method: validatedData.method 
    })

    // Call the start_attendance_session function for staff
    const { data: session, error: checkinError } = await supabase
      .rpc('start_attendance_session', {
        p_subject_type: 'staff',
        p_member_id: undefined,
        p_staff_user_id: user.id,
        p_method: validatedData.method,
        p_notes: validatedData.notes
      })

    if (checkinError) {
      logger.error('Staff check-in error:', { checkinError })
      
      if (checkinError.message?.includes('No staff record found')) {
        return NextResponse.json({ 
          error: 'No staff record found for authenticated user' 
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to check in' 
      }, { status: 500 })
    }

    // Return session data
    return NextResponse.json({
      success: true,
      session: session,
      message: 'Successfully checked in'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.errors 
      }, { status: 400 })
    }

    logger.error('Error in /api/staff/checkin:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
