// src/stores/toast-store.ts

import { create } from 'zustand'
import { toast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastStore {
  // Actions for immediate toast display
  success: (title: string, description: string) => void
  error: (title: string, description: string) => void
  info: (title: string, description: string) => void
  warning: (title: string, description: string) => void
}

export const useToastStore = create<ToastStore>(() => ({
  // Immediate toast methods using Sonner with custom duration
  success: (title, description) => {
    toast.success(title, { 
      description,
      duration: 4000,
    })
  },
  
  error: (title, description) => {
    toast.error(title, { 
      description,
      duration: 6000, // Errors stay longer
    })
  },
  
  info: (title, description) => {
    toast.info(title, { 
      description,
      duration: 4000,
    })
  },
  
  warning: (title, description) => {
    toast.warning(title, { 
      description,
      duration: 5000, // Warnings stay a bit longer
    })
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
