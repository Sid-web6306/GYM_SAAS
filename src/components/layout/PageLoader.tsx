// src/components/layout/PageLoader.tsx
import { LoadingSpinner } from './LoadingSpinner'

export const PageLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading page..." />
    </div>
  )
}
