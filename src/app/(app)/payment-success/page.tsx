'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Download, ArrowLeft, Receipt, FileText, Loader2, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments'
import { toast } from 'sonner'
import Link from 'next/link'

interface PaymentSuccessData {
  sessionId: string
  subscriptionId?: string
  invoiceId?: string
  amount?: number
  planName?: string
  billingCycle?: string
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentSubscription } = useSimplifiedPaymentSystem()
  
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null)
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false)
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const sessionId = searchParams?.get('session_id')
  const paymentIntentId = searchParams?.get('payment_intent')

  useEffect(() => {
    if (!sessionId && !paymentIntentId) {
      // Redirect to dashboard if no session information
      router.replace('/dashboard')
      return
    }

    const verifyPaymentSession = async () => {
      try {
        setIsVerifying(true)
        
        // Fetch payment session details from Stripe
        const response = await fetch('/api/verify-payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            paymentIntentId 
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setPaymentData(data)
          setVerificationError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          const errorMessage = errorData.error || 'Unable to verify payment session'
          setVerificationError(errorMessage)
          toast.error(errorMessage)
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
        const errorMessage = 'Error verifying payment details'
        setVerificationError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPaymentSession()
    
    // Note: Removed explicit refresh() call as webhook processing and real-time 
    // subscriptions will automatically update the data when payment succeeds
  }, [sessionId, paymentIntentId, router])

  const downloadInvoice = async () => {
    if (!paymentData?.invoiceId && !paymentData?.subscriptionId) {
      toast.error('Invoice not available')
      return
    }

    setIsLoadingInvoice(true)
    try {
      const response = await fetch('/api/download-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: paymentData.invoiceId,
          subscriptionId: paymentData.subscriptionId,
          sessionId: paymentData.sessionId
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${paymentData.sessionId || 'subscription'}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Invoice downloaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to download invoice')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Error downloading invoice')
    } finally {
      setIsLoadingInvoice(false)
    }
  }

  const downloadReceipt = async () => {
    if (!paymentData?.sessionId) {
      toast.error('Receipt not available')
      return
    }

    setIsLoadingReceipt(true)
    try {
      const response = await fetch('/api/download-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: paymentData.sessionId,
          paymentIntentId,
          subscriptionId: paymentData.subscriptionId
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${paymentData.sessionId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('Receipt downloaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to download receipt')
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
      toast.error('Error downloading receipt')
    } finally {
      setIsLoadingReceipt(false)
    }
  }

  const retryVerification = () => {
    setIsVerifying(true)
    setVerificationError(null)
    setPaymentData(null)
    
    const verifyPaymentSession = async () => {
      try {
        setIsVerifying(true)
        
        const response = await fetch('/api/verify-payment-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            paymentIntentId 
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setPaymentData(data)
          setVerificationError(null)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          const errorMessage = errorData.error || 'Unable to verify payment session'
          setVerificationError(errorMessage)
          toast.error(errorMessage)
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
        const errorMessage = 'Error verifying payment details'
        setVerificationError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPaymentSession()
  }

  if (isVerifying) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-lg font-semibold mb-2">Verifying Payment</h2>
          <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
        </div>
      </div>
    )
  }

  // Show error state if verification failed
  if (verificationError && !paymentData) {
    return (
      <div className="min-h-[90vh] bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back to Dashboard Button */}
          <div className="mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Error Header */}
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center mb-4">
                <div className="rounded-full bg-red-100 dark:bg-red-800/50 p-3">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-900 dark:text-red-200 mb-2">
                  Payment Verification Failed
                </h1>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  We couldn&apos;t verify your payment session. This could be due to an expired link or invalid session.
                </p>
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                    Error: {verificationError}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What can you do?</CardTitle>
              <CardDescription>
                Try these options to resolve the issue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Retry Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      Sometimes verification fails due to temporary issues. Try again.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Check Your Email</h4>
                    <p className="text-sm text-muted-foreground">
                      Look for a payment confirmation email from Stripe or our system.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium">Contact Support</h4>
                    <p className="text-sm text-muted-foreground">
                      If the problem persists, our support team can help verify your payment manually.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={retryVerification}
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Verification
                </Button>

                <Link href="/upgrade" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Try Payment Again
                  </Button>
                </Link>
                
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Support Note */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Still having issues? Contact our support team with your transaction details.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[90vh] bg-gradient-to-br from-emerald-50 to-primary/5 dark:from-emerald-950/20 dark:to-primary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Success Header */}
        <Card className="mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-800/50 p-3">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mb-2">
                🎉 Payment Successful!
              </h1>
              <p className="text-emerald-700 dark:text-emerald-300">
                Your subscription has been activated successfully. Welcome to the full experience!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Summary of your subscription purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {paymentData?.planName && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Plan:</span>
                  <div className="flex items-center gap-2">
                    <span>{paymentData.planName}</span>
                    <Badge variant="secondary">
                      {paymentData.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </Badge>
                  </div>
                </div>
              )}
              
              {paymentData?.amount && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Amount Paid:</span>
                  <span className="text-lg font-semibold">
                    ₹{(paymentData.amount / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {paymentData?.sessionId && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Transaction ID:</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {paymentData.sessionId.slice(-12)}
                  </span>
                </div>
              )}

              {currentSubscription && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Next Billing Date:</span>
                  <span>
                    {new Date(currentSubscription.current_period_end).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Download Buttons */}
            <div className="space-y-3">
              <h4 className="font-medium">Download Documents</h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={downloadInvoice}
                  disabled={isLoadingInvoice}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  {isLoadingInvoice ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {isLoadingInvoice ? 'Downloading...' : 'Download Invoice'}
                </Button>

                <Button
                  onClick={downloadReceipt}
                  disabled={isLoadingReceipt}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  {isLoadingReceipt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isLoadingReceipt ? 'Downloading...' : 'Download Receipt'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s Next?</CardTitle>
            <CardDescription>
              Get the most out of your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium">Explore Your Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Access all premium features including advanced analytics, unlimited members, and more.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium">Add Your Members</h4>
                  <p className="text-sm text-muted-foreground">
                    Start adding members to your gym and track their progress with advanced features.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <h4 className="font-medium">Manage Your Subscription</h4>
                  <p className="text-sm text-muted-foreground">
                    Visit your settings to manage billing, update payment methods, or view usage.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
              
              <Link href="/members" className="flex-1">
                <Button variant="outline" className="w-full">
                  Add Members
                </Button>
              </Link>
              
              <Link href="/settings" className="flex-1">
                <Button variant="outline" className="w-full">
                  Manage Subscription
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team or visit our help center.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
} 