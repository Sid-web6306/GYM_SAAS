'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Users, Star, Zap } from 'lucide-react'
import { OdometerNumber } from '@/components/ui/animated-number'
import { 
  getStaticPlansByType, 
  formatStaticPrice, 
  calculateStaticSavings
} from '@/lib/static-subscription-plans'

interface StaticSubscriptionPlansProps {
  className?: string
}

export function StaticSubscriptionPlans({ className = "" }: StaticSubscriptionPlansProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  
  const groupedPlans = getStaticPlansByType()
  
  // Get plan icon based on tier
  const getPlanIcon = (tierLevel: number) => {
    switch (tierLevel) {
      case 1: return Users
      case 2: return Star  
      case 3: return Zap
      default: return Users
    }
  }



  return (
    <div className={`w-full max-w-6xl mx-auto ${className}`}>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="flex items-center p-1 rounded-lg bg-slate-800/50 backdrop-blur border border-slate-700 relative overflow-hidden">
            {/* Sliding background indicator */}
            <div 
              className={`absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-slate-700 to-slate-600 shadow-lg transition-all duration-500 ease-in-out transform ${
                billingCycle === 'monthly' 
                  ? 'left-1 right-[50%] translate-x-0' 
                  : 'left-[50%] right-1 translate-x-0'
              }`}
            />
            
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out ${
                billingCycle === 'monthly'
                  ? 'text-white transform scale-105 font-semibold'
                  : 'text-slate-400 hover:text-white hover:scale-102'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out ${
                billingCycle === 'annual'
                  ? 'text-white transform scale-105 font-semibold'
                  : 'text-slate-400 hover:text-white hover:scale-102'
              }`}
            >
              Annual
            </button>
          </div>
          
          {/* Save badge positioned outside the toggle */}
          <Badge 
            variant="secondary" 
            className={`absolute -top-4 -right-1 bg-green-500/20 text-green-400 border border-green-500/40 text-xs px-2 py-1 whitespace-nowrap shadow-lg backdrop-blur transition-all duration-500 ease-in-out ${
              billingCycle === 'annual' 
                ? 'opacity-100 transform translate-y-0 scale-100' 
                : 'opacity-70 transform translate-y-1 scale-95'
            }`}
          >
            Save 17%
          </Badge>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {groupedPlans.map(({ monthly, annual }) => {
          const plan = billingCycle === 'monthly' ? monthly! : annual!
          const monthlyPlan = monthly!
          const annualPlan = annual!
          const IconComponent = getPlanIcon(plan.tier_level)
          const isPopular = plan.is_popular || plan.plan_type === 'professional'
          
          return (
            <Card 
              key={plan.plan_type}
              className={`relative overflow-hidden transition-all duration-600 ease-in-out hover:shadow-2xl hover:scale-105 bg-slate-800/50 backdrop-blur ${
                isPopular 
                  ? 'border-2 border-purple-500/50 shadow-xl shadow-purple-500/20' 
                  : 'border border-slate-700'
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}
              
              <CardHeader className={`text-center space-y-4 ${isPopular ? 'pt-12' : 'pt-8'}`}>
                <div className="flex items-center justify-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    plan.tier_level === 1 ? 'bg-blue-500/20' :
                    plan.tier_level === 2 ? 'bg-yellow-500/20' :
                    'bg-purple-500/20'
                  }`}>
                    <IconComponent className={`h-6 w-6 ${
                      plan.tier_level === 1 ? 'text-blue-400' :
                      plan.tier_level === 2 ? 'text-yellow-400' :
                      'text-purple-400'
                    }`} />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white">
                    {plan.displayName}
                  </CardTitle>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">
                      <OdometerNumber 
                        value={formatStaticPrice(plan.price_inr)}
                        className="transition-all duration-500 ease-out"
                      />
                    </span>
                    <span className="text-slate-400 transition-all duration-500 ease-in-out">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className={`text-sm text-green-400 transition-all duration-500 ease-in-out overflow-hidden ${
                    billingCycle === 'annual' 
                      ? 'max-h-8 opacity-100 transform translate-y-0 scale-100' 
                      : 'max-h-0 opacity-0 transform -translate-y-3 scale-95'
                  }`}>
                    Save {calculateStaticSavings(monthlyPlan.price_inr, annualPlan.price_inr)}% annually
                  </div>
                </div>
                
                <CardDescription className="text-base text-slate-300">
                  {plan.member_limit 
                    ? `Up to ${plan.member_limit} members` 
                    : 'Unlimited members'
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  {plan.features.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <Link href="/signup" className="block">
                  <Button 
                    className={`w-full h-12 font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer ${
                      isPopular 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0' 
                        : 'bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600/50 hover:border-slate-500'
                    }`}
                    variant={isPopular ? 'default' : 'outline'}
                  >
                    Start Free Trial
                  </Button>
                </Link>
                
                <div className="text-center text-xs text-slate-400">
                  14-day free trial • No credit card required
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Additional Info */}
      <div className="mt-12 text-center">
        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-sm p-4 bg-slate-800/30 rounded-lg backdrop-blur">
            <div className="font-semibold text-white mb-1">
              Free Trial
            </div>
            <div className="text-slate-400">
              Try any plan for 14 days
            </div>
          </div>
          <div className="text-sm p-4 bg-slate-800/30 rounded-lg backdrop-blur">
            <div className="font-semibold text-white mb-1">
              No Setup Fees
            </div>
            <div className="text-slate-400">
              Get started immediately
            </div>
          </div>
          <div className="text-sm p-4 bg-slate-800/30 rounded-lg backdrop-blur">
            <div className="font-semibold text-white mb-1">
              Cancel Anytime
            </div>
            <div className="text-slate-400">
              No long-term commitment
            </div>
          </div>
          <div className="text-sm p-4 bg-slate-800/30 rounded-lg backdrop-blur">
            <div className="font-semibold text-white mb-1">
              24/7 Support
            </div>
            <div className="text-slate-400">
              Always here to help
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}