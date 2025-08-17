'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import Link from "next/link"

const ConfirmEmailPage = () => {
  const router = useRouter()
  // Use TanStack Query hooks for auth state
  const { user, isLoading, isAuthenticated } = useAuth()

  // Redirect if user is authenticated and email is confirmed
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.email_confirmed_at) {
      console.log('Email confirmed, redirecting to dashboard')
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, user, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If redirecting
  if (isAuthenticated && user?.email_confirmed_at) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Email confirmed! Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              <strong>Email sent to:</strong>
            </p>
            <p className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">
              {user?.email || 'your-email@example.com'}
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>Please check your email and click the confirmation link to continue.</p>
            <p>After confirming, you&apos;ll be automatically redirected to complete your profile.</p>
          </div>
          
          <div className="pt-4 space-y-2">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              I&apos;ve confirmed my email
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Back to Login
            </Button>

            <div className="mt-2">
              <Link href="/" className="underline text-sm">Go to home</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ConfirmEmailPage