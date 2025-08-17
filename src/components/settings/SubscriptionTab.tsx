'use client'

import React from 'react'
import { CurrentSubscriptionDisplay } from '@/components/subscriptions'
import { BillingGuard, AccessDenied } from '@/components/rbac/rbac-guards'

export const SubscriptionTab = () => {
  return (
    <BillingGuard action="read" fallback={
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Current Subscription</h2>
          <p className="text-muted-foreground">
            View your current subscription details and manage your plan.
          </p>
        </div>
        <AccessDenied 
          message="Subscription details are only available to gym owners. Contact your gym owner for billing information." 
        />
      </div>
    }>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Current Subscription</h2>
          <p className="text-muted-foreground">
            View your current subscription details and manage your plan.
          </p>
        </div>
        <CurrentSubscriptionDisplay className="transform-gpu overflow-visible" />
      </div>
    </BillingGuard>
  )
} 