// src/app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  console.log('Auth callback received:', { code: !!code, error, errorDescription })
  
  // Handle OAuth errors
  if (error) {
    console.error('OAuth error in callback:', { error, errorDescription })
    
    // Map OAuth errors to user-friendly messages
    if (error === 'access_denied') {
      return NextResponse.redirect(`${origin}/login?message=social-auth-cancelled`)
    } else if (error === 'invalid_request') {
      return NextResponse.redirect(`${origin}/login?message=social-auth-invalid`)
    } else {
      return NextResponse.redirect(`${origin}/login?message=social-auth-error&details=${encodeURIComponent(errorDescription || error)}`)
    }
  }
  
  if (!code) {
    console.error('Auth callback: No authorization code received')
    return NextResponse.redirect(`${origin}/login?message=social-auth-error`)
  }
  
  try {
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
            } catch (error) { 
              console.error('Error setting cookie:', error) 
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) { 
              console.error('Error removing cookie:', error) 
            }
          },
        },
      }
    )

    console.log('Exchanging code for session...')
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(`${origin}/login?message=social-auth-error&details=${encodeURIComponent(sessionError.message)}`)
    }
    
    if (!data.session || !data.user) {
      console.error('Auth callback: No session or user data received')
      return NextResponse.redirect(`${origin}/login?message=social-auth-error`)
    }

    const { user } = data
    console.log('Auth callback: Session established', { 
      userEmail: user.email,
      userId: user.id,
      emailConfirmed: user.email_confirmed_at,
      provider: user.app_metadata?.provider,
      lastSignIn: user.last_sign_in_at
    })
    
    // Extract social provider information
    const provider = user.app_metadata?.provider
    const isNewUser = !user.last_sign_in_at || user.created_at === user.last_sign_in_at
    const socialProfileData = extractSocialProfileData(user)
    
    console.log('Social profile data extracted:', {
      provider,
      isNewUser,
      profileData: socialProfileData
    })
    
    // Add a delay to allow for any database triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Check user's profile and onboarding status
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id, full_name')
      .eq('id', user.id)
      .single()

    console.log('Auth callback: Profile check', { 
      profile, 
      profileError: profileError?.message,
      hasGym: !!profile?.gym_id 
    })

    // Handle different scenarios based on profile state
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist - this shouldn't happen with proper triggers
      console.warn('Auth callback: Profile not found, creating basic profile')
      
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: socialProfileData.full_name || user.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString()
        })
      
      if (createProfileError) {
        console.error('Failed to create profile:', createProfileError)
        return NextResponse.redirect(`${origin}/onboarding?message=profile-creation-failed`)
      }
      
      // Redirect to onboarding for social users
      console.log('Auth callback: New profile created, redirecting to social onboarding')
      return NextResponse.redirect(`${origin}/signup?social=true&provider=${provider}`)
    }
    
    if (profileError && profileError.code !== 'PGRST116') {
      // Other profile errors
      console.error('Auth callback: Profile fetch error:', profileError)
      return NextResponse.redirect(`${origin}/login?message=profile-fetch-error`)
    }

    if (profile && profile.gym_id) {
      // User has completed onboarding, redirect to dashboard
      console.log('Auth callback: User has gym, redirecting to dashboard')
      
      // Update profile with fresh social data if available and if it's missing
      if (socialProfileData.full_name && !profile.full_name) {
        console.log('Updating profile with social data...')
        await supabase
          .from('profiles')
          .update({
            full_name: socialProfileData.full_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }
      
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      // User needs to complete onboarding
      console.log('Auth callback: User needs onboarding, redirecting to social signup')
      
      // For social users, redirect to signup page with social=true
      const redirectUrl = `${origin}/signup?social=true&provider=${provider}`
      return NextResponse.redirect(redirectUrl)
    }
    
  } catch (error) {
    console.error('Auth callback unexpected error:', error)
    
    // Provide more detailed error information in development
    const errorDetails = error instanceof Error ? error.message : 'Unknown error'
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (isDevelopment) {
      return NextResponse.redirect(`${origin}/login?message=social-auth-error&details=${encodeURIComponent(errorDetails)}`)
    } else {
      return NextResponse.redirect(`${origin}/login?message=social-auth-error`)
    }
  }
}

// Helper function to extract social profile data
function extractSocialProfileData(user: User) {
  const userMetadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  
  // Extract profile data based on provider
  const provider = appMetadata.provider || 'unknown';
  let full_name = '';
  let avatar_url = '';
  
  switch (provider) {
    case 'google':
      full_name = userMetadata.full_name || userMetadata.name || '';
      avatar_url = userMetadata.avatar_url || userMetadata.picture || '';
      break;
      
    case 'facebook':
      full_name = userMetadata.full_name || userMetadata.name || '';
      avatar_url = userMetadata.avatar_url || userMetadata.picture?.data?.url || '';
      break;
      
    default:
      // Fallback for other providers
      full_name = userMetadata.full_name || userMetadata.name || userMetadata.display_name || '';
      avatar_url = userMetadata.avatar_url || userMetadata.picture || '';
  }
  
  return {
    provider,
    full_name: full_name.trim(),
    avatar_url: avatar_url,
    email: user.email || '',
    email_verified: user.email_confirmed_at ? true : false,
  };
}
