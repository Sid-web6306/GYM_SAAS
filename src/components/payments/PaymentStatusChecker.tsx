'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface PaymentStatusCheckerProps {
  razorpayPaymentId: string
  razorpaySubscriptionId: string
  razorpaySignature: string
  onSuccess?: () => void
  onError?: (error: string) => void
  maxRetries?: number
  retryInterval?: number
}

type PaymentStatus = 'pending' | 'verifying' | 'success' | 'failed' | 'timeout'

export function PaymentStatusChecker({
  razorpayPaymentId,
  razorpaySubscriptionId,
  razorpaySignature,
  onSuccess,
  onError,
  maxRetries = 3,
  retryInterval = 2000
}: PaymentStatusCheckerProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [attempts, setAttempts] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [isRetrying, setIsRetrying] = useState(false)

  // Verify payment using Razorpay's built-in verification
  const verifyPayment = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('verifying')
      
      logger.info('🔍 Verifying payment with Razorpay...', {
        paymentId: razorpayPaymentId,
        subscriptionId: razorpaySubscriptionId,
        attempt: attempts + 1
      })

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayPaymentId,
          razorpay_subscription_id: razorpaySubscriptionId,
          razorpay_signature: razorpaySignature
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setStatus('success')
        logger.info('✅ Payment verification successful', { result })
        
        // Show success notification
        toast.success('Payment verified successfully! 🎉', {
          description: 'Your subscription is now active'
        })
        
        onSuccess?.()
        return true
      } else {
        throw new Error(result.error || 'Payment verification failed')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('❌ Payment verification failed', {
        error: errorMsg,
        paymentId: razorpayPaymentId,
        attempt: attempts + 1
      })
      
      setErrorMessage(errorMsg)
      return false
    }
  }, [razorpayPaymentId, razorpaySubscriptionId, razorpaySignature, attempts, onSuccess])

  // Retry verification with exponential backoff
  const retryVerification = useCallback(async () => {
    if (attempts >= maxRetries) {
      setStatus('failed')
      const finalError = `Payment verification failed after ${maxRetries} attempts. Please contact support.`
      setErrorMessage(finalError)
      onError?.(finalError)
      
      toast.error('Payment verification failed', {
        description: 'Please contact support for assistance'
      })
      return
    }

    setIsRetrying(true)
    setAttempts(prev => prev + 1)
    
    // Exponential backoff: 2s, 4s, 8s...
    const delay = retryInterval * Math.pow(2, attempts)
    
    logger.info(`⏱️ Retrying payment verification in ${delay}ms...`, {
      attempt: attempts + 1,
      maxRetries,
      delay
    })
    
    setTimeout(async () => {
      const success = await verifyPayment()
      setIsRetrying(false)
      
      if (!success) {
        // Will retry again on next cycle unless max attempts reached
        setTimeout(retryVerification, 1000)
      }
    }, delay)
  }, [attempts, maxRetries, retryInterval, verifyPayment, onError])

  // Start verification process
  useEffect(() => {
    if (status === 'pending') {
      verifyPayment().then(success => {
        if (!success) {
          retryVerification()
        }
      })
    }
  }, [status, verifyPayment, retryVerification])

  // Auto-timeout after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status !== 'success') {
        setStatus('timeout')
        setErrorMessage('Payment verification timed out')
        onError?.('Payment verification timed out. Please check your payment status or contact support.')
      }
    }, 30000)

    return () => clearTimeout(timeout)
  }, [status, onError])

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'verifying':
        return <Clock className="h-6 w-6 text-blue-500 animate-pulse" />
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />
      case 'failed':
      case 'timeout':
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'pending':
        return 'Initializing payment verification...'
      case 'verifying':
        return isRetrying 
          ? `Retrying verification (${attempts}/${maxRetries})...`
          : 'Verifying payment with Razorpay...'
      case 'success':
        return 'Payment verified successfully!'
      case 'failed':
        return `Verification failed: ${errorMessage}`
      case 'timeout':
        return 'Verification timed out. Please check your payment status.'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card rounded-lg border">
      <div className="flex items-center gap-3 mb-4">
        {getStatusIcon()}
        {(status === 'verifying' || isRetrying) && (
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      
      <p className="text-center font-medium text-foreground mb-2">
        {getStatusMessage()}
      </p>
      
      {status === 'verifying' && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-full bg-muted rounded-full h-2 max-w-xs">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500 animate-pulse"
              style={{ width: `${Math.min(((attempts + 1) / maxRetries) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Using Razorpay&apos;s built-in verification
          </p>
        </div>
      )}
      
      {(status === 'failed' || status === 'timeout') && (
        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Payment ID: {razorpayPaymentId.substring(0, 10)}...
          </p>
          <p className="text-xs text-muted-foreground">
            If payment was successful, it may take a few minutes to reflect.
          </p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-center mt-2">
          <p className="text-sm text-green-600">
            Subscription activated successfully!
          </p>
        </div>
      )}
    </div>
  )
}
