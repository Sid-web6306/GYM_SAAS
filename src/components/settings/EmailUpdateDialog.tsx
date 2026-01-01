'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateUserEmail, verifyEmailUpdate, resendEmailVerification } from '@/actions/auth.actions'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OTPInput } from '@/components/ui/otp-input'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Loader2, 
  RefreshCw 
} from 'lucide-react'
import { toastActions } from '@/stores/toast-store'
import { logger } from '@/lib/logger'
import { useQueryClient } from '@tanstack/react-query'

const emailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address')
})

type EmailFormData = z.infer<typeof emailSchema>

interface EmailUpdateDialogProps {
  isOpen: boolean
  onClose: () => void
  currentEmail: string
  onEmailUpdated?: () => void
}

export const EmailUpdateDialog: React.FC<EmailUpdateDialogProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onEmailUpdated
}) => {
  const [step, setStep] = useState<'email' | 'verify'>('email')
  const [newEmail, setNewEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema)
  })

  // Cooldown timer for resend button (not code expiry - codes are valid for much longer)
  React.useEffect(() => {
    if (resendCooldown > 0 && step === 'verify') {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown, step])

  const handleEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('newEmail', data.newEmail)

      const result = await updateUserEmail(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setNewEmail(data.newEmail)
        setStep('verify')
        setResendCooldown(60)
        toastActions.success('Code Sent!', 'Please check your new email address for the verification code.')
      }
    } catch (error) {
      logger.error('Email update error:', { error })
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('newEmail', newEmail)
      formData.append('token', otp)

      const result = await verifyEmailUpdate(formData)

      if (result.error) {
        setError(result.error)
        setOtp('')
      } else {
        // Refresh the user session to get updated authentication context
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          
        }
        
        // Refetch user data to get updated email
        await queryClient.invalidateQueries({ queryKey: ['auth-session'] })
        await queryClient.refetchQueries({ queryKey: ['auth-session'] })
        
        toastActions.success('Email Updated!', 'Your email address has been updated successfully.')
        onEmailUpdated?.()
        handleClose()
      }
    } catch (error) {
      logger.error('Email verification error:', { error })
      setError('An unexpected error occurred')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (isResending) return

    setIsResending(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('newEmail', newEmail)

      const result = await resendEmailVerification(formData)

      if (result.error) {
        setError(result.error)
      } else {
        setResendCooldown(60) // Reset cooldown for next resend
        setOtp('')
        toastActions.success('Code Resent!', 'A new verification code has been sent to your new email address.')
      }
    } catch (error) {
      logger.error('Resend OTP error:', { error })
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleClose = () => {
    setStep('email')
    setNewEmail('')
    setOtp('')
    setError('')
    setResendCooldown(60)
    form.reset()
    onClose()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const canResend = resendCooldown <= 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Update Email Address
          </DialogTitle>
          <DialogDescription>
            {step === 'email' 
              ? 'Enter your new email address. We\'ll send a verification code to your new email address.'
              : 'Check your new email address for the verification code and enter it below.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'email' ? (
            <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail">Current Email</Label>
                <Input
                  id="currentEmail"
                  value={currentEmail}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="Enter new email address"
                  {...form.register('newEmail')}
                />
                {form.formState.errors.newEmail && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.newEmail.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Verification codes sent to:</span>
                </div>
                <div className="space-y-2">
                  <div className="bg-white border border-blue-200 rounded px-3 py-2">
                    <div className="text-xs text-blue-600 mb-1">Current email:</div>
                    <code className="text-sm text-blue-800 break-all">{currentEmail}</code>
                  </div>
                  <div className="bg-white border border-blue-200 rounded px-3 py-2">
                    <div className="text-xs text-blue-600 mb-1">New email:</div>
                    <code className="text-sm text-blue-800 break-all">{newEmail}</code>
                  </div>
                </div>
                <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
                  Enter the code from your <strong>new email address</strong> to complete the update.
                </div>
              </div>

              <div className="space-y-2">
                <Label>Enter 6-digit verification code from your new email</Label>
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {canResend 
                      ? 'You can request a new code' 
                      : `Resend available in ${formatTime(resendCooldown)}`
                    }
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={isResending || !canResend}
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep('email')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleOTPSubmit}
                    disabled={otp.length !== 6 || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify & Update
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
