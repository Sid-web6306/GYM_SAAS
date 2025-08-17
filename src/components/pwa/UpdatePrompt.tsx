'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DynamicCard, DynamicCardContent } from '@/lib/dynamic-imports'

function getSignature(headers: Headers): string {
  const etag = headers.get('etag')
  const lastModified = headers.get('last-modified')
  // Use strongest validator first (ETag), fallback to Last-Modified
  return etag ?? lastModified ?? ''
}

async function headSignature(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (!res.ok) return ''
    return getSignature(res.headers)
  } catch {
    return ''
  }
}

function getSnoozeUntil(): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem('pwa-update-snooze-until')
  return raw ? Number(raw) : 0
}

function setSnoozeFor(ms: number) {
  if (typeof window === 'undefined') return
  const until = Date.now() + ms
  localStorage.setItem('pwa-update-snooze-until', String(until))
}

async function getBuildIdSignature(): Promise<string> {
  try {
    const res = await fetch('/_next/static/BUILD_ID', { cache: 'no-store' })
    if (!res.ok) return ''
    const text = (await res.text()).trim()
    return text || ''
  } catch {
    return ''
  }
}

function getStoredSig(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pwa-version-sig')
}

function setStoredSig(sig: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pwa-version-sig', sig)
}

export function UpdatePrompt({
  intervalMs = 60_000,
  snoozeMs = 4 * 60 * 60 * 1000, // 4 hours
}: {
  intervalMs?: number
  snoozeMs?: number
}) {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [initialSig, setInitialSig] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shouldSnooze = useMemo(() => getSnoozeUntil() > Date.now(), [])

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const latestSigRef = useRef<string>('')

  const schedule = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(async () => {
      let sig = await getBuildIdSignature()
      if (!sig) sig = await headSignature('/sw.js')
      latestSigRef.current = sig
      if (initialSig && sig && sig !== initialSig) {
        if (!getSnoozeUntil() || Date.now() >= getSnoozeUntil()) {
          setUpdateAvailable(true)
        }
      }
      schedule()
    }, intervalMs)
  }, [initialSig, intervalMs])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Prefer stored baseline across reloads so users still see the banner if they deferred
      const stored = getStoredSig()
      const sig = stored || (await getBuildIdSignature()) || (await headSignature('/sw.js')) || ''
      if (!cancelled) setInitialSig(sig)
      if (!stored && sig) setStoredSig(sig)
      schedule()
    })()
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      clearTimer()
    }
  }, [schedule])

  if (!updateAvailable || shouldSnooze) return null

  return (
    <DynamicCard className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[1000] shadow-lg border-primary bg-background">
      <DynamicCardContent className="p-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          A new version is available.
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { if (latestSigRef.current) setStoredSig(latestSigRef.current); location.reload() }}>Reload</Button>
          <Button size="sm" variant="outline" onClick={() => { setSnoozeFor(snoozeMs); setUpdateAvailable(false) }}>Later</Button>
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )
}


