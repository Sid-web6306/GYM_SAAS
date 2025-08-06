'use client'

import React from 'react'
import { CurrentSubscriptionDisplay } from '@/components/subscriptions'

export const SubscriptionTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Current Subscription</h2>
        <p className="text-muted-foreground">
          View your current subscription details and manage your plan.
        </p>
      </div>
      <CurrentSubscriptionDisplay className="transform-gpu overflow-visible" />
    </div>
  )
} 