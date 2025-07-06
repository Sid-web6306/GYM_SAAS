'use client'

import { useEffect } from 'react'
import { initializeStores } from '@/stores'

interface StoreProviderProps {
  children: React.ReactNode
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  useEffect(() => {
    // Initialize stores on app load
    initializeStores().catch(console.error)
  }, [])

  return <>{children}</>
}