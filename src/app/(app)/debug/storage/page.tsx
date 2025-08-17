'use client'

import { StorageDebug } from '@/components/debug/StorageDebug'
import { PageHeader } from '@/components/layout/PageHeader'

export default function StorageDebugPage() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <PageHeader
        title="Storage Debug"
        description="Test Supabase Storage configuration for avatar uploads"
        showGymContext={false}
      />
      
      <div className="flex justify-center">
        <StorageDebug />
      </div>
      
      <div className="text-sm text-muted-foreground text-center max-w-2xl mx-auto space-y-4">
        <p>
          This page helps you verify that Supabase Storage is properly configured for avatar uploads.
          Run the tests to identify any configuration issues.
        </p>
        
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <strong>Development Only:</strong> This debug page should be removed in production.
        </div>
      </div>
    </div>
  )
}
