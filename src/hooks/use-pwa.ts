'use client'

import { useState, useEffect, useCallback } from 'react'
import { BeforeInstallPromptEvent } from '@/types/pwa'

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)

  const checkInstalled = useCallback(() => {
    if (typeof window === 'undefined') return false
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)
    return isStandalone
  }, [])

  const checkDismissed = useCallback(() => {
    if (typeof window === 'undefined') return true
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) return false
    return Date.now() - parseInt(dismissedAt) < DISMISS_DURATION
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial checks
    const installed = checkInstalled()
    setIsOnline(navigator.onLine)

    // Check if we already have a deferred prompt from a previous component mount
    // or from the early-catch script in layout.tsx
    const existingPrompt = window.deferredPrompt
    if (existingPrompt) {
      console.log('usePWA: Found existing deferredPrompt')
      setDeferredPrompt(existingPrompt as BeforeInstallPromptEvent)
      if (!installed && !checkDismissed()) {
        // Show after a short delay for better UX
        const showTimeout = setTimeout(() => setShowPrompt(true), 2000)
        return () => clearTimeout(showTimeout)
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      window.deferredPrompt = promptEvent
      setDeferredPrompt(promptEvent)
      
      if (!checkInstalled() && !checkDismissed()) {
        setTimeout(() => setShowPrompt(true), 3000)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      window.deferredPrompt = null
      setDeferredPrompt(null)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // iOS/Fallback Timer
    const timer = setTimeout(() => {
      if (!checkInstalled() && !checkDismissed() && !showPrompt) {
        setShowPrompt(true)
      }
    }, 10000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(timer)
    }
  }, [checkInstalled, checkDismissed, showPrompt])

  const install = async () => {
    if (!deferredPrompt) {
      console.warn('usePWA: No deferredPrompt available for installation')
      return false
    }
    
    try {
      console.log('usePWA: Triggering native install prompt')
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`usePWA: User choice outcome: ${outcome}`)
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setShowPrompt(false)
        window.deferredPrompt = null
        setDeferredPrompt(null)
        return true
      }
    } catch (error) {
      console.error('usePWA: Install error:', error)
    }
    return false
  }

  const dismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  const isIOS = () => {
    if (typeof window === 'undefined') return false
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent) && !window.MSStream
  }

  const getDisplayMode = () => {
    if (typeof window === 'undefined') return 'browser'
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui'
    if ((window.navigator as any).standalone) return 'standalone'
    return 'browser'
  }

  return {
    isInstalled,
    isOnline,
    showPrompt,
    install,
    dismiss,
    isIOS: isIOS(),
    displayMode: getDisplayMode(),
    canPrompt: !!deferredPrompt
  }
} 