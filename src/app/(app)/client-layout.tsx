'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Suspense, useDeferredValue } from 'react'
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  Dumbbell,
  UserCog,
  BookUser,
  CalendarDays,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useSidebarState } from '@/stores/ui-store'
import { RequireAuth } from '@/components/auth/AuthGuard'
import { RealtimeProvider } from '@/components/providers/realtime-provider-simple'
import { CollapsibleNavItem } from '@/components/layout/CollapsibleNavItem'
import { SidebarToggle } from '@/components/layout/SidebarToggle'
import { CollapsibleUserSection } from '@/components/layout/CollapsibleUserSection'
import { useSidebarShortcuts } from '@/hooks/use-sidebar-shortcuts'
import { cn } from '@/lib/utils'

interface ClientLayoutProps {
  children: React.ReactNode
}

function ClientLayoutContent({ children }: ClientLayoutProps) {
  const pathname = usePathname()
  const deferredPathname = useDeferredValue(pathname)
  const { profile } = useAuth()
  const {
    sidebarCollapsed,
    sidebarCollapsedMobile,
    toggleMobileSidebar,
  } = useSidebarState()
  
  // Enable keyboard shortcuts
  useSidebarShortcuts()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Attendance', href: '/attendance', icon: CalendarDays },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Roles & Invitations', href: '/team', icon: UserCog },
    { name: 'Staff Directory', href: '/staff', icon: BookUser },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 64 : 256,
        }}
        transition={{ 
          duration: 0.3, 
          ease: 'easeOut' 
        }}
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-50',
          'bg-card shadow-lg border-r border-border'
        )}
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
                  {profile?.gym_id ? 'Gym SaaS' : 'Setup Required'}
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
              const isActive = deferredPathname === item.href
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
      <AnimatePresence>
        {!sidebarCollapsedMobile && (
          <>
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg border-r border-border"
            >
              {/* Mobile Header */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                <div className="flex items-center min-w-0">
                  <Dumbbell className="h-8 w-8 text-primary flex-shrink-0" />
                  <span className="ml-2 text-xl font-bold text-card-foreground whitespace-nowrap">
                    {profile?.gym_id ? 'Gym SaaS' : 'Setup Required'}
                  </span>
                </div>
                <SidebarToggle isMobile />
              </div>
              
              {/* Mobile Navigation */}
              <nav className="mt-5 px-2 flex-1">
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = deferredPathname === item.href
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={toggleMobileSidebar}
            />
          </>
        )}
      </AnimatePresence>

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

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <RequireAuth>
      <RealtimeProvider>
        <ClientLayoutContent>
          {children}
        </ClientLayoutContent>
      </RealtimeProvider>
    </RequireAuth>
  )
} 