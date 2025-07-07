// src/app/(app)/layout.tsx

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'
import ClientLayout from './client-layout'

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient()

  // Server-side auth check - just verify user exists
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // If no user, redirect to login (server-side redirect for SEO/performance)
  if (!user || userError) {
    console.log('AppLayout: No authenticated user, redirecting to login')
    return redirect('/login')
  }

  // Get basic profile info for initial render (TanStack Query will handle updates)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, gym_id, gyms(name)')
    .eq('id', user.id)
    .single();
  
  // Server-side onboarding check
  if (!profile?.gym_id) {
    console.log('AppLayout: No gym setup, redirecting to onboarding')
    return redirect('/onboarding')
  }

  return (
    <ClientLayout>
      {children}
    </ClientLayout>
  )
}

export default AppLayout