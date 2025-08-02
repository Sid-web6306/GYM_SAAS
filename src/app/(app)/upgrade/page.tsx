'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Crown, 
  Star, 
  Zap,
  Users,
  Shield,
  MessageSquare,
  Timer
} from 'lucide-react';
import { useTrialInfo, type SubscriptionPlan } from '@/hooks/use-trial';
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments';
import { useState } from 'react';
import { OdometerNumber } from "@/components/ui/animated-number";

const UpgradePage = () => {
  const { plans, isLoading: plansLoading, createPayment, currentSubscription } = useSimplifiedPaymentSystem()
  const { data: trialInfo } = useTrialInfo()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId)
    try {
      const result = await createPayment.mutateAsync({
        flow: 'redirect',
        planId,
        billingCycle
      })
      
      // Redirect to checkout URL
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      console.error('Upgrade error:', error)
    } finally {
      setSelectedPlan(null)
    }
  }

  // Calculate savings for annual billing
  const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
    const yearlyCostMonthly = monthlyPrice * 12;
    const savings = yearlyCostMonthly - annualPrice;
    return Math.round((savings / yearlyCostMonthly) * 100);
  };

  // Get current plan
  const currentPlan = currentSubscription?.plan || plans?.find((plan: SubscriptionPlan) => plan.id === currentSubscription?.subscription_plan_id)
  
  // Create plan hierarchy for proper ordering (assuming lower index = lower tier)
  const getPlanHierarchy = (plans: SubscriptionPlan[]) => {
    return plans.sort((a, b) => a.price_monthly_inr - b.price_monthly_inr)
  }
  
  const sortedPlans = plans ? getPlanHierarchy([...plans]) : []

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    )
  }

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
                {currentSubscription?.billing_cycle === 'monthly' && (
                  <span className="block mt-2 text-blue-600 font-medium">
                    💡 Switch to annual billing on your current plan to save up to 17%!
                  </span>
                )}
              </p>
            </div>
            
            {/* Trial Info */}
            {trialInfo && trialInfo.trial_status === 'active' && (
              <div className="flex justify-center">
                <Card className="max-w-md border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-3 text-orange-800">
                      <Timer className="h-5 w-5" />
                      <span className="font-medium">
                        {trialInfo.days_remaining} days left in your trial
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Enhanced Billing Toggle Section - Similar to Home Page */}
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground">Choose your billing cycle</p>
            
            {/* Smooth Animated Toggle */}
            <div className="bg-slate-100 rounded-lg p-1 backdrop-blur relative">
              <div className="flex relative">
                {/* Animated background slider */}
                <div 
                  className={`absolute top-1 bottom-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-md shadow-lg transition-all duration-300 ease-out ${
                    billingCycle === 'monthly' 
                      ? 'left-1 w-[calc(50%-4px)]' 
                      : 'left-[calc(50%+1px)] w-[calc(50%-4px)]'
                  }`}
                />
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-out relative z-10 ${
                    billingCycle === 'monthly'
                      ? 'text-white scale-105'
                      : 'text-slate-600 hover:text-slate-900 hover:scale-105'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 ease-out relative z-10 ${
                    billingCycle === 'annual'
                      ? 'text-white scale-105'
                      : 'text-slate-600 hover:text-slate-900 hover:scale-105'
                  }`}
                >
                  Annual
                  <span className={`absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full transition-all duration-300`}>
                    Save 17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-muted-foreground">Select the plan that best fits your gym&apos;s needs</p>
            </div>
            
            <div className="grid gap-8 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {sortedPlans?.map((plan: SubscriptionPlan, index: number) => {
                const price = billingCycle === 'monthly' ? plan.price_monthly_inr : plan.price_annual_inr
                const isPopular = index === 1 // Professional plan
                const isLoading = createPayment.isPending && selectedPlan === plan.id
                const isCurrentPlan = currentPlan?.id === plan.id
                const isCurrentPlanAndBilling = isCurrentPlan && currentSubscription?.billing_cycle === billingCycle
                const isBillingUpgrade = isCurrentPlan && currentSubscription?.billing_cycle !== billingCycle && currentSubscription?.billing_cycle === 'monthly' && billingCycle === 'annual'
                const isBillingDowngrade = isCurrentPlan && currentSubscription?.billing_cycle !== billingCycle && currentSubscription?.billing_cycle === 'annual' && billingCycle === 'monthly'
                const isBillingChange = isBillingUpgrade || isBillingDowngrade
                
                return (
                  <Card 
                    key={plan.id} 
                    className={`relative transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                      isCurrentPlanAndBilling 
                        ? 'border-emerald-500 shadow-lg scale-105 bg-gradient-to-b from-white to-emerald-50' 
                        : isBillingChange
                        ? 'border-blue-500 shadow-lg scale-105 bg-gradient-to-b from-white to-blue-50'
                        : isPopular 
                        ? 'border-purple-500 shadow-lg scale-105 bg-gradient-to-b from-white to-blue-50' 
                        : 'hover:shadow-lg border-slate-200'
                    }`}
                  >
                    {isCurrentPlanAndBilling && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Current Plan
                        </span>
                      </div>
                    )}
                    {isBillingChange && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          {isBillingUpgrade ? 'Billing Upgrade' : 'Switch Billing'}
                        </span>
                      </div>
                    )}
                    {!isCurrentPlan && isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${
                          index === 0 ? 'bg-blue-100' : 
                          index === 1 ? 'bg-yellow-100' : 
                          'bg-purple-100'
                        }`}>
                          {index === 0 && <Users className="h-5 w-5 text-blue-600" />}
                          {index === 1 && <Star className="h-5 w-5 text-yellow-600" />}
                          {index === 2 && <Zap className="h-5 w-5 text-purple-600" />}
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">
                            <OdometerNumber 
                              value={price / 100} // Convert from paise to rupees
                              className="transition-all duration-300"
                            />
                          </span>
                          <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                        </div>
                        <div className={`text-sm text-green-600 mt-1 overflow-hidden transition-all duration-300 ease-out ${
                          billingCycle === 'annual' ? 'max-h-6 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                        }`}>
                          Save {calculateSavings(plan.price_monthly_inr, plan.price_annual_inr)}%
                          {isBillingUpgrade && (
                            <span className="ml-1 text-blue-600 font-semibold">← Switch & Save!</span>
                          )}
                          {isBillingDowngrade && (
                            <span className="ml-1 text-orange-600 font-semibold">← Switch to monthly</span>
                          )}
                        </div>
                      </div>
                      
                      <CardDescription className="text-base mt-2">
                        {plan.member_limit 
                          ? `Up to ${plan.member_limit} members` 
                          : 'Unlimited members'
                        }
                        {isCurrentPlan && currentSubscription?.billing_cycle && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Currently on {currentSubscription.billing_cycle} billing
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-3">
                        {plan.features.map((feature: string) => (
                          <div key={feature} className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Button 
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading || isCurrentPlanAndBilling}
                        className={`w-full h-12 font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg transform ${
                          isCurrentPlanAndBilling 
                            ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                            : isBillingChange
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                            : isPopular 
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600' 
                            : ''
                        }`}
                        variant={isCurrentPlanAndBilling ? 'outline' : (isBillingChange || isPopular) ? 'default' : 'outline'}
                      >
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            Processing...
                          </div>
                        ) : isCurrentPlanAndBilling ? (
                          'Current Plan'
                        ) : isBillingUpgrade ? (
                          'Upgrade to Annual'
                        ) : isBillingDowngrade ? (
                          'Switch to Monthly'
                        ) : (
                          'Get Started'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Features Comparison Section */}
          <div className="space-y-8">
            <Card className="shadow-lg border-slate-200 hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl">What&apos;s Included</CardTitle>
                <CardDescription className="text-lg">
                  Compare features across all plans
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="grid gap-8 md:grid-cols-3">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      Member Management
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Add/Edit Members
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Member Profiles
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Status Tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Basic Reports
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      Support & Security
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Data Backup
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        SSL Security
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Regular Updates
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Email Support
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <MessageSquare className="h-5 w-5 text-purple-600" />
                      </div>
                      Communication
                    </h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Email Notifications
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        SMS (Pro & Enterprise)
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Custom Templates
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Automated Reminders
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="space-y-8">
            <Card className="shadow-lg border-slate-200 hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Can I change my plan later?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">What happens to my data if I cancel?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Your data will be safely stored for 30 days after cancellation, giving you time to export or reactivate your account.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Do you offer refunds?</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Yes, we offer a 30-day money-back guarantee for all paid plans. Contact support for refund requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  )
}

export default UpgradePage 