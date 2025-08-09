'use client'

import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSidebarState } from '@/stores/ui-store'

interface SidebarToggleProps {
  isMobile?: boolean
  className?: string
}

export function SidebarToggle({ isMobile = false, className }: SidebarToggleProps) {
  const {
    sidebarCollapsed,
    sidebarCollapsedMobile,
    toggleSidebar,
    toggleMobileSidebar,
    showTooltips
  } = useSidebarState()

  const isCollapsed = isMobile ? sidebarCollapsedMobile : sidebarCollapsed
  const handleToggle = isMobile ? toggleMobileSidebar : toggleSidebar

  const Icon = isMobile 
    ? (isCollapsed ? Menu : X)
    : (isCollapsed ? PanelLeftOpen : PanelLeftClose)

  const label = isMobile
    ? (isCollapsed ? 'Open menu' : 'Close menu')
    : (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={cn(
          'transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'rounded-md',
          // Special styling for desktop collapsed state only
          !isMobile && sidebarCollapsed 
            ? 'px-3 py-2 h-auto w-auto' // Match navigation item styling when collapsed
            : 'h-10 w-10 p-0', // Default button styling for mobile and desktop expanded
          className
        )}
        aria-label={label}
        aria-expanded={!isCollapsed}
      >
        <motion.div
          initial={false}
          animate={{ rotate: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      </Button>

      {/* Tooltip for desktop collapsed state */}
      {!isMobile && sidebarCollapsed && showTooltips && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
        >
          <div className="bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-md text-sm font-medium whitespace-nowrap border">
            {label}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45" />
          </div>
        </motion.div>
      )}
    </div>
  )
}
