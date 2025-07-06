// src/app/(app)/layout.tsx

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'
import { ClientLayout } from './client-layout'

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient()

  // Get user session - this is the most reliable check
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  console.log('AppLayout: Auth check', { 
    hasUser: !!user, 
    userError,
    userEmail: user?.email 
  })

  // Simple auth check - just check for user
  if (!user) {
    console.log('AppLayout: No user found, redirecting to login')
    return redirect('/login')
  }

  const currentUser = user

  // Fetch profile data to get the gym name and user name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, gym_id, gyms(name)') // Include gym_id to check onboarding status
    .eq('id', currentUser.id)
    .single();
  
  console.log('AppLayout: Profile check', { 
    hasProfile: !!profile, 
    hasGymId: !!profile?.gym_id, 
    profileError 
  })
  
  // Check if user has completed onboarding
  if (!profile?.gym_id) {
    console.log('AppLayout: No gym_id, redirecting to onboarding')
    return redirect('/onboarding')
  }
  
  const gymName = profile?.gyms?.name || 'My Gym';
  const userName = profile?.full_name || currentUser.email || 'User';

  console.log('AppLayout: Auth successful, rendering app', { 
    gymName, 
    userName, 
    userId: currentUser.id 
  })

  return (
    <ClientLayout initialGymName={gymName} initialUserName={userName}>
      {children}
    </ClientLayout>
  )
}

export default AppLayout