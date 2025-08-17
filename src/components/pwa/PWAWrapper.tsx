'use client'

import { 
  DynamicInstallPrompt as InstallPrompt,
  DynamicOfflineStatus as OfflineStatus,
  // DynamicUpdatePrompt as UpdatePrompt
} from '@/lib/dynamic-imports'

export function PWAWrapper() {
  return (
    <>
      <OfflineStatus />
      <InstallPrompt />
      {/* <UpdatePrompt  intervalMs={1000}/> */}
    </>
  )
} 