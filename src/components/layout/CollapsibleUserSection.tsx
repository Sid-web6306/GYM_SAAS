'use client'

import { motion } from 'framer-motion'
import { User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useLogout } from '@/hooks/use-auth'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface CollapsibleUserSectionProps {
  className?: string
  // When true, always render the expanded layout (used for mobile sidebar)
  forceExpanded?: boolean
}

export function CollapsibleUserSection({ className, forceExpanded = false }: CollapsibleUserSectionProps) {
  const { profile, user } = useAuth()
  const logoutMutation = useLogout()
  const { sidebarCollapsed, showTooltips } = useUIStore()

  // If forceExpanded is true (mobile), do not collapse the section
  const isCollapsed = forceExpanded ? false : sidebarCollapsed

  const handleLogout = async () => {
    logoutMutation.mutate()
  }

  const displayName = profile?.full_name || user?.email || 'User'
  const email = user?.email

  return (
    <div className={cn('p-4 border-t border-border', className)}>
      {isCollapsed ? (
        /* Collapsed State - Icon Only */
        <div className="space-y-2">
          <div className="relative group">
            <div className="flex justify-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            
            {/* User info tooltip */}
            {showTooltips && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
              >
                <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-sm border min-w-[200px]">
                  <p className="font-medium truncate">{displayName}</p>
                  {email && (
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  )}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Logout button - collapsed */}
          <div className="relative group">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="w-full h-10 p-0"
              disabled={logoutMutation.isPending}
              aria-label="Sign out"
            >
              <LogOut className="h-6 w-6" />
            </Button>
            
            {/* Logout tooltip */}
            {showTooltips && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
              >
                <div className="bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-md text-sm font-medium whitespace-nowrap border">
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        /* Expanded State - Full Layout */
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <motion.div
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="ml-3 min-w-0 flex-1"
            >
              <p className="text-sm font-medium text-card-foreground truncate">
                {displayName}
              </p>
              {email && (
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
              )}
            </motion.div>
          </div>
          
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.2 }}
          >
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
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
