// Static subscription plans data for home page (Phase 1 of Hybrid Approach)
// This provides fast, SEO-friendly pricing without API calls

export interface StaticSubscriptionPlan {
  id: string
  name: string
  displayName: string
  price_inr: number
  billing_cycle: 'monthly' | 'annual'
  plan_type: 'starter' | 'professional' | 'enterprise'
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
}

export const STATIC_SUBSCRIPTION_PLANS: StaticSubscriptionPlan[] = [
  // Starter Plans
  {
    id: "c5ec0e81-5fec-433d-826a-7b79a510acc4",
    name: "Starter Monthly",
    displayName: "Starter",
    price_inr: 299900, // ₹2,999 in paise
    billing_cycle: "monthly",
    plan_type: "starter",
    member_limit: 50,
    features: [
      "Member Management",
      "Basic Check-ins", 
      "Simple Dashboard",
      "Mobile App Access",
      "Email Support"
    ],
    tier_level: 1,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: false,
    custom_reporting: false,
    sort_order: 1
  },
  {
    id: "af0d3003-a367-4036-8ade-120375b1489e",
    name: "Starter Annual",
    displayName: "Starter",
    price_inr: 2999000, // ₹29,990 in paise (annual)
    billing_cycle: "annual", 
    plan_type: "starter",
    member_limit: 50,
    features: [
      "Member Management",
      "Basic Check-ins",
      "Simple Dashboard", 
      "Mobile App Access",
      "Email Support"
    ],
    tier_level: 1,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: false,
    custom_reporting: false,
    sort_order: 1
  },

  // Professional Plans
  {
    id: "8a6535c5-ba94-46dc-b380-8fcf4e636dc8",
    name: "Professional Monthly",
    displayName: "Professional",
    price_inr: 599900, // ₹5,999 in paise
    billing_cycle: "monthly",
    plan_type: "professional",
    member_limit: 200,
    features: [
      "All Starter Features",
      "Advanced Analytics",
      "Member Growth Charts", 
      "Revenue Tracking",
      "Email Notifications",
      "Check-in Trends",
      "12 Month Data Retention"
    ],
    tier_level: 2,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: true,
    custom_reporting: false,
    sort_order: 2,
    is_popular: true
  },
  {
    id: "15ef67de-2f2c-4962-9c87-1bd3ce2ff848",
    name: "Professional Annual", 
    displayName: "Professional",
    price_inr: 5999000, // ₹59,990 in paise (annual)
    billing_cycle: "annual",
    plan_type: "professional",
    member_limit: 200,
    features: [
      "All Starter Features",
      "Advanced Analytics",
      "Member Growth Charts",
      "Revenue Tracking", 
      "Email Notifications",
      "Check-in Trends",
      "12 Month Data Retention"
    ],
    tier_level: 2,
    api_access_enabled: false,
    multi_gym_enabled: false,
    priority_support: false,
    advanced_analytics: true,
    custom_reporting: false,
    sort_order: 2,
    is_popular: true
  },

  // Enterprise Plans
  {
    id: "38024cdd-cca7-4e51-bb69-e910ba85de7f",
    name: "Enterprise Monthly",
    displayName: "Enterprise",
    price_inr: 999900, // ₹9,999 in paise
    billing_cycle: "monthly",
    plan_type: "enterprise",
    member_limit: null,
    features: [
      "All Professional Features",
      "API Access",
      "Multi-Gym Management",
      "Custom Reports",
      "Priority Support",
      "Advanced Retention Analytics",
      "36 Month Data Retention",
      "White-label Options"
    ],
    tier_level: 3,
    api_access_enabled: true,
    multi_gym_enabled: true,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: true,
    sort_order: 3
  },
  {
    id: "4f32c02f-c275-4458-a223-b2bd5cecbea9",
    name: "Enterprise Annual",
    displayName: "Enterprise", 
    price_inr: 9999000, // ₹99,990 in paise (annual)
    billing_cycle: "annual",
    plan_type: "enterprise",
    member_limit: null,
    features: [
      "All Professional Features",
      "API Access",
      "Multi-Gym Management",
      "Custom Reports",
      "Priority Support", 
      "Advanced Retention Analytics",
      "36 Month Data Retention",
      "White-label Options"
    ],
    tier_level: 3,
    api_access_enabled: true,
    multi_gym_enabled: true,
    priority_support: true,
    advanced_analytics: true,
    custom_reporting: true,
    sort_order: 3
  }
]

// Helper functions for static plans
export const getStaticPlansByType = () => {
  const planTypes = ['starter', 'professional', 'enterprise'] as const
  
  return planTypes.map(type => {
    const monthlyPlan = STATIC_SUBSCRIPTION_PLANS.find(
      plan => plan.plan_type === type && plan.billing_cycle === 'monthly'
    )
    const annualPlan = STATIC_SUBSCRIPTION_PLANS.find(
      plan => plan.plan_type === type && plan.billing_cycle === 'annual'
    )
    
    return {
      type,
      monthly: monthlyPlan,
      annual: annualPlan
    }
  }).filter(group => group.monthly && group.annual)
}

export const formatStaticPrice = (priceInPaise: number): number => {
  return Math.round(priceInPaise / 100)
}

export const calculateStaticSavings = (monthlyPrice: number, annualPrice: number): number => {
  const yearlyCostMonthly = monthlyPrice * 12
  const savings = yearlyCostMonthly - annualPrice
  return Math.round((savings / yearlyCostMonthly) * 100)
}