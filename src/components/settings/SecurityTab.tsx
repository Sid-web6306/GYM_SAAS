'use client'

import React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  CheckCircle,
  Shield
} from 'lucide-react'

export const SecurityTab = () => {
  const { user } = useAuth()
  
  // Detect authentication provider
  const authProvider = user?.app_metadata?.provider
  const providerName = authProvider === 'google' ? 'Google' : authProvider === 'facebook' ? 'Facebook' : authProvider

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Your account security and authentication information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authentication Method Info */}
        <div className="space-y-4">
          <h3 className="font-medium">Authentication Method</h3>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              {authProvider && authProvider !== 'email' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>You&apos;re signed in with <strong>{providerName}</strong></span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>You&apos;re using <strong>Passwordless Email Authentication</strong></span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {authProvider && authProvider !== 'email' 
                ? `Your account is secured by ${providerName} authentication.`
                : 'Your account uses secure email verification. No password required - you receive a verification code via email each time you sign in.'
              }
            </p>
          </div>
        </div>

        <Separator />

        {/* Account Security Info */}
        <div className="space-y-4">
          <h3 className="font-medium">Account Security</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-green-600" />
              <span>Email verified: <strong>{user?.email}</strong></span>
            </div>
            
            {user?.email_confirmed_at && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Account verified on {new Date(user.email_confirmed_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Enhanced Security
                </p>
                <p className="text-sm text-green-700 dark:text-green-200">
                  Passwordless authentication provides enhanced security by eliminating password-related vulnerabilities. 
                  Each login requires fresh email verification, ensuring only you can access your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}