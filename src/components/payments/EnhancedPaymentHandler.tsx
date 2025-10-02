'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { PaymentStatusChecker } from './PaymentStatusChecker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PaymentResponse {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

interface EnhancedPaymentHandlerProps {
  isOpen: boolean
  onClose: () => void
  paymentResponse?: PaymentResponse
}

export function EnhancedPaymentHandler({ 
  isOpen, 
  onClose, 
  paymentResponse 
}: EnhancedPaymentHandlerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isClosing, setIsClosing] = useState(false)

  if (!paymentResponse) return null

  const handleSuccess = () => {
    logger.info('✅ Payment verification completed successfully')
    
    // Invalidate all relevant queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['subscription-info'] })
    queryClient.invalidateQueries({ queryKey: ['trial-info'] })
    queryClient.invalidateQueries({ queryKey: ['check-subscription-access'] })
    queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
    
    // Set closing state and redirect after a brief delay
    setIsClosing(true)
    
    setTimeout(() => {
      onClose()
      router.push('/dashboard?subscription=success')
    }, 2000)
  }

  const handleError = (error: string) => {
    logger.error('❌ Payment verification failed in handler', { error })
    
    // Show error toast (PaymentStatusChecker already shows one, but this is for additional context)
    toast.error('Payment Verification Failed', {
      description: 'Your payment may still be processing. Please check your dashboard or contact support.',
      duration: 5000,
      action: {
        label: 'Go to Dashboard',
        onClick: () => {
          onClose()
          router.push('/dashboard')
        }
      }
    })
  }

  const handleManualClose = () => {
    if (isClosing) return // Prevent closing during success flow
    
    logger.info('Payment verification dialog closed manually by user')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleManualClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                Verifying Payment
              </DialogTitle>
              <DialogDescription className="mt-1">
                Please wait while we verify your payment with Razorpay
              </DialogDescription>
            </div>
            {!isClosing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualClose}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <PaymentStatusChecker
            razorpayPaymentId={paymentResponse.razorpay_payment_id}
            razorpaySubscriptionId={paymentResponse.razorpay_subscription_id}
            razorpaySignature={paymentResponse.razorpay_signature}
            onSuccess={handleSuccess}
            onError={handleError}
            maxRetries={3}
            retryInterval={2000}
          />
        </div>
        
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Payment ID:</span>
            <span className="font-mono">
              {paymentResponse.razorpay_payment_id.substring(0, 15)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span>Subscription ID:</span>
            <span className="font-mono">
              {paymentResponse.razorpay_subscription_id.substring(0, 15)}...
            </span>
          </div>
          <p className="text-center mt-2 text-xs">
            Using Razorpay&apos;s built-in signature verification
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Enhanced payment handler function for use in Razorpay checkout
 * Returns a promise that resolves when verification is complete
 */
export function createEnhancedPaymentHandler(
  showDialog: (paymentResponse: PaymentResponse) => void
) {
  return async function handlePaymentSuccess(response: PaymentResponse) {
    try {
      logger.info('💳 Payment completed by user', {
        paymentId: response.razorpay_payment_id,
        subscriptionId: response.razorpay_subscription_id,
        hasSignature: !!response.razorpay_signature
      })

      // Show the verification dialog
      showDialog(response)
      
    } catch (error) {
      logger.error('❌ Error in payment handler', {
        error: error instanceof Error ? error.message : String(error),
        paymentResponse: response
      })
      
      toast.error('Payment processing error', {
        description: 'Please contact support if your payment was deducted'
      })
      
      throw error
    }
  }
}

/**
 * Handler for when user dismisses the Razorpay modal
 * This is called when user actively cancels the payment
 */
export function createPaymentDismissHandler(onDismiss?: () => void) {
  return function handlePaymentDismiss() {
    logger.info('💸 Payment modal dismissed by user')
    
    toast.info('Payment cancelled', {
      description: 'You can try again whenever you\'re ready'
    })
    
    onDismiss?.()
  }
}

/**
 * Handler for when Razorpay modal is hidden/closed
 * This is called whenever the modal closes (success, failure, or cancellation)
 * Note: This should only handle cleanup, not show error messages
 */
export function createModalCleanupHandler(onCleanup?: () => void) {
  return function handleModalHidden() {
    logger.info('🔒 Payment modal closed - cleanup triggered')
    onCleanup?.()
  }
}

/**
 * Handler for payment errors/failures from Razorpay
 * This handles actual payment errors with proper error codes
 * 
 * Note: Razorpay doesn't currently expose an 'onError' callback in the modal options.
 * This handler is provided for future use or if Razorpay adds error callback support.
 * 
 * Common Razorpay error codes:
 * - BAD_REQUEST_ERROR: Invalid payment request
 * - GATEWAY_ERROR: Payment gateway issues
 * - SERVER_ERROR: Razorpay server issues
 * - NETWORK_ERROR: Network connectivity issues
 * 
 * Usage (if Razorpay adds onError support):
 * ```
 * modal: {
 *   onError: createPaymentErrorHandler(() => setSelectedPlan(null))
 * }
 * ```
 */
export function createPaymentErrorHandler(onError?: () => void) {
  return function handlePaymentError(error: { 
    error: { 
      code: string
      description: string
      source?: string
      step?: string
      reason?: string
      metadata?: Record<string, unknown>
    } 
  }) {
    logger.error('❌ Payment error from Razorpay', { 
      error,
      errorCode: error?.error?.code,
      errorDescription: error?.error?.description,
      errorSource: error?.error?.source,
      errorStep: error?.error?.step,
      errorReason: error?.error?.reason
    })
    
    const errorCode = error?.error?.code
    const errorDescription = error?.error?.description
    
    // Handle specific error codes from Razorpay
    switch (errorCode) {
      case 'BAD_REQUEST_ERROR':
        toast.error('Invalid Request', {
          description: errorDescription || 'The payment request was invalid. Please try again.'
        })
        break
        
      case 'GATEWAY_ERROR':
        toast.error('Gateway Error', {
          description: errorDescription || 'Payment gateway is experiencing issues. Please try again later.'
        })
        break
        
      case 'SERVER_ERROR':
        toast.error('Server Error', {
          description: errorDescription || 'Our servers are experiencing issues. Please try again later.'
        })
        break
        
      case 'NETWORK_ERROR':
        toast.error('Network Error', {
          description: 'Please check your internet connection and try again.'
        })
        break
        
      default:
        toast.error('Payment Failed', {
          description: errorDescription || 'An unexpected error occurred. Please try again or contact support.'
        })
    }
    
    onError?.()
  }
}
