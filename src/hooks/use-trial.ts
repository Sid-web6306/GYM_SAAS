import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { createClient } from '@/utils/supabase/client'
import { logger } from '@/lib/logger'
import { toastActions } from '@/stores/toast-store'

// Type definitions (keeping the useful ones)
export interface SubscriptionPlan {
  id: string
  name: string
  price_monthly_inr: number
  price_annual_inr: number
  member_limit: number | null
  features: string[]
  is_active: boolean
  stripe_product_id: string | null
}

export interface TrialInfo {
  trial_start_date: string | null
  trial_end_date: string | null
  trial_status: 'active' | 'expired' | 'converted'
  days_remaining: number
}

export interface SubscriptionInfo {
  id: string
  user_id: string
  subscription_plan_id: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'scheduled'
  billing_cycle: 'monthly' | 'annual'
  starts_at: string
  current_period_start: string
  current_period_end: string
  ends_at: string | null
  canceled_at: string | null
  scheduled_change_type: string | null
  scheduled_change_effective_date: string | null
  scheduled_change_data: Record<string, unknown> | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  amount: number
  currency: string
  created_at: string
  updated_at: string
  // Trial fields (now in subscriptions table)
  trial_start_date: string | null
  trial_end_date: string | null
  trial_status: string | null
  // Related data
  plan?: SubscriptionPlan
}

// Updated trial hook - now gets trial data from subscriptions table
export function useTrialInfo() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['trial-info-v2', user?.id],
    queryFn: async (): Promise<TrialInfo> => {
      if (!user?.id) throw new Error('User not authenticated')
      
      const supabase = createClient()
      
      // First try to get trial data from subscriptions table
      const { data: subscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { order: (column: string, options: { ascending: boolean }) => { limit: (count: number) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } } }).from('subscriptions')
        .select('trial_start_date, trial_end_date, trial_status, status, stripe_subscription_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (subscription) {
        const subscriptionData = subscription as Record<string, unknown>
        const trialEndDate = subscriptionData.trial_end_date ? new Date(subscriptionData.trial_end_date as string) : null
        const today = new Date()
        const days_remaining = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))) : 0
        
        // Determine trial status based on subscription data
        let trial_status: 'active' | 'expired' | 'converted' = 'active'
        if (subscriptionData.status === 'canceled' || days_remaining <= 0) {
          trial_status = 'expired'
        } else if (subscriptionData.stripe_subscription_id) {
          trial_status = 'converted'
        }
        
        return {
          trial_start_date: subscriptionData.trial_start_date as string,
          trial_end_date: subscriptionData.trial_end_date as string,
          trial_status,
          days_remaining
        }
      }
      
      // No trial subscription found - return default/expired trial info
      return {
        trial_start_date: null,
        trial_end_date: null,
        trial_status: 'expired',
        days_remaining: 0
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })
}

// UTILITY FUNCTIONS (keeping these as they're still useful)

// Helper function to format currency amount
export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100) // Convert from paise to rupees
}

// Helper function to format subscription period remaining
export function formatTimeRemaining(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''}`
  }
  
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }
  
  const years = Math.floor(diffInDays / 365)
  const remainingMonths = Math.floor((diffInDays % 365) / 30)
  
  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`
  }
  
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
}

// Helper function to calculate annual savings percentage
export const getAnnualSavings = (monthlyPrice: number, annualPrice: number): number => {
  const monthlyCost = monthlyPrice * 12
  const savings = ((monthlyCost - annualPrice) / monthlyCost) * 100
  return Math.round(savings)
}

// Helper function to calculate annual savings amount
export const getAnnualSavingsAmount = (monthlyPrice: number, annualPrice: number): number => {
  const monthlyCost = monthlyPrice * 12
  return monthlyCost - annualPrice
}

// Trial status helper functions
export const isTrialExpiringSoon = (trialInfo: TrialInfo): boolean => {
  return trialInfo.trial_status === 'active' && trialInfo.days_remaining <= 3
}

export const isTrialActive = (trialInfo: TrialInfo): boolean => {
  return trialInfo.trial_status === 'active' && trialInfo.days_remaining > 0
}

export const hasActiveSubscription = (subscriptionInfo: SubscriptionInfo | null): boolean => {
  return subscriptionInfo?.status === 'active' && (subscriptionInfo?.trial_status === 'converted' || subscriptionInfo?.trial_status === null)
}

export const isSubscriptionCanceled = (subscriptionInfo: SubscriptionInfo | null): boolean => {
  return subscriptionInfo?.status === 'canceled'
}

// Helper function to get subscription status color for UI
export const getSubscriptionStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'green'
    case 'canceled': return 'red'
    case 'past_due': return 'orange'
    case 'incomplete': return 'gray'
    case 'paused': return 'yellow'
    case 'scheduled': return 'blue'
    default: return 'gray'
  }
}

// Helper function to get human-readable subscription status
export const getSubscriptionStatusText = (status: string): string => {
  switch (status) {
    case 'active': return 'Active'
    case 'canceled': return 'Canceled'
    case 'past_due': return 'Past Due'
    case 'incomplete': return 'Incomplete'
    case 'scheduled': return 'Scheduled'
    case 'paused': return 'Paused'
    default: return 'Unknown'
  }
}

// Helper function to get trial status color for UI
export const getTrialStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'green'
    case 'expired': return 'red'
    case 'converted': return 'blue'
    default: return 'gray'
  }
}

// Helper function to get human-readable trial status
export const getTrialStatusText = (status: string): string => {
  switch (status) {
    case 'active': return 'Active Trial'
    case 'expired': return 'Trial Expired'
    case 'converted': return 'Subscribed'
    default: return 'Unknown'
  }
}

// Helper function to determine if user needs to upgrade
export const shouldShowUpgradePrompt = (trialInfo: TrialInfo, subscriptionInfo: SubscriptionInfo | null): boolean => {
  return (trialInfo.trial_status === 'expired' || isTrialExpiringSoon(trialInfo)) && !hasActiveSubscription(subscriptionInfo)
}

// Helper function to get plan by ID
export const findPlanById = (plans: SubscriptionPlan[], id: string): SubscriptionPlan | undefined => {
  return plans.find(plan => plan.id === id)
}

// Helper function to get available billing cycles for a plan
export const getAvailableBillingCycles = (plan: SubscriptionPlan): ('monthly' | 'annual')[] => {
  const cycles: ('monthly' | 'annual')[] = []
  if (plan.price_monthly_inr > 0) cycles.push('monthly')
  if (plan.price_annual_inr > 0) cycles.push('annual')
  return cycles
}

// Helper function to get plan price by billing cycle
export const getPlanPrice = (plan: SubscriptionPlan, billingCycle: 'monthly' | 'annual'): number => {
  return billingCycle === 'monthly' ? plan.price_monthly_inr : plan.price_annual_inr
}

// Trial initialization mutation
interface TrialInitializationResponse {
  subscriptionId: string
  success: boolean
  message?: string
}

interface TrialInitializationError {
  message: string
  code?: string
}

export function useTrialInitialization() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation<TrialInitializationResponse, TrialInitializationError, void>({
    mutationFn: async (): Promise<TrialInitializationResponse> => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw { message: 'Authentication required' }
      }

      logger.info('Initializing trial subscription', { userId: user.id })

      // Call the RPC function to initialize trial subscription
      const { data: subscriptionId, error } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('initialize_trial_subscription', {
        p_user_id: user.id
      })

      if (error) {
        const errorData = error as Record<string, unknown>
        logger.error('Trial initialization failed', { 
          error: errorData.message as string, 
          userId: user.id 
        })
        
        // Handle specific error cases
        if ((errorData.message as string).includes('already has a trial subscription')) {
          throw { message: 'You already have an active trial subscription', code: 'TRIAL_EXISTS' }
        }
        
        if ((errorData.message as string).includes('No active subscription plan found')) {
          throw { message: 'No subscription plans available at the moment', code: 'NO_PLANS' }
        }
        
        throw { message: errorData.message as string || 'Failed to initialize trial subscription' }
      }

      if (!subscriptionId) {
        throw { message: 'Failed to create trial subscription' }
      }

      logger.info('Trial subscription initialized successfully', { 
        userId: user.id, 
        subscriptionId 
      })

      return {
        subscriptionId: subscriptionId as string,
        success: true,
        message: 'Trial subscription started successfully!'
      }
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['trial-info'] })
      queryClient.invalidateQueries({ queryKey: ['trial-info-v2'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions-consolidated'] })
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      
      // Show success message
      toastActions.success('Trial Started!', data.message || 'Your 14-day free trial has begun.')
      
      logger.info('Trial initialization successful - queries invalidated')
    },
    onError: (error) => {
      // Show appropriate error message
      if (error.code === 'TRIAL_EXISTS') {
        toastActions.info('Trial Active', 'You already have an active trial subscription.')
      } else if (error.code === 'NO_PLANS') {
        toastActions.error('Setup Issue', 'No subscription plans are available. Please contact support.')
      } else {
        toastActions.error('Trial Setup Failed', error.message || 'Unable to start your trial. Please try again.')
      }
      
      logger.error('Trial initialization failed', { error: error.message })
    },
    // Prevent multiple simultaneous trial initialization attempts
    networkMode: 'offlineFirst',
    retry: (failureCount, error) => {
      // Don't retry if user already has trial or no plans available
      if (error.code === 'TRIAL_EXISTS' || error.code === 'NO_PLANS') {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: 1000, // 1 second delay between retries
  })
} 