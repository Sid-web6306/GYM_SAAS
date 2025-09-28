'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useMemberProfile, useMemberStatus, useMemberStats } from '@/hooks/use-member-portal'

interface PortalDataContextType {
  profile: ReturnType<typeof useMemberProfile>
  status: ReturnType<typeof useMemberStatus>
  stats: ReturnType<typeof useMemberStats>
}

const PortalDataContext = createContext<PortalDataContextType | null>(null)

export function PortalDataProvider({ children }: { children: ReactNode }) {
  // Centralized data fetching - only called once at the provider level
  const profile = useMemberProfile()
  const status = useMemberStatus()
  const stats = useMemberStats()

  return (
    <PortalDataContext.Provider value={{ profile, status, stats }}>
      {children}
    </PortalDataContext.Provider>
  )
}

export function usePortalData() {
  const context = useContext(PortalDataContext)
  if (!context) {
    throw new Error('usePortalData must be used within PortalDataProvider')
  }
  return context
}
