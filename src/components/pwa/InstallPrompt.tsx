'use client'

import { useState, useEffect } from 'react'
import { 
  DynamicButton,
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicX,
  DynamicDownload,
  DynamicSmartphone
} from '@/lib/dynamic-imports'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Extend the Navigator interface
declare global {
  interface Navigator {
    standalone?: boolean
  }
  interface Window {
    MSStream?: unknown
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasPromptEvent, setHasPromptEvent] = useState(false)

  // Prevent SSR issues
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Only run on client side
    if (!mounted || typeof window === 'undefined') return

    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return
      }
      
      // Check if running in PWA mode
      if (window.navigator.standalone === true) {
        setIsInstalled(true)
        return
      }
    }

    // Check if it's iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream
      setIsIOS(isIOSDevice)
    }

    checkInstalled()
    checkIOS()

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setHasPromptEvent(true)
      
      // Store the prompt globally for access
      window.deferredPrompt = promptEvent
      
      // Show install prompt after a shorter delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true)
        }
      }, 5000) // Show after 5 seconds
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Fallback: Show prompt even without beforeinstallprompt event
    // This helps with browsers that don't fire the event or when conditions aren't met
    const fallbackTimer = setTimeout(() => {
      if (!isInstalled && !hasPromptEvent && !showInstallPrompt) {
        // Check if we should show the fallback prompt
        const isPWACapable = 'serviceWorker' in navigator && window.location.protocol === 'https:'
        const isNotStandalone = !window.matchMedia('(display-mode: standalone)').matches
        
        if (isPWACapable && isNotStandalone) {
          setShowInstallPrompt(true)
        }
      }
    }, 8000) // Show fallback after 8 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(fallbackTimer)
    }
  }, [mounted, isInstalled, deferredPrompt, showInstallPrompt, hasPromptEvent])

  // Don't render anything during SSR or before mount
  if (!mounted) {
    return null
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Use native install prompt if available
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          setShowInstallPrompt(false)
          setDeferredPrompt(null)
        }
      } catch (error) {
        console.error('Error installing PWA:', error)
      }
    } else {
      // For browsers without native install prompt, just dismiss and let user find browser's install option
      setShowInstallPrompt(false)
      // The user can look for the browser's native install option in the address bar or menu
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }
  }

  // Don't show if already installed
  if (isInstalled) return null

  // Don't show if user dismissed recently (only check on client side)
  if (typeof window !== 'undefined') {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed')
    if (dismissedTime && Date.now() - parseInt(dismissedTime) < 2 * 60 * 60 * 1000) {
      return null
    }
  }

  if (!showInstallPrompt) return null

  return (
    <DynamicCard className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 border-primary bg-background shadow-lg">
      <DynamicCardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <DynamicCardTitle className="text-lg flex items-center gap-2">
            <DynamicSmartphone className="h-5 w-5" />
            Install App
          </DynamicCardTitle>
          <DynamicButton
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0"
          >
            <DynamicX className="h-4 w-4" />
          </DynamicButton>
        </div>
        <DynamicCardDescription>
          {isIOS 
            ? 'Tap the share button and select "Add to Home Screen"' 
            : deferredPrompt 
              ? 'Install Centric Fit for quick access and offline use'
              : 'Look for the install icon in your browser\'s address bar or menu'}
        </DynamicCardDescription>
      </DynamicCardHeader>
      <DynamicCardContent className="pt-0">
        {isIOS ? (
          <div className="text-sm text-muted-foreground">
            <p>1. Tap the share button (□↑) in Safari</p>
            <p>2. Select &quot;Add to Home Screen&quot;</p>
            <p>3. Tap &quot;Add&quot; to install</p>
          </div>
        ) : (
          <div className="flex gap-3">
            <DynamicButton onClick={handleInstall} className="flex-1" size="sm">
              <DynamicDownload className="h-4 w-4 mr-2" />
              {deferredPrompt ? 'Install' : 'Got it'}
            </DynamicButton>
            <DynamicButton onClick={handleDismiss} variant="outline" size="sm">
              Later
            </DynamicButton>
          </div>
        )}
      </DynamicCardContent>
    </DynamicCard>
  )
} 