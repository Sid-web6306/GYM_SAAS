'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

interface CollapsibleNavItemProps {
  name: string
  href: string
  icon: LucideIcon
  isActive: boolean
  onClick?: () => void
  forceExpanded?: boolean // Override collapse state for mobile use
  prefetch?: boolean
}

export function CollapsibleNavItem({
  name,
  href,
  icon: Icon,
  isActive,
  onClick,
  forceExpanded = false,
  prefetch = true
}: CollapsibleNavItemProps) {
  const { sidebarCollapsed, showTooltips } = useUIStore()
  
  // Use forceExpanded to override collapse state for mobile
  const isCollapsed = forceExpanded ? false : sidebarCollapsed

  return (
    <div className="relative group">
      <Link
        href={href}
        prefetch={prefetch}
        onClick={onClick}
        className={cn(
          'group flex items-center rounded-md text-sm font-medium transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          isCollapsed ? 'px-3 py-2 justify-center' : 'px-2 py-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-6 w-6 flex-shrink-0 transition-colors duration-200',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground',
            isCollapsed ? '' : 'mr-3'
          )}
        />
        
        <motion.span
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut'
          }}
          className="overflow-hidden whitespace-nowrap"
          style={{
            display: isCollapsed ? 'none' : 'block'
          }}
        >
          {name}
        </motion.span>
      </Link>

      {/* Tooltip for collapsed state */}
      {isCollapsed && showTooltips && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          whileHover={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
        >
          <div className="bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-md text-sm font-medium whitespace-nowrap border">
            {name}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45" />
          </div>
        </motion.div>
      )}

      {/* Active indicator for collapsed state */}
      {isCollapsed && isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full"
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        />
      )}
    </div>
  )
}
