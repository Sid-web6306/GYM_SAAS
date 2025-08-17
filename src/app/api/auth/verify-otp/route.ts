import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, token, type = 'email' } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { success: false, error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ✅ Use Supabase's built-in OTP verification (handles both signup and login)
    // The database trigger will automatically create the profile for new users
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
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
      userId: data.user.id,
      emailConfirmed: !!data.user.email_confirmed_at,
      createdAt: data.user.created_at,
      confirmedAt: data.user.email_confirmed_at
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
    logger.error('OTP verification API error:', { error })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


