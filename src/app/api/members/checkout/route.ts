import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Request validation schema
const checkoutSchema = z.object({
  checkout_at: z.string().optional() // Optional custom checkout time
})

// POST /api/members/checkout - End attendance session for member
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

    logger.info('Member check-out request', { 
      userId: user.id,
      customCheckoutTime: validatedData.checkout_at 
    })

    // Call the member_check_out RPC function
    const { data: session, error: checkoutError } = await supabase
      .rpc('member_check_out', {
        p_checkout_at: validatedData.checkout_at ? validatedData.checkout_at : undefined
      })

    if (checkoutError) {
      logger.error('Member check-out error:', { checkoutError })
      
      if (checkoutError.message?.includes('No member record found')) {
        return NextResponse.json({ 
          error: 'No member record found for authenticated user' 
        }, { status: 404 })
      }
      
      if (checkoutError.message?.includes('No open attendance session')) {
        return NextResponse.json({ 
          error: 'No open attendance session found' 
        }, { status: 404 })
      }
      
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

    logger.error('Error in /api/members/checkout:', { error })
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
