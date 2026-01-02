/**
 * Static Subscription Plans - Predefined gym subscription plans
 * Centralized subscription plan definitions
 */

export interface StaticSubscriptionPlan {
  id: string
  name: string
  displayName: string
  price_inr: number
  billing_cycle: 'monthly' | 'annual'
  plan_type: 'basic' | 'premium' | 'enterprise'
  member_limit: number | null
  features: string[]
  tier_level: number
  api_access_enabled: boolean
  multi_gym_enabled: boolean
  priority_support: boolean
  advanced_analytics: boolean
  custom_reporting: boolean
  sort_order: number
  is_popular?: boolean
  // New fields for compatibility
  type: 'basic' | 'premium' | 'enterprise'
  description: string
  trial_days: number
  popular?: boolean
  razorpay_plan_id?: string
}

export const STATIC_SUBSCRIPTION_PLANS: StaticSubscriptionPlan[] = [
  {
    id: 'basic-monthly',
    name: 'Basic',
    displayName: 'Basic',
    description: 'Perfect for small gyms and personal trainers',
    type: 'basic',
    plan_type: 'basic',
    billing_cycle: 'monthly',
    price_inr: 999,
    features: [
      'Up to 50 members',
      'Basic analytics',
      'Member management',
      'Attendance tracking',
      'Email support'
    ],
    member_limit: 50,
    trial_days: 14,
    tier_level: 1,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: false,
    custom_reporting: false,
    sort_order: 1
  },
  {
    id: 'basic-annual',
    name: 'Basic',
    displayName: 'Basic',
    description: 'Perfect for small gyms and personal trainers (Annual)',
    type: 'basic',
    plan_type: 'basic',
    billing_cycle: 'annual',
    price_inr: 9999,
    features: [
      'Up to 50 members',
      'Basic analytics',
      'Member management',
      'Attendance tracking',
      'Email support',
      '2 months free'
    ],
    member_limit: 50,
    trial_days: 14,
    tier_level: 1,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: false,
    custom_reporting: false,
    sort_order: 1
  },
  {
    id: 'premium-monthly',
    name: 'Premium',
    displayName: 'Premium',
    description: 'Ideal for growing gyms and fitness centers',
    type: 'premium',
    plan_type: 'premium',
    billing_cycle: 'monthly',
    price_inr: 2999,
    features: [
      'Up to 200 members',
      'Advanced analytics',
      'Member management',
      'Attendance tracking',
      'Class scheduling',
      'Inventory management',
      'Priority support',
      'Mobile app access'
    ],
    member_limit: 200,
    trial_days: 21,
    tier_level: 2,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: false,
    sort_order: 2,
    popular: true,
    is_popular: true
  },
  {
    id: 'premium-annual',
    name: 'Premium',
    displayName: 'Premium',
    description: 'Ideal for growing gyms and fitness centers (Annual)',
    type: 'premium',
    plan_type: 'premium',
    billing_cycle: 'annual',
    price_inr: 29999,
    features: [
      'Up to 200 members',
      'Advanced analytics',
      'Member management',
      'Attendance tracking',
      'Class scheduling',
      'Inventory management',
      'Priority support',
      'Mobile app access',
      '2 months free'
    ],
    member_limit: 200,
    trial_days: 21,
    tier_level: 2,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: false,
    sort_order: 2
  },
  {
    id: 'enterprise-monthly',
    name: 'Enterprise',
    displayName: 'Enterprise',
    description: 'Complete solution for large gym chains',
    type: 'enterprise',
    plan_type: 'enterprise',
    billing_cycle: 'monthly',
    price_inr: 9999,
    features: [
      'Unlimited members',
      'Advanced analytics',
      'Member management',
      'Attendance tracking',
      'Class scheduling',
      'Inventory management',
      'Priority support',
      'Mobile app access',
      'API access',
      'Custom branding',
      'Dedicated account manager'
    ],
    member_limit: -1,
    trial_days: 30,
    tier_level: 3,
    api_access_enabled: true,
    multi_gym_enabled: true,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: true,
    sort_order: 3
  },
  {
    id: 'enterprise-annual',
    name: 'Enterprise',
    displayName: 'Enterprise',
    description: 'Complete solution for large gym chains (Annual)',
    type: 'enterprise',
    plan_type: 'enterprise',
    billing_cycle: 'annual',
    price_inr: 99999,
    features: [
      'Unlimited members',
      'Advanced analytics',
      'Member management',
      'Attendance tracking',
      'Class scheduling',
      'Inventory management',
      'Priority support',
      'Mobile app access',
      'API access',
      'Custom branding',
      'Dedicated account manager',
      '2 months free'
    ],
    member_limit: -1,
    trial_days: 30,
    tier_level: 3,
    api_access_enabled: true,
    multi_gym_enabled: true,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: true,
    sort_order: 3
  }
] as const

// Helper functions
export function getPlanById(id: string): StaticSubscriptionPlan | undefined {
  return STATIC_SUBSCRIPTION_PLANS.find(plan => plan.id === id)
}

export function getPlansByType(type: StaticSubscriptionPlan['type']): StaticSubscriptionPlan[] {
  return STATIC_SUBSCRIPTION_PLANS.filter(plan => plan.type === type)
}

export function getPlansByBillingCycle(cycle: StaticSubscriptionPlan['billing_cycle']): StaticSubscriptionPlan[] {
  return STATIC_SUBSCRIPTION_PLANS.filter(plan => plan.billing_cycle === cycle)
}

export function getPopularPlans(): StaticSubscriptionPlan[] {
  return STATIC_SUBSCRIPTION_PLANS.filter(plan => plan.popular)
}

export function getPlanPriceInINR(id: string): number | undefined {
  const plan = getPlanById(id)
  return plan?.price_inr
}

export function getPlanFeatures(id: string): string[] | undefined {
  const plan = getPlanById(id)
  return plan?.features
}

export function getMemberLimit(id: string): number | undefined {
  const plan = getPlanById(id)
  return plan?.member_limit === null ? undefined : plan?.member_limit
}

// Legacy functions for compatibility with existing components
export const getStaticPlansByType = () => {
  const planTypes = ['basic', 'premium', 'enterprise'] as const
  
  return planTypes.map(type => {
    const monthlyPlan = STATIC_SUBSCRIPTION_PLANS.find(
      plan => plan.type === type && plan.billing_cycle === 'monthly'
    )
    const annualPlan = STATIC_SUBSCRIPTION_PLANS.find(
      plan => plan.type === type && plan.billing_cycle === 'annual'
    )
    
    return {
      type,
      monthly: monthlyPlan,
      annual: annualPlan
    }
  }).filter(group => group.monthly && group.annual)
}

export const formatStaticPrice = (priceInINR: number): number => {
  return Math.round(priceInINR)
}

export const calculateStaticSavings = (monthlyPrice: number, annualPrice: number): number => {
  const yearlyCostMonthly = monthlyPrice * 12
  const savings = yearlyCostMonthly - annualPrice
  return Math.round((savings / yearlyCostMonthly) * 100)
}
