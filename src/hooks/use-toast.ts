// src/hooks/use-toast.ts

'use client'

import { useToastStore } from '@/stores/toast-store'

/**
 * Hook for toast management - simplified since toasts now show immediately
 * This hook is kept for backward compatibility but is no longer needed
 * Use toastActions directly for immediate toast display
 */
export function useToast() {
  // No longer needed since toasts show immediately via toastActions
  // Kept for backward compatibility
}

/**
 * Hook to get toast actions for manual toast management
 * Use toastActions directly instead for better performance
 */
export function useToastActions() {
  // Use toastActions directly instead of this hook
  const { success, error, info, warning } = useToastStore((state) => ({
    success: state.success,
    error: state.error,
    info: state.info,
    warning: state.warning
  }))
  
  return { success, error, info, warning }
}
