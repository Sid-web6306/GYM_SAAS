'use client'

import { 
  DynamicInstallPrompt as InstallPrompt,
  DynamicOfflineStatus as OfflineStatus
} from '@/lib/dynamic-imports'

export function PWAWrapper() {
  return (
    <>
      <OfflineStatus />
      <InstallPrompt />
    </>
  )
} 