'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Dumbbell,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/hooks/use-auth'
import { RequireAuth } from '@/components/auth/AuthGuard'

interface ClientLayoutProps {
  children: React.ReactNode
}

function ClientLayoutContent({ children }: ClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { profile, user } = useAuth()
  const logoutMutation = useLogout()

  const handleLogout = async () => {
    logoutMutation.mutate()
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center">
            <Dumbbell className="h-8 w-8 text-purple-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              {profile?.gym_id ? 'Gym SaaS' : 'Setup Required'}
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-5 px-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-purple-100 text-purple-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 h-6 w-6`}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Legal Links */}
        <div className="absolute bottom-20 w-full px-4">
          <div className="text-xs text-gray-500 space-y-1">
            <Link href="/privacy-policy" className="block hover:text-purple-600 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="block hover:text-purple-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="block hover:text-purple-600 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>

        {/* User section */}
        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h1>
            <div></div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <RequireAuth>
      <ClientLayoutContent>
        {children}
      </ClientLayoutContent>
    </RequireAuth>
  )
} 