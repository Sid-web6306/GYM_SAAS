'use client'

import { useState, useEffect } from 'react'

// Extend the Window interface
declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent
    MSStream?: unknown
  }
  interface Navigator {
    standalone?: boolean
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Check if app is installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isIOSStandalone = window.navigator.standalone === true
      setIsInstalled(isStandalone || isIOSStandalone)
    }

    // Check network status
    const checkOnline = () => {
      setIsOnline(navigator.onLine)
    }

    // Initial checks
    checkInstalled()
    checkOnline()

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setIsInstallable(true)
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    // Listen for network changes
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isPWACapable = () => {
    // Check if browser supports PWA features
    return (
      'serviceWorker' in navigator &&
      'BeforeInstallPromptEvent' in window
    )
  }

  const getInstallPrompt = () => {
    // This would be stored from the beforeinstallprompt event
    return window.deferredPrompt
  }

  const isIOS = () => {
    const userAgent = window.navigator.userAgent
    return /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
  }

  const isAndroid = () => {
    const userAgent = window.navigator.userAgent
    return /Android/.test(userAgent)
  }

  const getDisplayMode = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone'
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui'
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen'
    }
    return 'browser'
  }

  const requestPersistentStorage = async () => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const persistent = await navigator.storage.persist()
        return persistent
      } catch (error) {
        console.error('Error requesting persistent storage:', error)
        return false
      }
    }
    return false
  }

  const getStorageEstimate = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return estimate
      } catch (error) {
        console.error('Error getting storage estimate:', error)
        return null
      }
    }
    return null
  }

  return {
    isInstalled,
    isInstallable,
    isOnline,
    isPWACapable: isPWACapable(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    displayMode: getDisplayMode(),
    getInstallPrompt,
    requestPersistentStorage,
    getStorageEstimate,
  }
} 