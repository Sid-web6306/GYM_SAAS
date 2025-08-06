'use client'

import { Crown } from 'lucide-react';
import { SubscriptionPlansComponent } from '@/components/subscriptions';

const UpgradePage = () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
          
          {/* Header Section */}
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Upgrade Your Plan
                </h1>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Choose the perfect plan for your gym. All plans include our core features with varying limits and support levels.
              </p>
            </div>
            

          </div>

          {/* Enhanced Subscription Plans Component */}
          <SubscriptionPlansComponent 
            showCurrentPlan={true} 
            variant="premium"
            className="transform-gpu overflow-visible"
          />
        </div>
      </div>
    </div>
  )
}

export default UpgradePage