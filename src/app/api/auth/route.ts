import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'verify-otp':
        return handleOtpVerification(data)
      case 'resend-otp':
        return handleOtpResend(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    logger.error('Auth API error:', {error})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleOtpVerification({ email, token }: { email: string, token: string }) {
  if (!email || !token) {
    return NextResponse.json({ error: 'Email and token required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    user: { id: data.user?.id, email: data.user?.email }
  })
}

async function handleOtpResend({ email, isLogin = false }: { email: string, isLogin?: boolean }) {
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = await createClient()
  
  // For passwordless login/signup, use signInWithOtp again to resend
  // The Supabase docs recommend: "Passwordless sign-ins can be resent by calling signInWithOtp() again"
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // If isLogin is true, don't create new user (login mode)
      // If isLogin is false, allow creating new user (signup mode)
      shouldCreateUser: !isLogin
    }
  })

  if (error) {
    logger.error('OTP resend error:', { error, email: email.substring(0, 3) + '***' })
    
    // Handle rate limiting
    if (error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('60 seconds')) {
      return NextResponse.json({ error: 'Please wait before requesting another code.' }, { status: 429 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
