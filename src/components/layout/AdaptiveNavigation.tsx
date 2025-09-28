'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useRBAC } from "@/hooks/use-rbac"
import { logger } from '@/lib/logger'
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  ArrowRight, 
  Menu, 
  X, 
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Dumbbell,
  Smartphone
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface AdaptiveNavigationProps {
  className?: string
}

export function AdaptiveNavigation({ className }: AdaptiveNavigationProps) {
  const { isAuthenticated, hasGym, isLoading, user, profile } = useAuth()
  const rbac = useRBAC()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])
  
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/')
      router.refresh()
    } catch (error) {
      logger.error('Logout error:', {error})
      toast.error('Failed to logout')
    }
  }

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu()
      }
    }
    
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isMobileMenuOpen, closeMobileMenu])

  // Navigation links
  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#testimonials', label: 'Reviews' }
  ]

  // Show skeleton during loading
  if (isLoading) {
    return (
      <nav className="relative z-50 flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent rounded-md">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-lg sm:text-2xl font-bold text-white">GymSaaS</span>
        </Link>

        {/* Skeleton for center links */}
        <div className="hidden md:flex items-center space-x-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-20 bg-white/10" />
          ))}
        </div>

        {/* Skeleton for right section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Skeleton className="h-10 w-20 bg-white/10" />
          <Skeleton className="h-10 w-10 md:hidden bg-white/10" />
        </div>
      </nav>
    )
  }

  return (
    <>
      <nav className="relative z-50 flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm" role="navigation" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent rounded-md">
          <div className="p-1.5 sm:p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <span className="text-lg sm:text-2xl font-bold text-white">GymSaaS</span>
        </Link>

        {/* Desktop Navigation Links (Center) */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className="text-white hover:text-purple-300 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent rounded-md px-3 py-2"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className={`flex items-center space-x-2 sm:space-x-4 ${className}`}>
          {isAuthenticated ? (
            <>
              {/* Desktop User Menu */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center space-x-2 text-white hover:bg-white/10 px-2 sm:px-3"
                    >
                      <UserAvatar
                        src={profile?.avatar_url}
                        name={profile?.full_name}
                        email={user?.email}
                        userId={user?.id}
                        size="sm"
                      />
                      <span className="text-sm sm:text-base">{profile?.full_name || user?.email?.split('@')[0] || 'User'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  >
                    <DropdownMenuItem asChild>
                      <Link 
                        href={hasGym ? "/dashboard" : "/onboarding"} 
                        className="flex items-center cursor-pointer"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>{hasGym ? "Dashboard" : "Complete Setup"}</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Member Portal Link */}
                    {rbac?.role === 'member' && (
                      <DropdownMenuItem asChild>
                        <Link 
                          href="/portal" 
                          className="flex items-center cursor-pointer"
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          <span>Member Portal</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="flex items-center cursor-pointer text-red-600 dark:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Login/Signup Buttons */}
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login">
                  <Button 
                    variant="outline" 
                    className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 active:bg-white active:text-slate-900 backdrop-blur transition-all duration-200 min-h-[40px] px-4"
                  >
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 text-white transition-all duration-200 min-h-[40px] px-4"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            </>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMobileMenu}
            className="md:hidden text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200 min-h-[44px] min-w-[44px] p-2 touch-manipulation"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 z-[998] bg-black/60 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Drawer Panel */}
          <div 
            id="mobile-menu"
            className="md:hidden fixed inset-0 z-[999] flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="w-full bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex flex-col h-full h-[100dvh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800">
                  <span className="text-lg sm:text-xl font-bold text-white">Navigation</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeMobileMenu}
                    className="text-white border-white/50 bg-white/10 hover:bg-white/20 hover:border-white backdrop-blur transition-all duration-200 min-h-[44px] min-w-[44px] p-2 touch-manipulation"
                    aria-label="Close navigation menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <nav className="flex flex-col h-full">
                  {/* Navigation Links */}
                  <div className="flex flex-col space-y-2 px-4 sm:px-6 py-6">
                    {navLinks.map((link) => (
                      <Link 
                        key={link.href}
                        href={link.href} 
                        onClick={closeMobileMenu}
                        className="text-lg text-white hover:text-purple-300 active:text-purple-400 transition-colors py-3 px-3 rounded-lg hover:bg-white/5 active:bg-white/10 flex items-center"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                  
                  {/* Auth Section */}
                  <div className="mt-auto px-4 sm:px-6 py-6 border-t border-slate-800 safe-area-inset-bottom">
                    {isAuthenticated ? (
                      <div className="space-y-3">
                        <Link href={hasGym ? "/dashboard" : "/onboarding"} onClick={closeMobileMenu}>
                          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 text-white min-h-[48px] text-base">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            {hasGym ? "Dashboard" : "Complete Setup"}
                          </Button>
                        </Link>
                        <Button 
                          onClick={() => {
                            handleLogout()
                            closeMobileMenu()
                          }}
                          variant="outline" 
                          className="w-full text-red-500 border-red-500 hover:bg-red-500 hover:text-white min-h-[48px] text-base"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Link href="/login" onClick={closeMobileMenu}>
                          <Button variant="outline" className="w-full text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 active:bg-white active:text-slate-900 backdrop-blur transition-all duration-200 min-h-[48px] text-base">
                            Log In
                          </Button>
                        </Link>
                        <Link href="/signup" onClick={closeMobileMenu}>
                          <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:from-purple-700 active:to-pink-700 text-white transition-all duration-200 min-h-[48px] text-base">
                            Sign Up
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

// Hero section adaptive CTA - Enhanced touch targets
export function AdaptiveHeroCTA({ className }: { className?: string }) {
  const { isAuthenticated, hasGym, isLoading } = useAuth()

  // Show skeleton during loading
  if (isLoading) {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 items-center ${className}`}>
        <Skeleton className="h-12 sm:h-14 w-48 sm:w-52 bg-white/10" />
        <Skeleton className="h-12 sm:h-14 w-36 sm:w-40 bg-white/10" />
      </div>
    )
  }

  // Authenticated user with gym - dashboard CTA
  if (isAuthenticated && hasGym) {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center ${className}`}>
        <Link href="/dashboard">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
            Open Dashboard
            <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </Link>
        <Link href="/settings">
          <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl backdrop-blur transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
            Manage Account
          </Button>
        </Link>
      </div>
    )
  }

  // Authenticated user without gym - onboarding CTA
  if (isAuthenticated && !hasGym) {
    return (
      <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center ${className}`}>
        <Link href="/onboarding">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
            Complete Setup
            <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </Link>
        <Link href="#features">
          <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl backdrop-blur transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
            Learn More
          </Button>
        </Link>
      </div>
    )
  }

  // Anonymous user - standard signup CTA with enhanced touch targets
  return (
    <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center ${className}`}>
      <Link href="/signup">
        <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
          Try Free for 14 Days
          <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
        </Button>
      </Link>
      <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl backdrop-blur transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
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
        <Skeleton className="h-8 sm:h-10 w-80 sm:w-96 mx-auto mb-4 sm:mb-6 bg-white/10" />
        <Skeleton className="h-5 sm:h-6 w-64 sm:w-80 mx-auto mb-6 sm:mb-8 bg-white/10" />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Skeleton className="h-12 sm:h-14 w-[180px] sm:w-[200px] bg-white/10" />
          <Skeleton className="h-12 sm:h-14 w-[180px] sm:w-[200px] bg-white/10" />
        </div>
      </div>
    )
  }

  // Authenticated user with gym
  if (isAuthenticated && hasGym) {
    return (
      <div className={`text-center ${className}`}>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
          Welcome back! Ready to manage your gym?
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
          Access your dashboard to view member analytics, manage check-ins, and grow your fitness business.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
            </Button>
          </Link>
          <Link href="/members">
            <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl backdrop-blur transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
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
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
          Almost there! Complete your gym setup
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
          Finish setting up your gym profile to unlock the full power of our management platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link href="/onboarding">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
              Complete Setup
              <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Anonymous user - original content with mobile optimization
  return (
    <div className={`text-center ${className}`}>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
        Ready to modernize your fitness business management?
      </h2>
      <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
        Join forward-thinking fitness business owners who are transforming their operations. Experience the future of fitness management with our 14-day free trial.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 items-center">
        <Link href="/signup">
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
            Try Free for 14 Days
            <ArrowRight className="ml-2 h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </Link>
        <Button size="lg" variant="outline" className="text-white border-white border-2 bg-white/10 hover:bg-white hover:text-slate-900 px-6 sm:px-12 py-4 sm:py-6 text-base sm:text-xl backdrop-blur transition-all duration-200 min-w-[180px] sm:min-w-[220px] min-h-[48px] sm:min-h-[56px] whitespace-nowrap">
          Book a Demo
        </Button>
      </div>
      <div className="text-slate-400 space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm sm:text-base">
          <span>✓ No credit card required</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ 14-day free trial</span>
          <span className="hidden sm:inline">•</span>
          <span>✓ Cancel anytime</span>
        </div>
        <p className="text-xs sm:text-sm px-4">Join the 2,500+ fitness professionals already transforming their business operations</p>
      </div>
    </div>
  )
}