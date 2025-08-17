import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, token, type } = await request.json()

    if (!email || !token || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (type !== 'email') {
      return NextResponse.json(
        { success: false, error: 'Invalid verification type' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the OTP using Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error) {
      logger.error('OTP verification failed:', { 
        email, 
        error: error.message,
        errorCode: error.status 
      })

      // Provide specific error messages
      let errorMessage = 'Invalid verification code'
      
      if (error.message.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.'
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Invalid verification code. Please check and try again.'
      } else if (error.message.includes('too many')) {
        errorMessage = 'Too many attempts. Please wait before trying again.'
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Verification failed' },
        { status: 400 }
      )
    }

    logger.info('OTP verification successful:', { 
      email,
      userId: data.user.id 
    })

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at
      }
    })

  } catch (error) {
    logger.error('OTP verification API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
