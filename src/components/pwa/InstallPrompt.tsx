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
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstallPrompt(true)
        }
      }, 30000) // Show after 30 seconds
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [mounted, isInstalled])

  // Don't render anything during SSR or before mount
  if (!mounted) {
    return null
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return

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
    if (dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
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
            : 'Install Gym SaaS for quick access and offline use'}
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
              Install
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