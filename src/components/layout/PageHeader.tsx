'use client'

import { ReactNode } from 'react'
import { RoleContextIndicator, GymContextDisplay } from './RoleContextIndicator'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  showRoleChip?: boolean
  showGymContext?: boolean
  className?: string
}

export function PageHeader({ 
  title, 
  description, 
  children, 
  showRoleChip = true,
  showGymContext = false,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {showRoleChip && <RoleContextIndicator variant="chip" showGym={false} />}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {showGymContext && (
            <>
              <GymContextDisplay />
              {description && <span>•</span>}
            </>
          )}
          {description && <p>{description}</p>}
        </div>
      </div>
      {children && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {children}
        </div>
      )}
    </div>
  )
}

// Specialized header for dashboard-style layouts
export function DashboardHeader({ 
  title, 
  subtitle, 
  children, 
  className 
}: {
  title: string
  subtitle?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <RoleContextIndicator variant="chip" showGym={false} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <GymContextDisplay />
          {subtitle && (
            <>
              <span className="text-muted-foreground">•</span>
              <p className="text-muted-foreground">{subtitle}</p>
            </>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-4">
          {children}
        </div>
      )}
    </div>
  )
}
