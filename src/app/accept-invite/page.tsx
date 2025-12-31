'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Building2, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useInviteVerification } from '@/hooks/use-invitations'
import { toastActions } from '@/stores/toast-store'
import { logger } from '@/lib/logger'
import { Suspense } from 'react'

const AcceptInviteContent = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const { user, isLoading: isAuthLoading } = useAuth()

  const {
    invitation,
    isValid,
    isLoading: isVerifying,
    error,
    acceptInvitation
  } = useInviteVerification(inviteToken || '')

  const [isAccepting, setIsAccepting] = useState(false)

  const handleAccept = async () => {
    if (!inviteToken || !isValid) return

    // Safety check for email mismatch (double check client side)
    if (user?.email && invitation?.email && user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      toastActions.error('Email Mismatch', `Please log in as ${invitation.email} to accept this invitation`)
      return
    }

    setIsAccepting(true)
    try {
      await acceptInvitation()
      toastActions.success('Welcome!', `You've successfully joined ${invitation?.gym.name}`)
      router.replace('/dashboard')
    } catch (err) {
      logger.error('Failed to accept invitation:', { error: err })

      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'

      if (errorMessage.includes('different email')) {
        toastActions.error('Wrong Account', 'This invitation was sent to a different email address.')
      } else if (errorMessage.includes('already have a role') || errorMessage.includes('already a member')) {
        toastActions.info('Already Joined', `You are already a member of ${invitation?.gym.name}`)
        router.push('/dashboard')
      } else {
        toastActions.error('Error', 'Failed to accept invitation. Please try again.')
      }
      setIsAccepting(false)
    }
  }

  const handleLogin = () => {
    if (inviteToken) {
      router.push(`/login?invite=${inviteToken}`)
    }
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleSignup = () => {
    if (inviteToken) {
      router.push(`/signup?invite=${inviteToken}`)
    }
  }

  if (isVerifying || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground animate-pulse">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (!inviteToken || !isValid || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Invalid Invitation</h2>
            <p className="text-muted-foreground">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <Button onClick={() => router.push('/')} variant="outline" className="mt-4">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="border-border shadow-xl backdrop-blur-sm bg-card/80 overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-primary to-primary/80 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-20" />
            <div className="text-primary-foreground text-center z-10 p-4">
              <h1 className="text-3xl font-bold tracking-tight">You&apos;re Invited!</h1>
              <p className="text-primary-foreground/90 mt-1 font-medium">Join the team</p>
            </div>
          </div>

          <CardContent className="pt-8 px-6 pb-8 space-y-8">
            {/* Gym & Role Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border transition-colors hover:bg-secondary/70">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Organization</p>
                  <h3 className="text-xl font-bold text-foreground">{invitation?.gym.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border transition-colors hover:bg-secondary/70">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Role</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground capitalize">{invitation?.role}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
                      Access Granted
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message */}
            {invitation?.message && (
              <div className="relative p-6 bg-muted/30 rounded-xl border border-border/50">
                <div className="absolute -top-3 left-4 px-2 bg-card text-muted-foreground text-sm font-medium">
                  Message from {invitation.invited_by.name}
                </div>
                <p className="text-foreground italic leading-relaxed">&quot;{invitation.message}&quot;</p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 space-y-4">
              {user ? (
                // Authenticated State
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase opacity-80">Logged in as</p>
                      <p className="font-medium truncate">{user.email}</p>
                    </div>
                  </div>

                  {invitation?.email && user.email?.toLowerCase() !== invitation.email.toLowerCase() ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold">Wrong Account</p>
                          <p className="opacity-90 mt-1">
                            This invitation was sent to <span className="font-medium">{invitation.email}</span>,
                            but you are logged in as <span className="font-medium">{user.email}</span>.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-destructive/20 hover:bg-destructive/5 text-destructive"
                        onClick={handleLogout}
                      >
                        Log out and switch account
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                      onClick={handleAccept}
                      disabled={isAccepting}
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Joining...
                        </>
                      ) : (
                        <>
                          Accept & Join Team
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                // Unauthenticated State
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-12 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
                      onClick={handleLogin}
                    >
                      Log In
                    </Button>
                    <Button
                      className="h-12 shadow-lg shadow-primary/20 hover:shadow-primary/40"
                      onClick={handleSignup}
                    >
                      Sign Up
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Secure invitation link
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
