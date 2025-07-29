'use client'

import React, { createContext, useContext } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtimeSync } from '@/hooks/use-realtime-simple'

// Simple context for realtime status
interface RealtimeContextType {
  isConnected: boolean
  subscriptionCount: number
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

// Simplified provider that automatically handles all realtime subscriptions
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  
  // This single hook handles all realtime subscriptions automatically
  const { isConnected, subscriptionCount } = useRealtimeSync(profile?.gym_id || null)

  const contextValue: RealtimeContextType = {
    isConnected,
    subscriptionCount
  }

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

// Simple hook to get realtime status
export function useRealtimeStatus() {
  const context = useContext(RealtimeContext)
  
  if (!context) {
    throw new Error('useRealtimeStatus must be used within a RealtimeProvider')
  }
  
  return context
}

export default RealtimeProvider 