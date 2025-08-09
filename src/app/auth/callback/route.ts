// src/app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

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
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const inviteToken = searchParams.get('invite')
  
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
    const supabase = await createClient() // Use the shared, async client

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
    
    // Wait for database trigger to create profile with retry logic
    const profile = await waitForProfileCreation(supabase, user.id)
    
    if (!profile) {
      console.error('Auth callback: Profile creation failed after retries')
      return NextResponse.redirect(`${origin}/login?message=profile-creation-failed`)
    }

    console.log('Auth callback: Profile found', { 
      profile, 
      hasGym: !!profile.gym_id,
      role: profile.default_role,
      isOwner: profile.is_gym_owner
    })

    // Enrich profile with social data if missing
    await enrichProfileWithSocialData(supabase, user.id, profile, socialProfileData)

    // Get invite token from URL params or user metadata
    const userInviteToken = inviteToken || user.user_metadata?.pendingInviteToken

    // If user has an invitation token and is newly confirmed, try to accept the invitation
    if (userInviteToken && isNewUser && user.email) {
      console.log('Auth callback: Attempting to auto-accept invitation', { 
        token: userInviteToken.substring(0, 10) + '...', 
        userEmail: user.email 
      })
      
      try {
        // Call our invitation acceptance API
        const response = await fetch(`${origin}/api/invites/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session?.access_token}`
          },
          body: JSON.stringify({
            inviteToken: userInviteToken,
            userEmail: user.email
          })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            console.log('Auth callback: Invitation accepted successfully', result)
            // Clear the pending invitation token
            await supabase.auth.updateUser({
              data: { pendingInviteToken: null }
            })
            // Redirect to dashboard since they're now part of a gym
            return NextResponse.redirect(`${origin}/dashboard?welcome=true`)
          } else {
            console.log('Auth callback: Invitation acceptance failed', result.error)
          }
        } else {
          console.log('Auth callback: Invitation acceptance request failed', response.status)
        }
      } catch (error) {
        console.error('Auth callback: Error accepting invitation:', error)
        // Continue with normal flow if invitation acceptance fails
      }
    }

    // Route user based on RBAC-aware profile state
    return routeUserBasedOnProfile(origin, profile, provider, isNewUser, userInviteToken)
    
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

// Helper function to wait for profile creation with exponential backoff
async function waitForProfileCreation(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileData | null> {
  const maxRetries = 5
  const baseDelay = 100 // Start with 100ms
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`Auth callback: Checking for profile (attempt ${attempt + 1}/${maxRetries})`)
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, gym_id, full_name, email, default_role, is_gym_owner, avatar_url')
      .eq('id', userId)
      .single()
    
    if (profile) {
      console.log('Auth callback: Profile found after', attempt + 1, 'attempts')
      return profile as ProfileData
    }
    
    if (error && error.code !== 'PGRST116') {
      console.error('Auth callback: Unexpected profile error:', error)
      return null
    }
    
    // If not the last attempt, wait before retrying
    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
      console.log(`Auth callback: Profile not found, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  console.error('Auth callback: Profile not found after', maxRetries, 'attempts')
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
    console.log('Auth callback: Enriching profile with social data:', updates)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (updateError) {
      console.error('Auth callback: Failed to update profile with social data:', updateError)
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
    console.log('Auth callback: User has gym, redirecting to dashboard', {
      gymId: profile.gym_id,
      role: profile.default_role,
      isOwner: profile.is_gym_owner
    })
    // If there's an invite token, try to handle it even if user has a gym
    if (inviteToken) {
      return NextResponse.redirect(`${origin}/dashboard?invite=${inviteToken}`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }
  
  // User needs onboarding
  console.log('Auth callback: User needs onboarding', {
    isNewUser,
    provider,
    role: profile.default_role,
    hasProfile: !!profile.id
  })
  
  // For social auth users, provide context to onboarding
  if (provider && isNewUser) {
    const params = new URLSearchParams({ social: 'true', provider })
    if (inviteToken) params.set('invite', inviteToken)
    return NextResponse.redirect(`${origin}/onboarding?${params.toString()}`)
  }
  
  // Include invite token in onboarding URL if present
  if (inviteToken) {
    return NextResponse.redirect(`${origin}/onboarding?invite=${inviteToken}`)
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
