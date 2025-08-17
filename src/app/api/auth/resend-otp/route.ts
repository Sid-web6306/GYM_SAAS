import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json()

    if (!email || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (type !== 'email') {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP type' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Resend OTP using Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false // Don't create user if they don't exist
      }
    })

    if (error) {
      logger.error('OTP resend failed:', { 
        email, 
        error: error.message,
        errorCode: error.status 
      })

      // Provide specific error messages
      let errorMessage = 'Failed to send verification code'
      
      if (error.message.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait before requesting another code.'
      } else if (error.message.includes('not found')) {
        errorMessage = 'Email address not found. Please check your email or sign up.'
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    logger.info('OTP resent successfully:', { email })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    })

  } catch (error) {
    logger.error('OTP resend API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
