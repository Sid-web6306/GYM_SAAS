'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableBodyProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableRowProps {
  children: React.ReactNode
  className?: string
  mobileCardClassName?: string
}

interface ResponsiveTableCellProps {
  children: React.ReactNode
  className?: string
  label?: string // Mobile label for the field
  hideOnMobile?: boolean // Hide this cell on mobile
  mobileOrder?: number // Order in mobile view (lower numbers appear first)
  colSpan?: number // Number of columns to span
}

// Context to track if we're in mobile mode
const ResponsiveTableContext = React.createContext<{
  isMobile: boolean
  labels: string[]
}>({
  isMobile: false,
  labels: []
})

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return (
    <ResponsiveTableContext.Provider value={{ isMobile, labels: [] }}>
      <div className={cn(
        "w-full",
        // Hide default table on mobile, show cards instead
        isMobile ? "block" : "block",
        className
      )}>
        {isMobile ? (
          <div className="space-y-4">
            {children}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              {children}
            </Table>
          </div>
        )}
      </div>
    </ResponsiveTableContext.Provider>
  )
}

export function ResponsiveTableHeader({ children, className }: ResponsiveTableHeaderProps) {
  const { isMobile } = React.useContext(ResponsiveTableContext)
  
  if (isMobile) {
    return null // Headers are not shown in mobile card view
  }

  return (
    <TableHeader className={className}>
      {children}
    </TableHeader>
  )
}

export function ResponsiveTableBody({ children, className }: ResponsiveTableBodyProps) {
  const { isMobile } = React.useContext(ResponsiveTableContext)
  
  if (isMobile) {
    return <div className={cn("space-y-3", className)}>{children}</div>
  }

  return (
    <TableBody className={className}>
      {children}
    </TableBody>
  )
}

export function ResponsiveTableRow({ children, className, mobileCardClassName }: ResponsiveTableRowProps) {
  const { isMobile } = React.useContext(ResponsiveTableContext)
  
  if (isMobile) {
    return (
      <div className={cn(
        "bg-card border rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow",
        mobileCardClassName,
        className
      )}>
        {children}
      </div>
    )
  }

  return (
    <TableRow className={className}>
      {children}
    </TableRow>
  )
}

export function ResponsiveTableCell({ 
  children, 
  className, 
  label, 
  hideOnMobile = false,
  mobileOrder = 0,
  colSpan
}: ResponsiveTableCellProps) {
  const { isMobile } = React.useContext(ResponsiveTableContext)
  
  if (isMobile) {
    if (hideOnMobile) return null
    
    return (
      <div 
        className={cn("flex items-start justify-between gap-3", className)}
        style={{ order: mobileOrder }}
      >
        {label && (
          <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
            {label}:
          </span>
        )}
        <div className="text-sm text-right flex-1 min-w-0">
          {children}
        </div>
      </div>
    )
  }

  return (
    <TableCell className={className} colSpan={colSpan}>
      {children}
    </TableCell>
  )
}

// Special cell for actions that should be prominently displayed on mobile
export function ResponsiveTableActionsCell({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const { isMobile } = React.useContext(ResponsiveTableContext)
  
  if (isMobile) {
    return (
      <div className={cn(
        "flex items-center justify-end gap-2 pt-2 mt-3 border-t border-border",
        className
      )}>
        {children}
      </div>
    )
  }

  return (
    <TableCell className={cn("text-right", className)}>
      {children}
    </TableCell>
  )
}

// Loading skeleton component for responsive tables
export function ResponsiveTableSkeleton({ 
  rows = 3,
  columns = 4
}: {
  rows?: number
  columns?: number
}) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  if (isMobile) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4 space-y-3">
            {Array.from({ length: columns }, (_, j) => (
              <div key={j} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }, (_, i) => (
              <TableHead key={i}>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }, (_, j) => (
                <TableCell key={j} className="py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
