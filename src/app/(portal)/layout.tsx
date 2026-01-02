'use client'

import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { 
  Home, 
  History, 
  User, 
  Dumbbell
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import React from 'react'
import { PWAWrapper } from '@/components/pwa/PWAWrapper'
import { RealtimeProvider } from '@/components/providers/realtime-provider-simple'
import { PortalDataProvider } from '@/components/providers/portal-data-provider'
import { motion } from 'framer-motion'
import { useSidebarState } from '@/stores/ui-store'
import { CollapsibleNavItem } from '@/components/layout/CollapsibleNavItem'
import { SidebarToggle } from '@/components/layout/SidebarToggle'
import { CollapsibleUserSection } from '@/components/layout/CollapsibleUserSection'
import { cn } from '@/lib/utils'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  // Sidebar state for collapsible functionality
  const {
    sidebarCollapsed,
    sidebarCollapsedMobile,
    toggleMobileSidebar,
  } = useSidebarState()

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

  return (
    <RealtimeProvider>
      <PortalDataProvider key="portal-data-provider">
        <PWAWrapper />
        <div className="min-h-screen bg-gray-50">
        <div className="lg:flex">
          {/* Desktop Sidebar - Collapsible */}
          <motion.div
            initial={false}
            animate={{ 
              width: sidebarCollapsed ? 64 : 256,
            }}
            transition={{ 
              duration: 0.3, 
              ease: 'easeOut' 
            }}
            className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 bg-card shadow-lg border-r border-border"
          >
            {/* Sidebar Header */}
            <div className={cn(
              'flex items-center h-16 border-b border-border transition-all duration-300',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            )}>
              {sidebarCollapsed ? (
                /* Desktop collapsed state - only toggle button centered */
                <SidebarToggle />
              ) : (
                /* Desktop expanded state - logo + text + toggle button */
                <>
                  <div className="flex items-center min-w-0">
                    <Dumbbell className="h-8 w-8 text-primary flex-shrink-0" />
                    <span className="ml-2 text-xl font-bold text-card-foreground whitespace-nowrap">
                      Member Portal
                    </span>
                  </div>
                  <SidebarToggle />
                </>
              )}
            </div>
            
            {/* Navigation */}
            <nav className="mt-5 flex-1 px-2">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <CollapsibleNavItem
                      key={item.name}
                      name={item.name}
                      href={item.href}
                      icon={item.icon}
                      isActive={isActive}
                      prefetch={true}
                    />
                  )
                })}
              </div>
            </nav>

            {/* User Section */}
            <CollapsibleUserSection className="mt-auto" />
          </motion.div>

          {/* Mobile Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: sidebarCollapsedMobile ? '-100%' : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg border-r border-border"
          >
            {/* Mobile Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              <div className="flex items-center min-w-0">
                <Dumbbell className="h-8 w-8 text-primary flex-shrink-0" />
                <span className="ml-2 text-xl font-bold text-card-foreground whitespace-nowrap">
                  Member Portal
                </span>
              </div>
              <SidebarToggle isMobile />
            </div>
            
            {/* Mobile Navigation */}
            <nav className="mt-5 px-2 flex-1">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <CollapsibleNavItem
                      key={item.name}
                      name={item.name}
                      href={item.href}
                      icon={item.icon}
                      isActive={isActive}
                      onClick={toggleMobileSidebar}
                      forceExpanded={true}
                      prefetch={true}
                    />
                  )
                })}
              </div>
            </nav>

            {/* Mobile User Section - force expanded so details + logout are visible */}
            <CollapsibleUserSection forceExpanded />
          </motion.div>

          {/* Mobile Overlay */}
          {!sidebarCollapsedMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={toggleMobileSidebar}
            />
          )}

          {/* Main content */}
          <div
            className={cn(
              'flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-out',
              // Mobile: no margin
              'ml-0',
              // Desktop: margin based on sidebar state
              sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
            )}
          >
            {/* Mobile Top bar */}
            <div className="bg-card shadow-sm border-b border-border lg:hidden">
              <div className="flex items-center justify-between h-16 px-4">
                <SidebarToggle isMobile />
                <h1 className="text-lg font-semibold text-card-foreground">
                  {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
                <div className="w-8"></div> {/* Spacer for balance */}
              </div>
            </div>

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
