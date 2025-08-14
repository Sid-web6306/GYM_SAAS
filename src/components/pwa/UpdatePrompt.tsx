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

export function UpdatePrompt({
  checkUrl = '/sw.js',
  intervalMs = 60_000,
  snoozeMs = 4 * 60 * 60 * 1000, // 4 hours
}: {
  checkUrl?: string
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

  const schedule = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(async () => {
      const sig = await headSignature(checkUrl)
      if (initialSig && sig && sig !== initialSig) {
        if (!getSnoozeUntil() || Date.now() >= getSnoozeUntil()) {
          setUpdateAvailable(true)
        }
      }
      schedule()
    }, intervalMs)
  }, [checkUrl, initialSig, intervalMs])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const sig = await headSignature(checkUrl)
      if (!cancelled) setInitialSig(sig || '')
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
  }, [checkUrl, schedule])

  if (!updateAvailable || shouldSnooze) return null

  return (
    <DynamicCard className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[1000] shadow-lg border-primary bg-background">
      <DynamicCardContent className="p-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          A new version is available.
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => location.reload()}>Reload</Button>
          <Button size="sm" variant="outline" onClick={() => { setSnoozeFor(snoozeMs); setUpdateAvailable(false) }}>Later</Button>
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )
}


