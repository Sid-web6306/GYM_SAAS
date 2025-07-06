'use client'

import { Button } from '@/components/ui/button'
import { logout } from '@/actions/auth.actions'
import { useAuthStore, useGymStore } from '@/stores'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toastActions } from '@/stores/toast-store'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  TrendingUp, 
  Settings,
  LogOut,
  Menu,
  X,
  Dumbbell
} from 'lucide-react'
import { ThemeSelector } from '@/components/ui/theme-selector'

interface ClientLayoutProps {
  children: React.ReactNode
  initialGymName: string
  initialUserName: string
}

export const ClientLayout = ({ children, initialGymName, initialUserName }: ClientLayoutProps) => {
  const initialize = useAuthStore(state => state.initialize)
  const isInitialized = useAuthStore(state => state.isInitialized)
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  const logoutStore = useAuthStore(state => state.logout)
  const gym = useGymStore((state) => state.gym)
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])

  // Use store values if available, otherwise fallback to initial values
  const gymName = gym?.name || initialGymName
  const userName = profile?.full_name || user?.email || initialUserName

  // Handle logout with proper state clearing
  const handleLogout = async () => {
    try {
      // Call server action
      const result = await logout()
      
      if (result.success) {
        // Clear client-side state
        await logoutStore()
        
        // Show success message
        toastActions.success('Logged Out', 'You have been logged out successfully.')
        
        // Redirect to login page
        router.push('/login')
      } else {
        toastActions.error('Logout Error', result.error || 'Failed to log out')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toastActions.error('Logout Error', 'Failed to log out. Please try again.')
    }
  }

  // Navigation items
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Members',
      href: '/members',
      icon: Users,
    },
    {
      name: 'Schedule',
      href: '/schedule',
      icon: Calendar,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: TrendingUp,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 truncate">{gymName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Theme Selector */}
        <div className="px-4 py-3 border-t border-gray-200">
          <ThemeSelector />
        </div>

        {/* User Section - Moved to bottom */}
        <div className="border-t border-gray-200 p-4 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500">Gym Owner</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-gray-700 hover:text-gray-900"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold text-gray-900">{gymName}</span>
            <div className="w-8" /> {/* Spacer for center alignment */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}