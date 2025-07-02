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
      gymName?: string[];
      email?: string[];
      password?: string[];
    } | null;
  } | null;
}

export type LoginFormState = {
  error: string | null;
}


// --- Zod Schema for Sign-up Validation ---
const SignupSchema = z.object({
  gymName: z.string().min(3, { message: 'Gym name must be at least 3 characters long' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
})


// --- SIGN UP ACTION ---

export const signupWithEmail = async (
    prevState: SignupFormState | null,
    formData: FormData
  ): Promise<SignupFormState> => {
    const supabase = await createClient()
    
    const isSocialOnboarding = formData.get('isSocialOnboarding') === 'true';
    const gymName = formData.get('gym-name') as string;
  
    // --- Universal Gym Name Validation ---
    if (!gymName || gymName.length < 3) {
      return { error: { message: 'Gym name must be at least 3 characters.' } }
    }
  
    // --- CASE 1: Social Onboarding (User is already authenticated) ---
    if (isSocialOnboarding) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { message: 'User not found. Please log in again.' } }
      }
      
      // Call our new RPC function to update the existing profile
      const { error: dbError } = await supabase.rpc('complete_user_profile', {
        user_id: user.id,
        gym_name: gymName,
      });
  
      if (dbError) {
        return { error: { message: dbError.message || 'Could not save gym details.' } }
      }
      
      redirect('/dashboard');
    } 
    
    // --- CASE 2: Standard Email/Password Sign-up (User does not exist yet) ---
    else {
      const result = SignupSchema.safeParse({
        gymName, // We can use the gymName from above
        email: formData.get('email'),
        password: formData.get('password'),
      })
  
      if (!result.success) {
        return {
          error: {
            message: 'Invalid form data.',
            details: result.error.flatten().fieldErrors,
          },
        }
      }
  
      const { email, password } = result.data;
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      
      if (authError || !authData.user) { 
        return { error: { message: authError?.message || 'Could not sign up.' } } 
      }
  
      // After sign-up, the trigger has already created the profile.
      // Now we just need to complete it with the gym name.
      const { error: dbError } = await supabase.rpc('complete_user_profile', {
        user_id: authData.user.id,
        gym_name: gymName,
      });
  
      if (dbError) {
        // In a real app, you might want to delete the user here if this fails
        return { error: { message: dbError.message || 'Could not save gym details.' } }
      }
      
      redirect('/dashboard');
    }
  }


// --- LOGIN WITH EMAIL ACTION ---
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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }
  
  redirect('/onboarding'); // Redirect to onboarding to check profile status
};


// --- LOGIN WITH SOCIAL PROVIDER ACTION ---
export const loginWithSocialProvider = async (provider: 'google' | 'facebook') => {
  const supabase = await createClient();
  const origin = (await headers()).get('origin');

  if (!origin) { return }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error) { redirect('/login?message=Could not authenticate with provider') }
  
  // *** THE CORRECTED LINE ***
  if (data.url) { 
    redirect(data.url) // We redirect to the URL provided by Supabase (e.g., Google's login page)
  } else { 
    redirect('/login?message=Could not get provider URL') 
  }
}

// Add this to src/actions/auth.actions.ts

export const logout = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }