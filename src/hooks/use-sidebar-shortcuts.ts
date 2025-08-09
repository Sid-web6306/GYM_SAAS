'use client'

import { useEffect } from 'react'
import { useSidebarState } from '@/stores/ui-store'

/**
 * Custom hook for sidebar keyboard shortcuts
 * Supports:
 * - Ctrl/Cmd + B: Toggle sidebar
 * - Ctrl/Cmd + Shift + B: Toggle mobile sidebar
 * - Escape: Close mobile sidebar
 */
export function useSidebarShortcuts() {
  const { toggleSidebar, toggleMobileSidebar, sidebarCollapsedMobile } = useSidebarState()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key - close mobile sidebar
      if (event.key === 'Escape' && !sidebarCollapsedMobile) {
        event.preventDefault()
        toggleMobileSidebar()
        return
      }

      // Handle Ctrl/Cmd + B - toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault()
        
        if (event.shiftKey) {
          // Ctrl/Cmd + Shift + B - toggle mobile sidebar
          toggleMobileSidebar()
        } else {
          // Ctrl/Cmd + B - toggle desktop sidebar
          toggleSidebar()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleSidebar, toggleMobileSidebar, sidebarCollapsedMobile])
}
