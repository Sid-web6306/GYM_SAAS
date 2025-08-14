'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const controller = new AbortController()
    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch {
        // Swallow registration errors silently
      }
    }

    // Defer a tick to avoid competing with Next.js hydration
    const id = setTimeout(register, 0)
    return () => {
      clearTimeout(id)
      controller.abort()
    }
  }, [])

  return null
}


