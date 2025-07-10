// src/app/(app)/layout.tsx

import { getServerAuth } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'
import ClientLayout from './client-layout'
import { handleCatchError } from '@/lib/utils'

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  // Enhanced server-side auth check with better error handling
  const { user, isAuthenticated } = await getServerAuth()
  
  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    console.log('AppLayout: User not authenticated, redirecting to login')
    return redirect('/login')
  }

  // Get basic profile info for initial render (TanStack Query will handle updates)
  // Only check gym setup if user is authenticated
  try {
    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, gym_id, gyms(name)')
      .eq('id', user.id)
      .single();
    
    // If there's a profile error, let the client handle it
    if (profileError) {
      console.warn('AppLayout: Profile fetch error:', profileError)
    }
    
    // Server-side onboarding check - only if we have a valid profile
    if (profile && !profile.gym_id) {
      console.log('AppLayout: No gym setup, redirecting to onboarding')
      return redirect('/onboarding')
    }
  } catch (error) {
    // Use utility function to handle errors properly
    handleCatchError(error, 'AppLayout: Profile check error')
    // Don't redirect on profile errors - let client handle it
  }

  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  )
}

export default AppLayout