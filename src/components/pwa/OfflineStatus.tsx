'use client'

import { useState, useEffect } from 'react'
import { 
  DynamicCard,
  DynamicCardContent,
  DynamicWifiOff,
  DynamicWifi
} from '@/lib/dynamic-imports'

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (!mounted || typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }

    // Set initial state
    setIsOnline(navigator.onLine)

    // Listen for network changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [mounted])

  // Auto-hide the offline message after coming back online
  useEffect(() => {
    if (isOnline && showOfflineMessage) {
      const timer = setTimeout(() => {
        setShowOfflineMessage(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showOfflineMessage])

  // Don't render during SSR
  if (!mounted || (!showOfflineMessage && isOnline)) return null

  return (
    <DynamicCard className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 shadow-lg transition-all duration-300 ${
      isOnline 
        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
        : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
    }`}>
      <DynamicCardContent className="p-4">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <>
              <DynamicWifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Back Online
                </p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Connection restored
                </p>
              </div>
            </>
          ) : (
            <>
              <DynamicWifiOff className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  You&apos;re Offline
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  Some features may not work
                </p>
              </div>
            </>
          )}
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )
} 