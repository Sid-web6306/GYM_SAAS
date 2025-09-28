// src/app/(auth)/login/page.tsx

'use client'

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { FcGoogle } from "react-icons/fc"
import { FaFacebook } from "react-icons/fa"
import { Loader2 } from "lucide-react"

import { loginWithEmail, loginWithSocialProvider } from "@/actions/auth.actions"
import React from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useAuth } from '@/hooks/use-auth'
import { toastActions } from "@/stores/toast-store"
import { displayAuthMessage } from "@/lib/auth-messages"
import { withSuspense } from "@/components/providers/suspense-provider"
import { logger } from '@/lib/logger'

// Zod schema for client-side validation
const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address")
})

type LoginFormData = z.infer<typeof LoginSchema>

// Enhanced Social Button Component with loading states
const SocialButton = ({ 
  provider, 
  onClick, 
  isLoading, 
  disabled 
}: { 
  provider: 'google' | 'facebook'
  onClick: () => void
  isLoading: boolean
  disabled: boolean
}) => {
  const isGoogle = provider === 'google'
  const Icon = isGoogle ? FcGoogle : FaFacebook
  const bgColor = isGoogle ? "bg-white hover:bg-gray-50" : "bg-[#1877F2] hover:bg-[#166eab]"
  const textColor = isGoogle ? "text-gray-900" : "text-white hover:text-white"
  const borderColor = isGoogle ? "border-gray-300" : "border-[#1877F2]"
  const providerName = isGoogle ? 'Google' : 'Facebook'

  return (
    <Button
      type="button"
      variant="outline"
      className={`${bgColor} ${textColor} ${borderColor} relative transition-all duration-200 ${
        isLoading ? 'opacity-70 cursor-not-allowed' : ''
      }`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Icon className="mr-2 h-5 w-5" />
          <span>Continue with {providerName}</span>
        </>
      )}
    </Button>
  )
}

// Submit button component with proper accessibility
const SubmitButton = ({ isSubmitting }: { isSubmitting: boolean }) => {
  return (
    <Button 
      type="submit" 
      className="w-full transition-all duration-200" 
      disabled={isSubmitting}
      aria-describedby={isSubmitting ? "submit-status" : undefined}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          Signing In...
        </>
      ) : (
        "Sign In"
      )}
      {isSubmitting && (
        <span id="submit-status" className="sr-only">
          Signing in, please wait
        </span>
      )}
    </Button>
  )
}

const LoginPageComponent = () => {
  const searchParams = useSearchParams()
  
  // Use TanStack Query hooks for auth state
  const { isAuthenticated, isLoading } = useAuth()

  // Social auth loading states
  const [socialLoading, setSocialLoading] = React.useState<{
    google: boolean;
    facebook: boolean;
  }>({ google: false, facebook: false })

  // React Hook Form setup
  const form = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: ""
    },
  })
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Display auth messages from URL parameters
  useEffect(() => {
    displayAuthMessage(searchParams, (title, message, type) => {
      switch (type) {
        case 'success':
          toastActions.success(title, message)
          break
        case 'error':
          toastActions.error(title, message)
          break
        case 'warning':
          toastActions.warning(title, message)
          break
        case 'info':
          toastActions.info(title, message)
          break
      }
    })
  }, [searchParams])

  // Middleware handles authentication redirects - no client redirect needed

  // Social login handler
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(prev => ({ ...prev, [provider]: true }))
    
    try {

      toastActions.info(
        'Redirecting...', 
        `Redirecting to ${provider === 'google' ? 'Google' : 'Facebook'} for authentication.`
      )
      if (provider === 'google') {
        await loginWithSocialProvider('google', {});
      } else {
        await loginWithSocialProvider('facebook', {});
      }
      
      // Server action will handle redirect, so this code won't be reached
      // unless there's an error
      
    } catch (error) {
      logger.error(`${provider} OAuth error:`, {error})
      
      // Provide more specific error messages
      let errorMessage = `Failed to connect with ${provider === 'google' ? 'Google' : 'Facebook'}. Please try again.`
      
      if (error instanceof Error) {
        if (error.message.includes('popup_blocked')) {
          errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site and try again.'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
      }
      
      toastActions.error('Authentication Error', errorMessage)
      setSocialLoading(prev => ({ ...prev, [provider]: false }))
    }
  }

  // Reset form submission state when component unmounts
  React.useEffect(() => {
    return () => {
      setIsSubmitting(false)
    }
  }, [])

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('email', data.email)
      
      const result = await loginWithEmail(formData)
      
      if (result?.error) {
        toastActions.error("Login Failed", "Invalid email address or login failed. Please try again.")
      }
      // If no error, the server action will handle the redirect
      
    } catch (error) {
      logger.error('Login form error:', {error})
      
      // Check if this is a Next.js redirect (not a real error)
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        return // Don't show error toast for redirects
      }
      
      toastActions.error("Error", "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while redirecting authenticated user
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  const isSocialButtonDisabled = isSubmitting || socialLoading.google || socialLoading.facebook

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Social Login Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <SocialButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={socialLoading.google}
              disabled={isSocialButtonDisabled}
            />
            {/* <SocialButton
              provider="facebook"
              onClick={() => handleSocialLogin('facebook')}
              isLoading={socialLoading.facebook}
              disabled={isSocialButtonDisabled}
            /> */}
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Login Form */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  aria-describedby={form.formState.errors.email ? "email-error" : "email-description"}
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register('email')}
                />
                {!form.formState.errors.email && (
                  <p id="email-description" className="text-xs text-muted-foreground">
                    Enter the email address associated with your account
                  </p>
                )}
                {form.formState.errors.email && (
                  <p id="email-error" className="text-xs text-red-500" role="alert">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <SubmitButton isSubmitting={isSubmitting} />
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>

          <div className="mt-2 text-center text-sm">
            <Link href="/" className="underline">
              Go to home page
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Wrap with Suspense to handle useSearchParams
const LoginPage = withSuspense(LoginPageComponent)

export default LoginPage 