import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { RazorpayClient } from '@/services/payments/razorpay-client'

interface PaymentStatusOptions {
  razorpayPaymentId?: string
  razorpaySubscriptionId?: string
  pollingInterval?: number
  maxPollingAttempts?: number
  onSuccess?: () => void
  onError?: (error: string) => void
}

interface PaymentStatus {
  status: 'idle' | 'checking' | 'verified' | 'failed' | 'timeout'
  error: string | null
  attempts: number
  isPolling: boolean
}

/**
 * Hook for checking payment status using Razorpay's built-in capabilities
 * Provides real-time payment verification with automatic polling
 */
export function usePaymentStatus({
  razorpayPaymentId,
  razorpaySubscriptionId,
  pollingInterval = 3000,
  maxPollingAttempts = 10,
  onSuccess,
  onError
}: PaymentStatusOptions = {}) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'idle',
    error: null,
    attempts: 0,
    isPolling: false
  })
  
  const queryClient = useQueryClient()

  /**
   * Check payment status using Razorpay API
   */
  const checkPaymentStatus = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      if (!RazorpayClient.isConfigured()) {
        throw new Error('Razorpay not initialized')
      }

      logger.info('🔍 Checking payment status with Razorpay', { paymentId })

      // Use Razorpay's built-in payment fetch (client-side)
      // Note: This would typically be done on the backend for security
      const response = await fetch(`/api/payments/status/${paymentId}`)
      const result = await response.json()

      if (result.status === 'captured' || result.status === 'authorized') {
        logger.info('✅ Payment verified via status check', { paymentId, status: result.status })
        return true
      } else {
        logger.warn('⚠️ Payment not yet captured', { paymentId, status: result.status })
        return false
      }
    } catch (error) {
      logger.error('❌ Payment status check failed', {
        error: error instanceof Error ? error.message : String(error),
        paymentId
      })
      throw error
    }
  }, [])

  /**
   * Start polling payment status
   */
  const startPolling = useCallback(async (paymentId: string) => {
    if (!paymentId) return

    setPaymentStatus(prev => ({
      ...prev,
      status: 'checking',
      isPolling: true,
      attempts: 0,
      error: null
    }))

    let attempts = 0
    
    const poll = async (): Promise<void> => {
      try {
        attempts++
        setPaymentStatus(prev => ({ ...prev, attempts }))

        const isVerified = await checkPaymentStatus(paymentId)
        
        if (isVerified) {
          setPaymentStatus(prev => ({
            ...prev,
            status: 'verified',
            isPolling: false
          }))

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['subscription-info'] })
          queryClient.invalidateQueries({ queryKey: ['trial-info'] })
          queryClient.invalidateQueries({ queryKey: ['check-subscription-access'] })

          onSuccess?.()
          return
        }

        if (attempts >= maxPollingAttempts) {
          throw new Error(`Payment verification timed out after ${maxPollingAttempts} attempts`)
        }

        // Continue polling
        setTimeout(poll, pollingInterval)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        setPaymentStatus(prev => ({
          ...prev,
          status: attempts >= maxPollingAttempts ? 'timeout' : 'failed',
          error: errorMessage,
          isPolling: false
        }))

        onError?.(errorMessage)
      }
    }

    await poll()
  }, [checkPaymentStatus, maxPollingAttempts, pollingInterval, queryClient, onSuccess, onError])

  /**
   * Manually verify a payment using backend verification
   */
  const verifyPayment = useCallback(async (
    paymentId: string, 
    subscriptionId: string, 
    signature: string
  ): Promise<boolean> => {
    try {
      setPaymentStatus(prev => ({ ...prev, status: 'checking' }))

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_subscription_id: subscriptionId,
          razorpay_signature: signature
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setPaymentStatus(prev => ({ ...prev, status: 'verified', error: null }))
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['subscription-info'] })
        queryClient.invalidateQueries({ queryKey: ['trial-info'] })
        
        onSuccess?.()
        return true
      } else {
        throw new Error(result.error || 'Payment verification failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setPaymentStatus(prev => ({ ...prev, status: 'failed', error: errorMessage }))
      onError?.(errorMessage)
      return false
    }
  }, [queryClient, onSuccess, onError])

  /**
   * Reset payment status
   */
  const resetStatus = useCallback(() => {
    setPaymentStatus({
      status: 'idle',
      error: null,
      attempts: 0,
      isPolling: false
    })
  }, [])

  /**
   * Auto-start polling if payment ID is provided
   */
  useEffect(() => {
    if (razorpayPaymentId && paymentStatus.status === 'idle') {
      startPolling(razorpayPaymentId)
    }
  }, [razorpayPaymentId, razorpaySubscriptionId, paymentStatus.status, startPolling])

  return {
    paymentStatus,
    startPolling,
    verifyPayment,
    resetStatus,
    isChecking: paymentStatus.status === 'checking',
    isVerified: paymentStatus.status === 'verified',
    hasFailed: paymentStatus.status === 'failed' || paymentStatus.status === 'timeout',
    error: paymentStatus.error
  }
}

/**
 * Simplified hook for one-time payment verification
 */
export function usePaymentVerification() {
  const { verifyPayment, paymentStatus, resetStatus } = usePaymentStatus()

  return {
    verifyPayment,
    isVerifying: paymentStatus.status === 'checking',
    isVerified: paymentStatus.status === 'verified',
    error: paymentStatus.error,
    resetStatus
  }
}
