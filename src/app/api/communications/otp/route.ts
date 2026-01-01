import { NextResponse } from 'next/server'
// import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, phone, userId } = body

    if (!action || !phone) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Placeholder implementation. Integrate MSG91 or chosen OTP provider server-side.
    // For now, just return success for send action and validate for verify action in future.
    if (action === 'send') {
      // TODO: send OTP via server provider
      return NextResponse.json({ success: true })
    }

    if (action === 'verify') {
      // TODO: verify OTP and update profile.phone_verified
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    //   const supabase = await createClient()
    //   await supabase.from('profiles').update({ phone_verified: true, phone_verified_at: new Date().toISOString() }).eq('id', userId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


