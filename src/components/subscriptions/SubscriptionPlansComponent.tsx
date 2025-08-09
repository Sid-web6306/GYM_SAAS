'use client'

import { useState } from 'react'
import { 
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicButton,
  DynamicBadge,
  DynamicUsers,
  DynamicStar,
  DynamicZap,
  DynamicCheck,
  DynamicTimer,
  DynamicCheckCircle
} from '@/lib/dynamic-imports'
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments'
import { OdometerNumber } from '@/components/ui/animated-number'
import { useTrialInfo, isTrialActive, hasActiveSubscription } from '@/hooks/use-trial'
import { logger } from '@/lib/logger'

// Declare global Razorpay type for browser usage
declare global {
  interface Window {
    Razorpay: {
      new (options: Record<string, unknown>): {
        open(): void
      }
    }
  }
}

interface SubscriptionPlan {
  id: string
  name: string
  price_inr: number
  billing_cycle: 'monthly' | 'annual'
  plan_type: string
  member_limit: number | null
  features: string[]
  is_active: boolean
  razorpay_plan_id: string
  tier_level: number
  api_access_enabled: boolean
  multi_gym_enabled: boolean
  priority_support: boolean
  advanced_analytics: boolean
}

interface SubscriptionPlansData {
  plans: SubscriptionPlan[]
  groupedPlans: Record<string, SubscriptionPlan>
}

interface SubscriptionPlansComponentProps {
  onPlanSelect?: (planId: string, billingCycle: 'monthly' | 'annual') => void
  showCurrentPlan?: boolean
  className?: string
  variant?: 'default' | 'premium' // New: premium variant for enhanced animations
}

export function SubscriptionPlansComponent({ 
  onPlanSelect, 
  showCurrentPlan = true,
  className = "",
  variant = 'default'
}: SubscriptionPlansComponentProps) {
  const { plans, isLoading, createPayment, currentSubscription, error } = useSimplifiedPaymentSystem()
  const { data: trialInfo, isLoading: trialLoading } = useTrialInfo()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // Determine user status priority: Trial first, then subscription
  const isOnTrial = trialInfo && isTrialActive(trialInfo)
  const hasSubscription = hasActiveSubscription(currentSubscription || null)
  const showTrialStatus = isOnTrial && !hasSubscription

  // Group plans by type for display
  const groupPlansByType = (subscriptionData: SubscriptionPlansData) => {
    if (!subscriptionData || !subscriptionData.plans) {
      return []
    }

    // If we have grouped plans, use them
    if (subscriptionData.groupedPlans && Object.keys(subscriptionData.groupedPlans).length > 0) {
      const planTypes = ['starter', 'professional', 'enterprise']
      return planTypes.map(type => {
        const monthlyPlan = subscriptionData.groupedPlans[`${type}_monthly`]
        const annualPlan = subscriptionData.groupedPlans[`${type}_annual`]
        return {
          type,
          monthly: monthlyPlan,
          annual: annualPlan,
          current: billingCycle === 'monthly' ? monthlyPlan : annualPlan
        }
      }).filter(group => group.monthly && group.annual) // Only show complete plan types
    }

    // Otherwise, group from plans array
    const planTypes = ['starter', 'professional', 'enterprise']
    return planTypes.map(type => {
      const monthlyPlan = subscriptionData.plans.find((plan: SubscriptionPlan) => 
        plan.plan_type === type && plan.billing_cycle === 'monthly'
      )
      const annualPlan = subscriptionData.plans.find((plan: SubscriptionPlan) => 
        plan.plan_type === type && plan.billing_cycle === 'annual'
      )
      return {
        type,
        monthly: monthlyPlan,
        annual: annualPlan,
        current: billingCycle === 'monthly' ? monthlyPlan : annualPlan
      }
    }).filter(group => group.monthly && group.annual) // Only show complete plan types
  }

  const handlePlanSelect = async (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId, billingCycle)
      return
    }

    // Default behavior: create payment
    setSelectedPlan(planId)
    try {
      const result = await createPayment.mutateAsync({
        flow: 'redirect',
        planId,
        billingCycle
      })
      logger.info('Razorpay checkout result:', {result})
      if (result.checkout) {
        // Check if Razorpay is available
        if (typeof window.Razorpay === 'undefined') {
          throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.')
        }
        
        const razorpayOptions = {
          ...result.checkout,
          handler: function(response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) {
            console.log('Payment successful:', response)
            alert('Payment successful: ' + JSON.stringify(response))
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed by user')
              setSelectedPlan(null)
            }
          }
        }
        
        const razorpayCheckout = new window.Razorpay(razorpayOptions)
        if (typeof razorpayCheckout.open === 'function') {
          razorpayCheckout.open()
        } else {
          throw new Error('Razorpay checkout initialization failed')
        }
      }
    } catch (error) {
      console.error('Plan selection error:', error)
    } finally {
      setSelectedPlan(null)
    }
  }

  // Calculate savings for annual billing
  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const yearlyCostMonthly = monthlyPrice * 12
    const savings = yearlyCostMonthly - annualPrice
    return Math.round((savings / yearlyCostMonthly) * 100)
  }

  // Format price from paise to rupees
  const formatPrice = (priceInPaise: number) => {
    return Math.round(priceInPaise / 100)
  }

  // Get plan icon based on tier
  const getPlanIcon = (tierLevel: number) => {
    switch (tierLevel) {
      case 1: return DynamicUsers
      case 2: return DynamicStar  
      case 3: return DynamicZap
      default: return DynamicUsers
    }
  }

  // Get plan color based on tier
  const getPlanColor = (tierLevel: number) => {
    switch (tierLevel) {
      case 1: return 'blue'
      case 2: return 'yellow'
      case 3: return 'purple'
      default: return 'blue'
    }
  }

  if (isLoading || trialLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-500 mb-2">Failed to load subscription plans</p>
        <p className="text-muted-foreground text-sm">Please try refreshing the page</p>
      </div>
    )
  }

  if (!plans || (!plans.plans && !plans.groupedPlans)) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">No subscription plans available</p>
      </div>
    )
  }

  const groupedPlans = groupPlansByType(plans)
  console.debug("raw plans data:", plans);
  console.debug("processed groupedPlans:", groupedPlans);

  if (groupedPlans.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">No valid subscription plans found</p>
        <p className="text-muted-foreground text-sm mt-2">Please ensure plans are properly configured</p>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Trial Status Section - Priority: Show trial status first */}
      {showTrialStatus && (
        <div className="flex justify-center">
          <DynamicCard className="max-w-md border-2 border-primary/50 bg-gradient-to-r from-card to-primary/5 shadow-lg">
            <DynamicCardContent className="p-6">
              <div className="flex items-center justify-center gap-3 text-primary">
                <DynamicTimer className="h-5 w-5" />
                <span className="font-medium">
                  {trialInfo.days_remaining} days left in your trial
                </span>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm text-muted-foreground">
                  Choose a plan to continue after your trial ends
                </p>
              </div>
            </DynamicCardContent>
          </DynamicCard>
        </div>
      )}

      {/* Current Subscription Status - Show if user has active subscription */}
      {!showTrialStatus && hasSubscription && currentSubscription && (
        <div className="flex justify-center">
          <DynamicCard className="max-w-md border-2 border-primary shadow-xl shadow-primary/20 bg-gradient-to-r from-card to-primary/5">
            <DynamicCardContent className="p-6">
              <div className="flex items-center justify-center gap-3 text-primary">
                <DynamicCheckCircle className="h-5 w-5" />
                <span className="font-medium">
                  Current Plan: {currentSubscription.plan_type?.charAt(0).toUpperCase() + currentSubscription.plan_type?.slice(1)}
                </span>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm text-muted-foreground">
                  {currentSubscription.billing_cycle === 'monthly' ? 'Monthly' : 'Annual'} billing • Next billing: {new Date(currentSubscription.current_period_end).toLocaleDateString('en-IN')}
                </p>
              </div>
            </DynamicCardContent>
          </DynamicCard>
        </div>
      )}

      {/* Enhanced Billing Cycle Toggle */}
      <div className="flex flex-col items-center space-y-4">
        <p className="text-sm text-muted-foreground">Choose your billing cycle</p>
        
        <div className="relative overflow-visible">
          <div className={`flex items-center p-1 rounded-lg backdrop-blur border relative ${
            variant === 'premium' 
              ? 'bg-card/50 border-border shadow-lg' 
              : 'bg-muted/50 border-border'
          }`}>
            {/* Enhanced sliding background indicator */}
            <div 
              className={`absolute top-1 bottom-1 rounded-md shadow-lg transition-all duration-500 ease-in-out transform ${
                variant === 'premium'
                  ? 'bg-gradient-to-r from-primary/80 to-primary shadow-primary/25'
                  : 'bg-gradient-to-r from-primary to-primary/80'
              } ${
                billingCycle === 'monthly' 
                  ? 'left-1 right-[50%] translate-x-0' 
                  : 'left-[50%] right-1 translate-x-0'
              }`}
            />
            
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out ${
                billingCycle === 'monthly'
                  ? 'text-primary-foreground transform scale-105 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:scale-102'
              } ${billingCycle === 'monthly' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`relative z-10 px-8 py-3 text-sm font-medium rounded-md transition-all duration-500 ease-in-out ${
                billingCycle === 'annual'
                  ? 'text-primary-foreground transform scale-105 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:scale-102'
              } ${billingCycle === 'annual' ? 'cursor-default' : 'cursor-pointer'}`}
            >
              Annual
            </button>
          </div>
          
          {/* Enhanced save badge positioned outside the toggle */}
          <DynamicBadge 
            variant="secondary" 
            className={`absolute -top-4 -right-1 z-50 bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/40 text-xs px-2 py-1 whitespace-nowrap shadow-lg backdrop-blur transition-all duration-500 ease-in-out ${
              billingCycle === 'annual' 
                ? 'opacity-100 transform translate-y-0 scale-100' 
                : 'opacity-70 transform translate-y-1 scale-95'
            }`}
          >
            Save 17%
          </DynamicBadge>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-8 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto pt-6">
        {groupedPlans.map((planGroup) => {
          const plan = planGroup.current
          const monthlyPlan = planGroup.monthly
          const annualPlan = planGroup.annual
          
          if (!plan) return null
          console.debug("plan", plan);

          const isPopular = plan.tier_level === 2 // Professional plan
          const isLoading = createPayment.isPending && selectedPlan === plan.id
          const isCurrentPlan = showCurrentPlan && currentSubscription?.subscription_plan_id === plan.id
          const isCurrentPlanAndBilling = isCurrentPlan && currentSubscription?.billing_cycle === billingCycle
          
          const PlanIcon = getPlanIcon(plan.tier_level)
          const planColor = getPlanColor(plan.tier_level)
          
          return (
            <DynamicCard 
              key={plan.plan_type} 
              className={`relative transition-all ${
                variant === 'premium' ? 'duration-600' : 'duration-300'
              } ease-in-out hover:shadow-2xl hover:scale-105 backdrop-blur ${
                isCurrentPlanAndBilling 
                  ? 'border-2 border-primary shadow-xl shadow-primary/20 scale-105 bg-gradient-to-b from-card to-primary/5' 
                  : isPopular 
                  ? 'border-2 border-primary/70 shadow-xl shadow-primary/10 scale-105 bg-gradient-to-b from-card to-primary/5' 
                  : `hover:shadow-lg border border-border ${variant === 'premium' ? 'bg-card/50' : 'bg-card'}`
              }`}
            >
              {isCurrentPlanAndBilling && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
                  <DynamicBadge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg border-0">
                    Current Plan
                  </DynamicBadge>
                </div>
              )}
              {!isCurrentPlan && isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-50">
                  <DynamicBadge className="bg-gradient-to-r from-primary/90 to-primary/70 text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg border-0">
                    Most Popular
                  </DynamicBadge>
                </div>
              )}
              
              <DynamicCardHeader className="text-center pb-4 pt-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${
                    planColor === 'blue' ? 'bg-primary/10' : 
                    planColor === 'yellow' ? 'bg-primary/15' : 
                    'bg-primary/20'
                  }`}>
                    <PlanIcon className={`h-5 w-5 ${
                      planColor === 'blue' ? 'text-primary/80' : 
                      planColor === 'yellow' ? 'text-primary' : 
                      'text-primary'
                    }`} />
                  </div>
                  <DynamicCardTitle className="text-xl">
                    {plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)}
                  </DynamicCardTitle>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      <OdometerNumber 
                        value={formatPrice(plan.price_inr)}
                        className="transition-all duration-300"
                      />
                    </span>
                    <span className="text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className={`text-sm text-green-600 dark:text-green-400 mt-1 overflow-hidden transition-all duration-300 ease-out ${
                    billingCycle === 'annual' ? 'max-h-6 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                  }`}>
                    {monthlyPlan && annualPlan && (
                      <>Save {calculateSavings(monthlyPlan.price_inr, annualPlan.price_inr)}% annually</>
                    )}
                  </div>
                </div>
                
                <DynamicCardDescription className="text-base mt-2">
                  {plan.member_limit 
                    ? `Up to ${plan.member_limit} members` 
                    : 'Unlimited members'
                  }
                </DynamicCardDescription>
              </DynamicCardHeader>
              
              <DynamicCardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  {plan.features.map((feature: string) => (
                    <div key={feature} className="flex items-center gap-3">
                      <DynamicCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <DynamicButton 
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isLoading || isCurrentPlanAndBilling}
                  className={`w-full h-12 font-medium transition-all ${
                    variant === 'premium' ? 'duration-500' : 'duration-300'
                  } ease-in-out hover:scale-105 hover:shadow-lg transform ${
                    isCurrentPlanAndBilling 
                      ? 'bg-primary/10 text-primary cursor-not-allowed border-primary/20'
                      : isPopular 
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 cursor-pointer border-0' 
                      : 'cursor-pointer hover:bg-primary/5 hover:border-primary/50'
                  } ${isLoading ? 'cursor-wait' : ''}`}
                  variant={isCurrentPlanAndBilling ? 'outline' : isPopular ? 'default' : 'outline'}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Creating secure checkout...
                    </div>
                  ) : isCurrentPlanAndBilling ? (
                    <div className="flex items-center gap-2">
                      <DynamicCheckCircle className="h-4 w-4" />
                      Current Plan
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DynamicZap className="h-4 w-4" />
                      Get Started - Pay with Razorpay
                    </div>
                  )}
                </DynamicButton>
              </DynamicCardContent>
            </DynamicCard>
          )
        })}
      </div>
    </div>
  )
}