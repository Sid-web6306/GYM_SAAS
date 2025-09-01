'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { toastActions } from '@/stores/toast-store'

export interface QueuedCheckin {
  id: string
  type: 'checkin' | 'checkout'
  timestamp: string
  method?: string
  notes?: string
  checkout_at?: string
}

const QUEUE_STORAGE_KEY = 'member-portal-queue'

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true)
  const [queuedItems, setQueuedItems] = useState<QueuedCheckin[]>([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)

  // Initialize queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setQueuedItems(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      logger.error('Error loading offline queue:', {error})
    }
  }, [])

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queuedItems))
    } catch (error) {
      logger.error('Error saving offline queue:', {error})
    }
  }, [queuedItems])

  // Process queue when online
  const processQueue = useCallback(async () => {
    if (!isOnline || queuedItems.length === 0 || isProcessingQueue) {
      return
    }

    setIsProcessingQueue(true)
    logger.info('Processing offline queue:', { itemCount: queuedItems.length })

    const processedIds: string[] = []
    let successCount = 0
    let errorCount = 0

    for (const item of queuedItems) {
      try {
        const endpoint = item.type === 'checkin' ? '/api/members/checkin' : '/api/members/checkout'
        const body = item.type === 'checkin' 
          ? { method: item.method, notes: item.notes }
          : { checkout_at: item.checkout_at }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })

        if (response.ok) {
          processedIds.push(item.id)
          successCount++
          logger.info('Queue item processed successfully:', { itemId: item.id, type: item.type })
        } else {
          errorCount++
          logger.error('Queue item processing failed:', { 
            itemId: item.id, 
            type: item.type, 
            status: response.status 
          })
        }
      } catch (error) {
        errorCount++
        logger.error('Queue item processing error:', { itemId: item.id, error })
      }
    }

    // Remove processed items from queue
    if (processedIds.length > 0) {
      setQueuedItems(prev => prev.filter(item => !processedIds.includes(item.id)))
    }

    setIsProcessingQueue(false)

    // Show sync results
    if (successCount > 0) {
      toastActions.success(
        'Sync Complete', 
        `${successCount} action${successCount !== 1 ? 's' : ''} synced successfully`
      )
    }

    if (errorCount > 0) {
      toastActions.error(
        'Sync Failed', 
        `${errorCount} action${errorCount !== 1 ? 's' : ''} failed to sync`
      )
    }

  }, [isOnline, queuedItems, isProcessingQueue])

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (online && queuedItems.length > 0) {
        // Process queue when coming back online
        processQueue()
      }
    }

    // Initial check
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [queuedItems.length, processQueue])

  // Add item to queue
  const queueItem = useCallback((item: Omit<QueuedCheckin, 'id' | 'timestamp'>) => {
    const queuedItem: QueuedCheckin = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    }

    setQueuedItems(prev => [...prev, queuedItem])
    
    toastActions.info(
      'Queued for Sync', 
      `${item.type === 'checkin' ? 'Check-in' : 'Check-out'} will sync when online`
    )
    
    logger.info('Item queued for offline sync:', {queuedItem})
    return queuedItem
  }, [])

  // Clear queue (for testing/debugging)
  const clearQueue = useCallback(() => {
    setQueuedItems([])
    logger.info('Offline queue cleared')
  }, [])

  return {
    isOnline,
    queuedItems,
    isProcessingQueue,
    queueItem,
    processQueue,
    clearQueue,
    hasQueuedItems: queuedItems.length > 0
  }
}