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
      password?: string[];
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

export type ForgotPasswordFormState = {
  error: string | null;
  success: string | null;
}

export type ResetPasswordFormState = {
  error: string | null;
  success: string | null;
}

export type ChangePasswordFormState = {
  error: string | null;
  success: string | null;
}

// --- Zod Schemas for Validation ---
const SignupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
})

const GymNameSchema = z.object({
  gymName: z.string().min(3, { message: 'Gym name must be at least 3 characters long' }),
})

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
})

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
    return 'Invalid email or password. Please try again.';
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

// --- SIMPLIFIED SIGNUP WITH EMAIL ACTION ---
export const signupWithEmail = async (
  prevState: SignupFormState | null,
  formData: FormData
): Promise<SignupFormState> => {
  const supabase = await createClient()
  const origin = (await headers()).get('origin');
  if (!origin) {
    return { error: {message: 'Could not determine origin.' }};
  }

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const inviteToken = formData.get('inviteToken') as string; // Get invitation token
  
  // Validate using Zod schema
  const validation = SignupSchema.safeParse({ email, password });
  
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return {
      error: {
        message: 'Please fix the errors below',
        details: {
          email: errors.email,
          password: errors.password,
        }
      }
    };
  }

  try {
    // Attempt to sign up the user (OTP-only, no email confirmation links)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        // Store invitation token in user metadata for OTP verification
        data: inviteToken ? { pendingInviteToken: inviteToken } : undefined,
        // Disable email confirmation links - we use OTP instead
        emailRedirectTo: undefined
      }
    });
    
    if (authError) {
      // Enhanced user existence check
      if (authError.message.includes('already registered') || 
          authError.message.includes('already exists') ||
          authError.message.includes('User already registered')) {
        redirect('/login?message=user-exists');
      }
      const errorMessage = handleAuthError(authError, 'Signup');
      return { error: { message: errorMessage } } 
    }
    
    if (!authData.user) {
      return { error: { message: 'Could not create account. Please try again.' } }
    }

    // Send email OTP instead of confirmation link
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: {
        shouldCreateUser: false // User already created above
      }
    });

    if (otpError) {
      logger.error('Failed to send OTP after signup:', { 
        error: otpError.message,
        email: validation.data.email 
      })
      // Don't fail the signup, user can resend OTP
    }

    // Redirect to OTP verification page
    redirect(`/verify-email?email=${encodeURIComponent(validation.data.email)}`);
  } catch (error) {
    handleCatchError(error, 'Signup error');
    const errorMessage = handleAuthError(error, 'Signup');
    return { error: { message: errorMessage } }
  }
}

// --- ENHANCED LOGIN WITH EMAIL ACTION ---
export const loginWithEmail = async (
  prevState: LoginFormState | null,
  formData: FormData
): Promise<LoginFormState> => {
  const supabase = await createClient();
  
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Enhanced error handling for different scenarios
      if (error.message.includes('Email not confirmed')) {
        redirect('/login?message=email-not-confirmed');
      }
      
      // Provide helpful guidance for invalid credentials
      if (error.message.includes('Invalid login credentials')) {
        return { 
          error: 'Invalid email or password. If you signed up with Google or Facebook, please use those login buttons instead. If you set a password after social login, there might be an account setup issue - try logging in with your social provider first.' 
        };
      }
      
      const errorMessage = handleAuthError(error, 'Login');
      return { error: errorMessage };
    }
    
    // Enhanced onboarding gatekeeper
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        const errorMessage = handleAuthError(profileError, 'Profile fetch');
        return { error: errorMessage };
      }

      if (profile?.gym_id) {
        redirect('/dashboard'); // User has gym details, go to dashboard
      } else {
        redirect('/onboarding'); // User needs to complete onboarding
      }
    } else {
      redirect('/onboarding'); // Fallback to onboarding
    }
  } catch (error) {
    handleCatchError(error, 'Login error');
    const errorMessage = handleAuthError(error, 'Login');
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

// --- FORGOT PASSWORD ACTION ---
export const forgotPassword = async (
  prevState: ForgotPasswordFormState | null,
  formData: FormData
): Promise<ForgotPasswordFormState> => {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');
  
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.', success: null };
  }

  if (!origin) {
    return { error: 'Could not determine origin.', success: null };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      const errorMessage = handleAuthError(error, 'Password reset');
      return { error: errorMessage, success: null };
    }

    return { 
      error: null, 
      success: 'Password reset email sent. Please check your inbox.' 
    };
  } catch (error) {
    handleCatchError(error, 'Password reset error');
    const errorMessage = handleAuthError(error, 'Password reset');
    return { error: errorMessage, success: null };
  }
};

// --- RESET PASSWORD ACTION ---
export const resetPassword = async (
  prevState: ResetPasswordFormState | null,
  formData: FormData
): Promise<ResetPasswordFormState> => {
  const supabase = await createClient();
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are required.', success: null };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.', success: null };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.', success: null };
  }

  try {
    // Validate session before updating password
    const { user, error: userError } = await validateUserSession(supabase);
    if (userError || !user) {
      return { error: 'Session expired. Please request a new password reset.', success: null };
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      const errorMessage = handleAuthError(error, 'Password update');
      return { error: errorMessage, success: null };
    }

    return { 
      error: null, 
      success: 'Password updated successfully. Please log in with your new password.' 
    };
  } catch (error) {
    handleCatchError(error, 'Password update error');
    const errorMessage = handleAuthError(error, 'Password update');
    return { error: errorMessage, success: null };
  }
};

// --- CHANGE PASSWORD ACTION ---
export const changePassword = async (
  prevState: ChangePasswordFormState | null,
  formData: FormData
): Promise<ChangePasswordFormState> => {
  const supabase = await createClient();
  
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  // Validate using Zod schema
  const validation = ChangePasswordSchema.safeParse({ currentPassword, newPassword });
  
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const errorMessage = errors.currentPassword?.[0] || errors.newPassword?.[0] || 'Invalid input';
    return { error: errorMessage, success: null };
  }

  try {
    // Validate session before updating password
    const { user, error: userError } = await validateUserSession(supabase);
    if (userError || !user) {
      return { error: 'Session expired. Please log in again.', success: null };
    }

    // Check if user is from social auth (doesn't have a password set)
    const provider = user.app_metadata?.provider;
    if (provider && provider !== 'email') {
      return { error: 'Social auth users should use "Set Password" instead of "Change Password".', success: null };
    }

    // Verify current password by attempting to sign in (only for email auth users)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password: validation.data.currentPassword,
    });

    if (signInError) {
      return { error: 'Current password is incorrect.', success: null };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: validation.data.newPassword
    });

    if (error) {
      const errorMessage = handleAuthError(error, 'Password change');
      return { error: errorMessage, success: null };
    }

    return { 
      error: null, 
      success: 'Password changed successfully.' 
    };
  } catch (error) {
    handleCatchError(error, 'Password change error');
    const errorMessage = handleAuthError(error, 'Password change');
    return { error: errorMessage, success: null };
  }
};
