'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OTPInput } from '@/components/ui/otp-input'
import { toastActions } from '@/stores/toast-store'

interface OTPVerificationProps {
  email: string
  onVerificationSuccess?: () => void
  redirectTo?: string
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onVerificationSuccess,
  redirectTo = '/onboarding'
}) => {
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const handleVerifyOTP = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token: otp,
          type: 'email'
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toastActions.success('Email Verified!', 'Your email has been successfully verified.')
        
        // Small delay to ensure auth state updates, then redirect
        setTimeout(() => {
          if (onVerificationSuccess) {
            onVerificationSuccess()
          } else {
            router.push(redirectTo)
          }
        }, 1000)
      } else {
        setAttempts(prev => prev + 1)
        setError(result.error || 'Invalid verification code. Please try again.')
        setOtp('') // Clear the OTP input
        
        // Rate limiting feedback
        if (attempts >= 2) {
          setError('Too many attempts. Please request a new code.')
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error)
      setError('Something went wrong. Please try again.')
      setOtp('')
    } finally {
      setIsVerifying(false)
    }
  }, [otp, email, attempts, onVerificationSuccess, router, redirectTo])

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP()
    }
  }, [otp, handleVerifyOTP])

  const handleResendOTP = async () => {
    if (isResending) return

    setIsResending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: 'email'
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setTimeLeft(300) // Reset timer
        setAttempts(0) // Reset attempts
        setOtp('') // Clear current OTP
        toastActions.success('Code Sent!', 'A new verification code has been sent to your email.')
      } else {
        setError(result.error || 'Failed to resend code. Please try again.')
      }
    } catch (error) {
      console.error('Resend OTP error:', error)
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isExpired = timeLeft <= 0

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
          <p className="text-gray-600 mt-2">
            We&apos;ve sent a 6-digit verification code to your email.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Code sent to:</span>
        </div>
        <div className="bg-white border border-blue-200 rounded px-3 py-2">
          <code className="text-sm text-blue-800 break-all">{email}</code>
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Enter 6-digit verification code
          </label>
          <OTPInput
            value={otp}
            onChange={setOtp}
            disabled={isVerifying || isExpired}
            autoFocus
            className="mb-4"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isVerifying && (
          <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>Verifying your code...</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Timer and Resend */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {isExpired ? 'Code expired' : `Code expires in ${formatTime(timeLeft)}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOTP}
              disabled={isResending || (!isExpired && timeLeft > 240)} // Allow resend only after 1 minute or if expired
              className="h-auto p-0 text-blue-600 hover:text-blue-700"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Resend Code
                </>
              )}
            </Button>
          </div>

          {/* Manual verification button (backup) */}
          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || isVerifying || isExpired}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Email
              </>
            )}
          </Button>

          {/* Back to login */}
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        <p>Didn&apos;t receive the code? Check your spam folder or try resending.</p>
        <p>Make sure to check both your inbox and spam/junk folders.</p>
      </div>
    </div>
  )
}

export default OTPVerification
