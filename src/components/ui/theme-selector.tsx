'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Palette } from 'lucide-react'
import { logger } from '@/lib/logger'

const themes = [
  {
    name: 'Light',
    value: 'light',
    colors: ['#ffffff', '#f8fafc', '#e2e8f0'],
  },
  {
    name: 'Blue',
    value: 'blue',
    colors: ['#dbeafe', '#3b82f6', '#1e40af'],
  },
  {
    name: 'Green',
    value: 'green',
    colors: ['#dcfce7', '#22c55e', '#15803d'],
  },
  {
    name: 'Purple',
    value: 'purple',
    colors: ['#f3e8ff', '#a855f7', '#7c3aed'],
  },
  {
    name: 'Rose',
    value: 'rose',
    colors: ['#fdf2f8', '#ec4899', '#be185d'],
  },
]

export const ThemeSelector = () => {
  const { theme, setTheme, resolvedTheme, themes: availableThemes } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug logging
  useEffect(() => {
    if (mounted) {
      logger.debug('Theme changed', {
        theme,
        resolvedTheme,
        availableThemes,
        htmlClass: document.documentElement.className
      })
    }
  }, [theme, resolvedTheme, availableThemes, mounted])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)

    // Force a re-render after theme change
    setTimeout(() => {
      logger.debug('Theme update applied', {
        theme,
        resolvedTheme,
        htmlClass: document.documentElement.className
      })
    }, 100)
  }

  if (!mounted) {
    return null
  }

  const currentTheme = theme || resolvedTheme || 'rose'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider px-3">
        <Palette className="h-3 w-3" />
        Theme
      </div>

      <Select value={currentTheme} onValueChange={handleThemeChange}>
        <SelectTrigger className="mx-3 h-8 text-xs">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          {themes.map((themeOption) => (
            <SelectItem key={themeOption.value} value={themeOption.value}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {themeOption.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span>{themeOption.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 