'use client'

import { useAuth, useLogout } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  History, 
  User, 
  LogOut, 
  Dumbbell,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import React from 'react'
import { PWAWrapper } from '@/components/pwa/PWAWrapper'
import { RealtimeProvider } from '@/components/providers/realtime-provider-simple'
import { PortalDataProvider } from '@/components/providers/portal-data-provider'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, isLoading: authLoading } = useAuth()
  const logoutMutation = useLogout()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Don't render anything if user is not authenticated (redirect is in progress)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Since middleware now handles portal access control, we can simplify this
  // If we reach here, user is authenticated and middleware has allowed access
  // This means they have the 'member' role

  const navigation = [
    { name: 'Dashboard', href: '/portal', icon: Home },
    { name: 'History', href: '/portal/history', icon: History },
    { name: 'Profile', href: '/portal/profile', icon: User },
  ]

  const handleSignOut = () => {
    logoutMutation.mutate()
  }

  return (
    <RealtimeProvider>
      <PortalDataProvider>
        <PWAWrapper />
        <div className="min-h-screen bg-gray-50">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Member Portal</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          
          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="border-t bg-white">
              <nav className="px-4 py-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </nav>
            </div>
          )}
        </div>

        <div className="lg:flex">
          {/* Desktop sidebar */}
          <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
            <div className="flex flex-col flex-grow bg-white border-r overflow-y-auto">
              {/* Logo */}
              <div className="flex items-center gap-2 px-6 py-6 border-b">
                <Dumbbell className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="font-semibold text-lg">Member Portal</h1>
                  <p className="text-sm text-gray-500">Welcome back!</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* User info and sign out */}
              <div className="px-4 py-4 border-t">
                <div className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                    {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {profile?.full_name || user?.email}
                    </p>
                    <p className="text-gray-500 text-xs truncate">Member</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:pl-64 flex-1">
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </div>
      </div>
        </PortalDataProvider>
      </RealtimeProvider>
  )
}
