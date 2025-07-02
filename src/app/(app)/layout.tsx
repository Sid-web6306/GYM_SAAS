// src/app/(app)/layout.tsx

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import React from 'react'
import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth.actions' // We will create this action next

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirect('/login')
  }

  // Fetch profile data to get the gym name and user name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, gyms(name)') // This is a join to the gyms table!
    .eq('id', user.id)
    .single();
  
  const gymName = profile?.gyms?.name || 'My Gym';
  const userName = profile?.full_name || user.email;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-background border-b sticky top-0 z-10">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="font-bold text-lg">{gymName}</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userName}</span>
            <form action={logout}>
              <Button variant="outline" size="sm">Log Out</Button>
            </form>
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

export default AppLayout