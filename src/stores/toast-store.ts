// src/stores/toast-store.ts

import { create } from 'zustand'
import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastStore {
  // Track recent toasts to prevent duplicates
  recentToasts: Map<string, number>
  
  // Actions for immediate toast display
  success: (title: string, description: string) => void
  error: (title: string, description: string) => void
  info: (title: string, description: string) => void
  warning: (title: string, description: string) => void
  
  // Internal helper
  _showToast: (type: ToastType, title: string, description: string) => void
  _sanitize: (text: string) => string
}

// Helper to create a unique key for deduplication
const createToastKey = (type: ToastType, title: string, description: string) => {
  return `${type}:${title}:${description}`
}

export const useToastStore = create<ToastStore>((set, get) => ({
  recentToasts: new Map(),
  
  // Basic sanitizer to avoid leaking sensitive data in UI toasts
  // - Masks common secret keys/tokens/passwords
  // - Masks email addresses
  // - Truncates overly long payloads
  _sanitize(text: string) {
    if (!text) return ''
    let sanitized = String(text)

    // Mask common secrets in key=value or JSON formats
    const sensitiveKeys = [
      'access_token', 'refresh_token', 'authorization', 'api_key', 'apikey',
      'secret', 'client_secret', 'password', 'session', 'sessionid', 'session_id'
    ]
    const keyEqVal = new RegExp(`(?:${sensitiveKeys.join('|')})=([^&\n\r\s]+)`, 'gi')
    const keyJsonVal = new RegExp(`"(?:${sensitiveKeys.join('|')})"\s*:\s*"[^"]+"`, 'gi')
    sanitized = sanitized.replace(keyEqVal, (m) => m.replace(/=.*/, '=***'))
    sanitized = sanitized.replace(keyJsonVal, (m) => m.replace(/:\s*"[^"]+"/, ': "***"'))

    // Mask email addresses like j***@domain.com
    sanitized = sanitized.replace(/\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, '$1***$2')

    // Truncate very long strings
    const MAX_LEN = 300
    if (sanitized.length > MAX_LEN) {
      sanitized = sanitized.slice(0, MAX_LEN) + '…'
    }
    return sanitized
  },

  // Internal helper with deduplication
  _showToast: (type: ToastType, title: string, description: string) => {
    const state = get()
    const toastKey = createToastKey(type, title, description)
    const now = Date.now()
    const lastShown = state.recentToasts.get(toastKey)
    
    // Prevent duplicate toasts within 3 seconds
    if (lastShown && now - lastShown < 3000) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Preventing duplicate toast:', { type, title /* description intentionally omitted */ })
      }
      return
    }
    
    // Update recent toasts tracking
    const newRecentToasts = new Map(state.recentToasts)
    newRecentToasts.set(toastKey, now)
    
    // Clean up old entries (older than 10 seconds)
    for (const [key, time] of newRecentToasts.entries()) {
      if (now - time > 10000) {
        newRecentToasts.delete(key)
      }
    }
    
    set({ recentToasts: newRecentToasts })
    
    // Show the toast
    const toastOptions = {
      description: state._sanitize(description),
      duration: 3000,
    }
    
    switch (type) {
      case 'success':
        toast.success(title, toastOptions)
        break
      case 'error':
        toast.error(title, toastOptions)
        break
      case 'info':
        toast.info(title, toastOptions)
        break
      case 'warning':
        toast.warning(title, toastOptions)
        break
    }
  },
  
  // Public toast methods using the internal helper
  success: (title, description) => {
    get()._showToast('success', title, description)
  },
  
  error: (title, description) => {
    get()._showToast('error', title, description)
  },
  
  info: (title, description) => {
    get()._showToast('info', title, description)
  },
  
  warning: (title, description) => {
    get()._showToast('warning', title, description)
  }
}))

// Export convenience functions for immediate toast display
export const toastActions = {
  success: (title: string, description: string) => {
    useToastStore.getState().success(title, description)
  },
  error: (title: string, description: string) => {
    useToastStore.getState().error(title, description)
  },
  info: (title: string, description: string) => {
    useToastStore.getState().info(title, description)
  },
  warning: (title: string, description: string) => {
    useToastStore.getState().warning(title, description)
  },
  // Add a promise toast helper for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return toast.promise(promise, messages)
  }
}
