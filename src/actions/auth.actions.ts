// src/actions/auth.actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

// --- Zod Schemas for Validation ---
const SignupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
})

const GymNameSchema = z.object({
  gymName: z.string().min(3, { message: 'Gym name must be at least 3 characters long' }),
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
    // Call our RPC function to complete the user profile
    console.log('Onboarding: Calling complete_user_profile', {
      userId: user.id,
      gymName: gymValidation.data.gymName
    })
    
    const { error: dbError } = await supabase.rpc('complete_user_profile', {
      user_id: user.id,
      gym_name: gymValidation.data.gymName,
    });

    if (dbError) {
      const errorMessage = handleAuthError(dbError, 'Onboarding RPC');
      return { error: { message: errorMessage } }
    }
    
    console.log('Onboarding: Success, waiting for profile update before redirect')
    
    // Add a longer delay to ensure the database update is complete
    await new Promise(resolve => setTimeout(resolve, 2000))
    
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
    
    console.log('Onboarding: Profile verified, redirecting to dashboard', {
      gymId: updatedProfile.gym_id,
      fullName: updatedProfile.full_name
    })
    
    // Redirect to dashboard after successful onboarding
    redirect('/dashboard')
  } catch (error) {
    const errorMessage = handleAuthError(error, 'Onboarding');
    return { error: { message: errorMessage } }
  }
}

// --- SOCIAL ONBOARDING ACTION (Separate from regular signup) ---
export const completeSocialOnboarding = async (
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
    return { error: { message: gymError || 'Invalid gym name.', details: { gymName: [gymError || 'Invalid gym name.'] } } }
  }
  
  try {
    // Call our RPC function to update the existing profile
    console.log('Social onboarding: Calling complete_user_profile', {
      userId: user.id,
      gymName: gymValidation.data.gymName
    })
    
    const { error: dbError } = await supabase.rpc('complete_user_profile', {
      user_id: user.id,
      gym_name: gymValidation.data.gymName,
    });

    if (dbError) {
      const errorMessage = handleAuthError(dbError, 'Social onboarding RPC');
      return { error: { message: errorMessage } }
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
    const errorMessage = handleAuthError(error, 'Social onboarding');
    return { error: { message: errorMessage } }
  }
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
    // Attempt to sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password, 
      options: {
        emailRedirectTo: `${origin}/auth/callback`
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

    // Redirect to email confirmation page
    redirect('/confirm-email');
  } catch (error) {
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
      // Enhanced error handling
      if (error.message.includes('Email not confirmed')) {
        redirect('/login?message=email-not-confirmed');
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
    const errorMessage = handleAuthError(error, 'Login');
    return { error: errorMessage };
  }
};

// --- ENHANCED SOCIAL LOGIN ACTION ---
export const loginWithSocialProvider = async (provider: 'google' | 'facebook') => {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  if (!origin) { 
    redirect('/login?message=social-auth-error')
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${origin}/auth/callback` },
    })

    if (error) { 
      console.error('Social login error:', error);
      redirect('/login?message=social-auth-error')
    }
    
    if (data.url) { 
      redirect(data.url) // We redirect to the URL provided by Supabase (e.g., Google's login page)
    } else { 
      redirect('/login?message=social-auth-error')
    }
  } catch (error) {
    console.error('Social login error:', error);
    redirect('/login?message=social-auth-error')
  }
}

// --- LOGOUT ACTION ---
export const logout = async () => {
  'use server'
  const supabase = await createClient()
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Don't redirect here - let the client handle the redirect
    // This prevents the infinite refresh loop
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: 'Failed to log out' }
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
    const errorMessage = handleAuthError(error, 'Password update');
    return { error: errorMessage, success: null };
  }
};
