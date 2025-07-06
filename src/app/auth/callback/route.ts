// src/app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const cookieStore = await cookies() 
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) { console.error('Error setting cookie:', error) }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) { console.error('Error removing cookie:', error) }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Enhanced onboarding gatekeeper
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Auth callback: User session', { 
        userEmail: user?.email,
        userId: user?.id,
        emailConfirmed: user?.email_confirmed_at 
      })
      
      if (user) {
        // Add a small delay to allow for database updates to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if user has completed onboarding
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .single()

        console.log('Auth callback: Profile check', { 
          profile, 
          profileError, 
          hasGym: !!profile?.gym_id 
        })

        if (!profileError && profile?.gym_id) {
          // User has completed onboarding, redirect to dashboard
          console.log('Auth callback: User has gym, redirecting to dashboard')
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // User needs to complete onboarding
          // For social users, redirect to signup page with social=true
          console.log('Auth callback: User needs onboarding, redirecting to social signup')
          return NextResponse.redirect(`${origin}/signup?social=true`)
        }
      } else {
        // Fallback to social signup
        console.log('Auth callback: No user, redirecting to social signup')
        return NextResponse.redirect(`${origin}/signup?social=true`)
      }
    }
  }

  console.error('Error in auth callback:', 'Could not exchange code for session.');
  // Redirect to login with auth message
  return NextResponse.redirect(`${origin}/login?message=social-auth-error`)
}
