// src/app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { logger } from '@/lib/logger'

// Types for better type safety
interface SocialProfileData {
  provider: string
  full_name: string
  avatar_url: string
  email: string
  email_verified: boolean
}

interface ProfileData {
  id: string
  gym_id: string | null
  full_name: string | null
  email: string
  default_role: string
  is_gym_owner: boolean
  avatar_url: string | null
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const inviteToken = searchParams.get('invite')
  
  // Handle OAuth errors per Supabase documentation
  if (error) {
    logger.error('OAuth error in callback:', { error, errorDescription })
    
    // Map OAuth errors to user-friendly messages
    switch (error) {
      case 'access_denied':
        return NextResponse.redirect(`${origin}/login?message=social-auth-cancelled`)
      case 'invalid_request':
      case 'invalid_client':
        return NextResponse.redirect(`${origin}/login?message=social-auth-invalid`)
      case 'server_error':
        return NextResponse.redirect(`${origin}/login?message=social-auth-server-error`)
      default:
        return NextResponse.redirect(`${origin}/login?message=social-auth-error&details=${encodeURIComponent(errorDescription || error)}`)
    }
  }
  
  if (!code) {
    logger.error('Auth callback: No authorization code received')
    return NextResponse.redirect(`${origin}/login?message=social-auth-missing-code`)
  }
  
  try {
    const supabase = await createClient()

    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      logger.error('Session exchange error:', {sessionError})
      // Handle specific session exchange errors
      if (sessionError.message.includes('Invalid or expired code')) {
        return NextResponse.redirect(`${origin}/login?message=social-auth-expired`)
      }
      return NextResponse.redirect(`${origin}/login?message=social-auth-error&details=${encodeURIComponent(sessionError.message)}`)
    }
    
    if (!data.session) {
      logger.error('Auth callback: No session received')
      return NextResponse.redirect(`${origin}/login?message=social-auth-no-session`)
    }

    // Get user data securely after session is established
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logger.error('Auth callback: Failed to get user data', {userError})
      return NextResponse.redirect(`${origin}/login?message=social-auth-no-user`)
    }
    
    // Extract social provider information
    const provider = user.app_metadata?.provider
    const isNewUser = !user.last_sign_in_at || user.created_at === user.last_sign_in_at
    const socialProfileData = extractSocialProfileData(user)
    
    // Wait for database trigger to create profile with retry logic
    const profile = await waitForProfileCreation(supabase, user.id)
    
    if (!profile) {
      logger.error('Auth callback: Profile creation failed after retries')
      return NextResponse.redirect(`${origin}/login?message=profile-creation-failed`)
    }

    // Enrich profile with social data if missing
    await enrichProfileWithSocialData(supabase, user.id, profile, socialProfileData)

    // Get invite token from URL params or user metadata
    const userInviteToken = inviteToken || user.user_metadata?.pendingInviteToken

    // Store invite token in user metadata for later processing (after OTP verification)
    if (userInviteToken && isNewUser && user.email) {
      try {
        // Store the invite token in user metadata for processing after OTP verification
        await supabase.auth.updateUser({
          data: { pendingInviteToken: userInviteToken }
        })
      } catch (error) {
        logger.error('Auth callback: Error storing invite token:', { error })
        // Continue with normal flow if storing fails
      }
    }

    // Route user based on RBAC-aware profile state
    return routeUserBasedOnProfile(origin, profile, provider, isNewUser, userInviteToken)
    
  } catch (error) {
    logger.error('Auth callback unexpected error:', {error})
    
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

// Helper function to wait for profile creation with exponential backoff
async function waitForProfileCreation(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileData | null> {
  const maxRetries = 5
  const baseDelay = 100 // Start with 100ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    logger.info(`Auth callback: Checking for profile (attempt ${attempt + 1}/${maxRetries})`)
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, gym_id, full_name, email, default_role, is_gym_owner, avatar_url')
      .eq('id', userId)
      .single()
    
    if (profile) {
      logger.info('Auth callback: Profile found after', { attempts: attempt + 1 })
      return profile as ProfileData
    }
    
    if (error && error.code !== 'PGRST116') {
      logger.error('Auth callback: Unexpected profile error:', {error})
      return null
    }
    
    // If not the last attempt, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
      logger.info(`Auth callback: Profile not found, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  logger.error('Auth callback: Profile not found after', { maxRetries })
  return null
}

// Helper function to enrich profile with social data
async function enrichProfileWithSocialData(
  supabase: SupabaseClient<Database>, 
  userId: string, 
  profile: ProfileData, 
  socialData: SocialProfileData
) {
  const updates: Partial<ProfileData> = {}
  
  // Update missing profile data with social data
  if (socialData.full_name && !profile.full_name) {
    updates.full_name = socialData.full_name
  }
  
  if (socialData.avatar_url && !profile.avatar_url) {
    updates.avatar_url = socialData.avatar_url
  }
  
  // Always update email if it's different (social auth might have more recent email)
  if (socialData.email && socialData.email !== profile.email) {
    updates.email = socialData.email
  }
  
  if (Object.keys(updates).length > 0) {
    logger.info('Auth callback: Enriching profile with social data:', updates)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) {
      logger.error('Auth callback: Failed to update profile with social data:', {updateError})
      // Don't fail the auth flow for profile enrichment errors
    }
  }
}

// Helper function to route user based on RBAC-aware profile state
function routeUserBasedOnProfile(
  origin: string, 
  profile: ProfileData, 
  provider: string | undefined,
  isNewUser: boolean,
  inviteToken?: string | null
): NextResponse {
  // User has completed onboarding and has a gym
  if (profile.gym_id) {
    logger.info('Auth callback: User has gym, redirecting to dashboard', {
      gymId: profile.gym_id,
      role: profile.default_role,
      isOwner: profile.is_gym_owner
    })

    // If there's an invite token, try to handle it even if user has a gym
    if (inviteToken) {
      return NextResponse.redirect(`${origin}/accept-invite?invite=${inviteToken}`)
    }
    if(profile.default_role === 'member') {
      return NextResponse.redirect(`${origin}/portal`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }
  
  // User needs onboarding
  logger.info('Auth callback: User needs onboarding', {
    isNewUser,
    provider,
    role: profile.default_role,
    hasProfile: !!profile.id,
    hasInviteToken: !!inviteToken
  })
  
  // For new users, always require email verification first (OTP)
  if (isNewUser) {
    logger.info('Auth callback: New user - redirecting to email verification')
    // Store invite token in URL params for after verification
    if (inviteToken) {
      return NextResponse.redirect(`${origin}/verify-email?invite=${inviteToken}`)
    }
    return NextResponse.redirect(`${origin}/verify-email`)
  }
  
  // For existing users, go directly to onboarding
  if (inviteToken) {
    return NextResponse.redirect(`${origin}/accept-invite?invite=${inviteToken}`)
  }
  
  return NextResponse.redirect(`${origin}/onboarding`)
}

// Enhanced helper function to extract social profile data
function extractSocialProfileData(user: User): SocialProfileData {
  const userMetadata = user.user_metadata || {}
  const appMetadata = user.app_metadata || {}
  
  // Extract profile data based on provider
  const provider = appMetadata.provider || 'unknown'
  let full_name = ''
  let avatar_url = ''
  
  switch (provider) {
    case 'google':
      full_name = userMetadata.full_name || userMetadata.name || ''
      avatar_url = userMetadata.avatar_url || userMetadata.picture || ''
      break
      
    case 'facebook':
      full_name = userMetadata.full_name || userMetadata.name || ''
      avatar_url = userMetadata.avatar_url || userMetadata.picture?.data?.url || ''
      break
      
    case 'github':
      full_name = userMetadata.full_name || userMetadata.name || ''
      avatar_url = userMetadata.avatar_url || ''
      break
      
    case 'twitter':
      full_name = userMetadata.full_name || userMetadata.name || ''
      avatar_url = userMetadata.avatar_url || ''
      break
      
    default:
      // Fallback for other providers
      full_name = userMetadata.full_name || userMetadata.name || userMetadata.display_name || ''
      avatar_url = userMetadata.avatar_url || userMetadata.picture || ''
  }
  
  return {
    provider,
    full_name: full_name.trim(),
    avatar_url: avatar_url.trim(),
    email: user.email || '',
    email_verified: !!user.email_confirmed_at,
  }
}
