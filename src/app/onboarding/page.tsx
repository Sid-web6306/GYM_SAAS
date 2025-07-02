// src/app/onboarding/page.tsx
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const OnboardingPage = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  console.log('OnboardingPage user:', user)
  if (!user) {
    return redirect('/signup?message=Please signup to continue')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('gym_id')
    .eq('id', user.id)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error)
    return redirect('/login?message=Could not fetch user profile')
  }

  if (profile?.gym_id) {
    // --- User's profile IS complete ---
    // Add a 'welcome_back' message and redirect to dashboard
    const message = encodeURIComponent("Welcome back!");
    redirect(`/dashboard?message=${message}`);
  } else {
    // --- User's profile is NOT complete ---
    // Add a 'complete_profile' message and redirect to the signup page
    const email = user.email || ''
    const message = encodeURIComponent("Welcome! Please complete your profile to continue.");
    redirect(`/signup?social=true&email=${encodeURIComponent(email)}&message=${message}`);
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Please wait...</p>
    </div>
  )
}

export default OnboardingPage