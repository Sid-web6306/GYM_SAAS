'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  text?: string
  showText?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text = 'Loading...',
  showText = false
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {showText && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  )
}

// Full page loading component
export function FullPageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{text}</h3>
          <p className="text-sm text-muted-foreground">
            Please wait while we prepare your experience
          </p>
        </div>
      </div>
    </div>
  )
}

// Card-based loading component
export function CardLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{text}</h3>
          <p className="text-sm text-muted-foreground">
            Please wait...
          </p>
        </div>
      </div>
    </div>
  )
}

// Inline loading component
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}
