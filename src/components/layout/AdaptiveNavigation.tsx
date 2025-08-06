'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, Menu, X } from "lucide-react"
import { useState } from "react"

interface AdaptiveNavigationProps {
  className?: string
}

export function AdaptiveNavigation({ className }: AdaptiveNavigationProps) {
  const { isAuthenticated, hasGym, isLoading, user, profile } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // Show skeleton during loading to prevent layout shift
  if (isLoading) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <Skeleton className="h-8 w-24 bg-white/10" />
        <Skeleton className="h-10 w-20 bg-white/10" />
      </div>
    )
  }

  // Authenticated user (with or without gym) - show subtle status + single dashboard link
  if (isAuthenticated) {
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
    const statusText = hasGym ? `Welcome back, ${displayName}` : `Hi ${displayName}`
    const linkDestination = hasGym ? '/dashboard' : '/onboarding'
    const linkText = hasGym ? 'Dashboard' : 'Setup'
    
    return (
      <>
        <div className={`flex items-center space-x-4 ${className}`}>
          <span className="text-white/70 text-sm hidden sm:inline">
            {statusText}
          </span>
          <Link href={linkDestination}>
            <Button 
              variant="outline" 
              size="sm"
              className="text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200"
            >
              {linkText}
            </Button>
          </Link>
          
          {/* Mobile menu button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMobileMenu}
            className="md:hidden text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
        
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-lg">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6">
                <span className="text-xl font-bold text-white">Navigation</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeMobileMenu}
                  className="text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="flex flex-col space-y-6 px-6 py-8">
                <Link 
                  href="#features" 
                  onClick={closeMobileMenu}
                  className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
                >
                  Features
                </Link>
                <Link 
                  href="#pricing" 
                  onClick={closeMobileMenu}
                  className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
                >
                  Pricing
                </Link>
                <Link 
                  href="#testimonials" 
                  onClick={closeMobileMenu}
                  className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
                >
                  Reviews
                </Link>
                <div className="pt-6 border-t border-white/20">
                  <p className="text-white/70 text-sm mb-4">{statusText}</p>
                  <Link href={linkDestination} onClick={closeMobileMenu}>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                      {linkText}
                    </Button>
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}
      </>
    )
  }

  // Anonymous user - clean login/signup
  return (
    <>
      <div className={`flex items-center space-x-4 ${className}`}>
        <Link href="/login">
          <Button variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 backdrop-blur transition-all duration-200">
            Log In
          </Button>
        </Link>
        <Link href="/signup">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200">
            Sign Up
          </Button>
        </Link>
        
        {/* Mobile menu button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMobileMenu}
          className="md:hidden text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200"
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-lg">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6">
              <span className="text-xl font-bold text-white">Navigation</span>
              <Button
                variant="outline"
                size="sm"
                onClick={closeMobileMenu}
                className="text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex flex-col space-y-6 px-6 py-8">
              <Link 
                href="#features" 
                onClick={closeMobileMenu}
                className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                onClick={closeMobileMenu}
                className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
              >
                Pricing
              </Link>
              <Link 
                href="#testimonials" 
                onClick={closeMobileMenu}
                className="text-2xl text-white hover:text-purple-300 transition-colors py-2"
              >
                Reviews
              </Link>
              <div className="pt-6 border-t border-white/20 space-y-4">
                <Link href="/login" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 backdrop-blur transition-all duration-200">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup" onClick={closeMobileMenu}>
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

// Hero section adaptive CTA
export function AdaptiveHeroCTA({ className }: { className?: string }) {
  const { isAuthenticated, hasGym, isLoading } = useAuth()

  // Show skeleton during loading
  if (isLoading) {
    return (
      <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
        <Skeleton className="h-12 w-48 bg-white/10" />
        <Skeleton className="h-12 w-36 bg-white/10" />
      </div>
    )
  }

  // Authenticated user with gym - dashboard CTA
  if (isAuthenticated && hasGym) {
    return (
      <div className={`flex flex-col sm:flex-row gap-4 justify-center ${className}`}>
        <Link href="/dashboard">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
            Open Dashboard
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </Link>
        <Link href="/settings">
          <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200 min-w-[220px] whitespace-nowrap">
            Manage Account
          </Button>
        </Link>
      </div>
    )
  }

  // Authenticated user without gym - onboarding CTA
  if (isAuthenticated && !hasGym) {
    return (
      <div className={`flex flex-col sm:flex-row gap-4 justify-center ${className}`}>
        <Link href="/onboarding">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
            Complete Setup
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </Link>
        <Link href="#features">
          <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200 min-w-[220px] whitespace-nowrap">
            Learn More
          </Button>
        </Link>
      </div>
    )
  }

  // Anonymous user - standard signup CTA
  return (
    <div className={`flex flex-col sm:flex-row gap-4 justify-center ${className}`}>
      <Link href="/signup">
        <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
          Try Free for 14 Days
          <ArrowRight className="ml-2 h-6 w-6" />
        </Button>
      </Link>
      <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200 min-w-[220px] whitespace-nowrap">
        Book a Demo
      </Button>
    </div>
  )
}

// Final CTA section adaptive content
export function AdaptiveFinalCTA({ className }: { className?: string }) {
  const { isAuthenticated, hasGym, isLoading } = useAuth()

  // Show skeleton during loading
  if (isLoading) {
    return (
      <div className={`text-center ${className}`}>
        <Skeleton className="h-10 w-96 mx-auto mb-6 bg-white/10" />
        <Skeleton className="h-6 w-80 mx-auto mb-8 bg-white/10" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Skeleton className="h-12 w-[200px] bg-white/10" />
          <Skeleton className="h-12 w-[200px] bg-white/10" />
        </div>
      </div>
    )
  }

  // Authenticated user with gym
  if (isAuthenticated && hasGym) {
    return (
      <div className={`text-center ${className}`}>
        <h2 className="text-4xl font-bold text-white mb-6">
          Welcome back! Ready to manage your gym?
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          Access your dashboard to view member analytics, manage check-ins, and grow your fitness business.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
              Open Dashboard
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
          <Link href="/members">
            <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200 min-w-[220px] whitespace-nowrap">
              Manage Members
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Authenticated user without gym
  if (isAuthenticated && !hasGym) {
    return (
      <div className={`text-center ${className}`}>
        <h2 className="text-4xl font-bold text-white mb-6">
          Almost there! Complete your gym setup
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          Finish setting up your gym profile to unlock the full power of our management platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/onboarding">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
              Complete Setup
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Anonymous user - original content
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-4xl font-bold text-white mb-6">
        Ready to modernize your fitness business management?
      </h2>
      <p className="text-xl text-slate-300 mb-8">
        Join forward-thinking fitness business owners who are transforming their operations. Experience the future of fitness management with our 14-day free trial.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <Link href="/signup">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-12 py-6 text-xl transition-all duration-200 min-w-[220px] whitespace-nowrap">
            Try Free for 14 Days
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </Link>
        <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-12 py-6 text-xl backdrop-blur transition-all duration-200 min-w-[220px] whitespace-nowrap">
          Book a Demo
        </Button>
      </div>
      <div className="text-slate-400">
        <p className="mb-2">✓ No credit card required  •  ✓ 14-day free trial  •  ✓ Cancel anytime</p>
        <p className="text-sm">Join the 2,500+ fitness professionals already transforming their business operations</p>
      </div>
    </div>
  )
}