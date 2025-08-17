// src/actions/auth.actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { User } from '@supabase/supabase-js'
import { handleCatchError } from '@/lib/utils'
import { logger } from '@/lib/logger'

// --- Types for Form State ---
export type SignupFormState = {
  error: {
    message: string;
    details?: {
      email?: string[];
    } | null;
  } | null;
}

export type OnboardingFormState = {
  error: {
    message: string;
    details?: {
      gymName?: string[];
    } | null;
  } | null;
}

export type LoginFormState = {
  error: string | null;
}

// Removed password-related form states - no longer needed for passwordless auth

// --- Zod Schemas for Validation ---
const EmailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
})

const GymNameSchema = z.object({
  gymName: z.string().min(3, { message: 'Gym name must be at least 3 characters long' }),
})

// Removed password schemas - no longer needed for passwordless auth

// --- HELPER FUNCTIONS ---

// Enhanced user validation with session check
const validateUserSession = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Session validation error:', error);
      return { user: null, error: 'Session expired. Please log in again.' };
    }
    
    if (!user) {
      return { user: null, error: 'No active session. Please log in.' };
    }
    
    // Additional session validation - check if session is still valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session check failed:', sessionError);
      return { user: null, error: 'Session expired. Please log in again.' };
    }
    
    return { user, error: null };
  } catch (error) {
    console.error('User validation error:', error);
    return { user: null, error: 'Authentication error. Please try again.' };
  }
};

// Enhanced error handling helper
const handleAuthError = (error: unknown, context: string) => {
  console.error(`${context} error:`, error);
  
  // Type guard to check if error has a message property
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : '';
  
  // Map common Supabase errors to user-friendly messages
  if (errorMessage.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link.';
  }
  
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or authentication failed. Please try again.';
  }
  
  if (errorMessage.includes('already registered') || 
      errorMessage.includes('already exists') ||
      errorMessage.includes('User already registered')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  
  if (errorMessage.includes('session_expired') || 
      errorMessage.includes('jwt expired') ||
      errorMessage.includes('refresh_token_not_found')) {
    return 'Your session has expired. Please log in again.';
  }
  
  // Return the original error message or a generic one
  return errorMessage || 'An unexpected error occurred. Please try again.';
};

// --- COMPLETE ONBOARDING ACTION ---
export const completeOnboarding = async (
  prevState: OnboardingFormState | null,
  formData: FormData
): Promise<OnboardingFormState> => {
  const supabase = await createClient()
  const gymName = formData.get('gym-name') as string;
  
  // Enhanced user validation
  const { user, error: userError } = await validateUserSession(supabase);
  if (userError || !user) {
    redirect('/login?message=session-expired');
  }
  
  // Validate gym name using Zod
  const gymValidation = GymNameSchema.safeParse({ gymName });
  if (!gymValidation.success) {
    const gymError = gymValidation.error.flatten().fieldErrors.gymName?.[0];
    return { error: { message: gymError || 'Invalid gym name.' } }
  }
  
  try {
    // Check if this is a new user (account created recently)
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const timeDiffMinutes = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
    const isNewUser = timeDiffMinutes < 30; // Consider new if created within 30 minutes
    
    // Call our RPC function to complete the user profile
    console.log('Onboarding: Calling complete_user_profile', {
      userId: user.id,
      gymName: gymValidation.data.gymName,
      isNewUser,
      userCreatedAt: userCreatedAt.toISOString(),
      timeDiffMinutes
    })
    
    const { error: dbError } = await supabase.rpc('complete_user_profile', {
      p_user_id: user.id,
      gym_name: gymValidation.data.gymName,
    });

    if (dbError) {
      const errorMessage = handleAuthError(dbError, 'Onboarding RPC');
      return { error: { message: errorMessage } }
    }
    
    // Update profile with social data if available (for social auth users)
    const socialProfileData = extractSocialProfileData(user);
    if (socialProfileData.full_name) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: socialProfileData.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (profileUpdateError) {
        console.warn('Onboarding: Failed to update profile with social data', profileUpdateError)
      }
    }
    
    console.log('Onboarding: Success, waiting for profile update before redirect')
    // Verify the profile was updated AFTER the RPC call
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id, full_name')
      .eq('id', user.id)
      .single()
    
    console.log('Onboarding: Updated profile', updatedProfile)
    
    if (profileError || !updatedProfile?.gym_id) {
      console.error('Onboarding: Profile verification failed', profileError)
      return { error: { message: 'Profile update failed. Please try again.' } }
    }
    
    console.log('Onboarding: Profile verified, redirecting to dashboard')
    
    // Redirect to dashboard with new user flag
    const redirectUrl = isNewUser ? '/dashboard?welcome=true' : '/dashboard';
    redirect(redirectUrl);
    
  } catch (error) {
    console.error('Onboarding error:', error)
    
    // CRITICAL: Check if this is a Next.js redirect error (which is expected behavior)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      console.log('Re-throwing NEXT_REDIRECT error')
      throw error
    }
    
    // Check if error has digest property indicating it's a Next.js internal error
    if (error && typeof error === 'object' && 'digest' in error) {
      console.log('Re-throwing Next.js internal error with digest')
      throw error
    }
    
    // Check for redirect-related errors by message content
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      console.log('Re-throwing redirect-related error')
      throw error
    }
    
    console.log('Treating as actual error, not redirect')
    const errorMessage = handleAuthError(error, 'Onboarding');
    return { error: { message: errorMessage } }
  }
}

// --- ENHANCED SOCIAL ONBOARDING ACTION ---
export const completeSocialOnboarding = async (
  prevState: OnboardingFormState | null,
  formData: FormData
): Promise<OnboardingFormState> => {
  const supabase = await createClient()
  const gymName = formData.get('gym-name') as string;

  // Enhanced user validation with social provider data
  const { user, error: userError } = await validateUserSession(supabase);
  if (userError || !user) {
    redirect('/login?message=session-expired');
  }
  
  // Validate gym name using Zod
  const gymValidation = GymNameSchema.safeParse({ gymName });
  if (!gymValidation.success) {
    const gymError = gymValidation.error.flatten().fieldErrors.gymName?.[0];
    return { error: { message: gymError || 'Invalid gym name.', details: { gymName: [gymError || 'Invalid gym name.'] } } }
  }
  
  try {
    // Extract additional profile data from social provider
    const socialProfileData = extractSocialProfileData(user);
    
    console.log('Social onboarding: Extracted profile data', {
      userId: user.id,
      email: user.email,
      socialData: socialProfileData,
      gymName: gymValidation.data.gymName
    })
    
    // Call enhanced RPC function with social profile data
    const { error: dbError } = await supabase.rpc('complete_user_profile', {
      p_user_id: user.id,
      gym_name: gymValidation.data.gymName,
    });

    if (dbError) {
      const errorMessage = handleAuthError(dbError, 'Social onboarding RPC');
      return { error: { message: errorMessage } }
    }
    
    // Update profile with social data if available
    if (socialProfileData.full_name) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: socialProfileData.full_name || user.email?.split('@')[0] || 'User',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (profileUpdateError) {
        console.warn('Social onboarding: Failed to update profile with social data', profileUpdateError)
        // Don't fail the whole process for profile update issues
      }
    }
    
    console.log('Social onboarding: Success, waiting for profile update before redirect')
    
    // Add a longer delay to ensure the database update is complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Verify the profile was updated AFTER the RPC call
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id, full_name')
      .eq('id', user.id)
      .single()
    
    console.log('Social onboarding: Updated profile', updatedProfile)
    
    if (profileError || !updatedProfile?.gym_id) {
      console.error('Social onboarding: Profile verification failed', profileError)
      return { error: { message: 'Profile update failed. Please try again.' } }
    }
    
    console.log('Social onboarding: Profile verified, redirecting to dashboard', {
      gymId: updatedProfile.gym_id,
      fullName: updatedProfile.full_name
    })
    
    // Redirect to dashboard after successful onboarding
    redirect('/dashboard')
  } catch (error) {
    console.log('Social onboarding error caught:', error, {
      isError: error instanceof Error,
      message: error instanceof Error ? error.message : 'No message',
      hasDigest: error && typeof error === 'object' && 'digest' in error,
      errorType: typeof error,
      errorConstructor: error?.constructor?.name
    })
    
    // Check if this is a Next.js redirect error (which is expected behavior)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      console.log('Re-throwing NEXT_REDIRECT error')
      throw error
    }
    
    // Check if error has digest property indicating it's a Next.js internal error
    if (error && typeof error === 'object' && 'digest' in error) {
      console.log('Re-throwing Next.js internal error with digest')
      throw error
    }
    
    // Check for redirect-related errors by message content
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      console.log('Re-throwing redirect-related error')
      throw error
    }
    
    console.log('Treating as actual error, not redirect')
    const errorMessage = handleAuthError(error, 'Social onboarding');
    return { error: { message: errorMessage } }
  }
}

// --- HELPER FUNCTION TO EXTRACT SOCIAL PROFILE DATA ---
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

// --- PASSWORDLESS SIGNUP WITH SUPABASE OTP ---
export const signupWithEmail = async (
  prevState: SignupFormState | null,
  formData: FormData
): Promise<SignupFormState> => {
  const supabase = await createClient()
  const email = formData.get('email') as string;
  const inviteToken = formData.get('inviteToken') as string;
  
  // Validate using Zod schema
  const validation = EmailSchema.safeParse({ email });
  
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return {
      error: {
        message: 'Please fix the errors below',
        details: {
          email: errors.email,
        }
      }
    };
  }

  try {
    // ✅ Use Supabase's built-in OTP system for signup
    const { error } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: {
        shouldCreateUser: true, // Create user (unverified until OTP verification)
        data: {
          signupFlow: true,
          ...(inviteToken && { pendingInviteToken: inviteToken })
        }
      }
    });

    if (error) {
      // Handle user already exists
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('User already registered')) {
        redirect('/login?message=user-exists');
      }
      
      const errorMessage = handleAuthError(error, 'Passwordless Signup');
      return { error: { message: errorMessage } } 
    }

    logger.info('Supabase signup OTP sent:', { 
      email: validation.data.email,
      hasInviteToken: !!inviteToken 
    })

    // Redirect to OTP verification page
    redirect(`/verify-email?email=${encodeURIComponent(validation.data.email)}`);
    
  } catch (error) {
    handleCatchError(error, 'Passwordless signup error');
    const errorMessage = handleAuthError(error, 'Passwordless Signup');
    return { error: { message: errorMessage } }
  }
}

// --- PASSWORDLESS LOGIN WITH EMAIL ACTION ---
export const loginWithEmail = async (
  prevState: LoginFormState | null,
  formData: FormData
): Promise<LoginFormState> => {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.' };
  }

  // Validate email format
  const validation = EmailSchema.safeParse({ email });
  if (!validation.success) {
    return { error: 'Please enter a valid email address.' };
  }

  try {
    // ✅ Passwordless login: Send OTP to existing user
    const { error } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: {
        shouldCreateUser: false, // User must already exist for login
        data: {
          loginFlow: true
        }
      }
    });

    if (error) {
      // Enhanced error handling for passwordless login
      if (error.message.includes('User not found') || 
          error.message.includes('not found') ||
          error.message.includes('Invalid email')) {
        return { 
          error: 'No account found with this email address. Please sign up first or check your email address.' 
        };
      }
      
      if (error.message.includes('rate limit')) {
        return {
          error: 'Too many login attempts. Please wait a few minutes before trying again.'
        };
      }
      
      const errorMessage = handleAuthError(error, 'Passwordless Login');
      return { error: errorMessage };
    }

    logger.info('Passwordless login OTP sent:', { 
      email: validation.data.email 
    })

    // Redirect to OTP verification page
    redirect(`/verify-email?email=${encodeURIComponent(validation.data.email)}`);
    
  } catch (error) {
    handleCatchError(error, 'Passwordless login error');
    const errorMessage = handleAuthError(error, 'Passwordless Login');
    return { error: errorMessage };
  }
};

// --- ENHANCED SOCIAL LOGIN ACTION ---
export const loginWithSocialProvider = async (
  provider: 'google' | 'facebook',
  options?: {
    redirectTo?: string
    scopes?: string
  }
) => {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  if (!origin) { 
    console.error('Social login: No origin header found')
    redirect('/login?message=social-auth-error')
  }

  // Enhanced OAuth configuration with better scopes
  const authOptions = {
    provider,
    options: { 
      redirectTo: options?.redirectTo || `${origin}/auth/callback`,
      // Request additional permissions for better profile data
      scopes: options?.scopes || (provider === 'google' 
        ? 'email profile openid' 
        : 'email public_profile'
      ),
      // Ensure we get fresh consent for profile data
      queryParams: {
        ...(provider === 'google' && {
          access_type: 'offline',
          prompt: 'consent',
        }),
        ...(provider === 'facebook' && {
          auth_type: 'rerequest',
        }),
      },
    },
  }

  console.log(`Initiating ${provider} OAuth with options:`, authOptions)

  try {
    const { data, error } = await supabase.auth.signInWithOAuth(authOptions)

    if (error) { 
      logger.error(`${provider} OAuth error:`, { error })
      
      // Handle specific OAuth errors
      if (error.message.includes('access_denied')) {
        redirect('/login?message=social-auth-cancelled')
      } else if (error.message.includes('invalid_request')) {
        redirect('/login?message=social-auth-invalid')
      } else {
        redirect('/login?message=social-auth-error')
      }
    }
    
    if (data.url) { 
      logger.info(`Redirecting to ${provider} OAuth URL:`, { url: data.url })
      redirect(data.url)
    } else { 
      logger.error(`${provider} OAuth: No redirect URL received`)
      redirect('/login?message=social-auth-error')
    }
  } catch (error) {
    // Check if this is a Next.js redirect error (which is expected behavior)
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      // Re-throw redirect errors so they can be handled properly by Next.js
      throw error
    }
    
    // Only log and handle actual unexpected errors
    console.error(`${provider} OAuth unexpected error:`, error)
    redirect('/login?message=social-auth-error')
  }
}

// --- OPTIMIZED LOGOUT ACTION ---
export const logout = async () => {
  'use server'
  
  try {
    const supabase = await createClient()
    
    // 1. Server-side session cleanup with global scope
    const { error: signOutError } = await supabase.auth.signOut({ 
      scope: 'global' // Sign out from all sessions
    })
    
    if (signOutError) {
      console.warn('Server logout: Supabase signOut warning:', signOutError)
      // Continue with cookie clearing even if signOut has issues
    }
    
    // 2. Streamlined cookie clearing - focus on core patterns
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    
    // Essential Supabase auth cookies (simplified from 15+ patterns)
    const coreCookies = [
      'supabase-auth-token',
      'supabase.auth.token',
      'sb-auth-token',
      'sb-access-token',
      'sb-refresh-token'
    ]
    
    // Clear core cookies with standard cleanup
    coreCookies.forEach(cookieName => {
      try {
        cookieStore.delete({ name: cookieName, path: '/' })
        cookieStore.set({
          name: cookieName,
          value: '',
          path: '/',
          expires: new Date(0),
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        })
      } catch (error) {
        // Individual cookie errors are non-critical
        console.debug(`Cookie clear warning for ${cookieName}:`, error)
      }
    })
    
    console.log('Server logout: Complete')
    return { success: true }
    
  } catch (error) {
    console.error('Server logout error:', error)
    
    // Emergency cookie clearing on complete failure
    try {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      
      // Force clear minimum essential cookies
      const essentialCookies = ['supabase-auth-token', 'supabase.auth.token']
      essentialCookies.forEach(cookieName => {
        try {
          cookieStore.delete({ name: cookieName, path: '/' })
          cookieStore.set({ name: cookieName, value: '', expires: new Date(0) })
        } catch {
          // Final fallback - ignore all errors
        }
      })
    } catch {
      // Complete failure - client will handle cleanup
    }
    
    return { 
      success: false, 
      error: 'Server logout failed - client will handle cleanup' 
    }
  }
}
