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
}

// Helper to create a unique key for deduplication
const createToastKey = (type: ToastType, title: string, description: string) => {
  return `${type}:${title}:${description}`
}

export const useToastStore = create<ToastStore>((set, get) => ({
  recentToasts: new Map(),
  
  // Internal helper with deduplication
  _showToast: (type: ToastType, title: string, description: string) => {
    const state = get()
    const toastKey = createToastKey(type, title, description)
    const now = Date.now()
    const lastShown = state.recentToasts.get(toastKey)
    
    // Prevent duplicate toasts within 3 seconds
    if (lastShown && now - lastShown < 3000) {
      console.log('Preventing duplicate toast:', { type, title, description })
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
      description,
      duration: 8000,
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
