import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { PaymentService } from '@/services/payment.service'
import { logger } from '@/lib/logger'
import type { Tables } from '@/types/supabase'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Helper function to get user's gym_id
async function getUserGymId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gym_id')
    .eq('id', userId)
    .single()
  
  return profile?.gym_id || null
}

// GET /api/subscriptions - Get subscription plans and user's current subscription
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'plans', 'current', or 'billing-portal'
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle different actions
    switch (action) {
      case 'plans':
        return handleGetPlans(supabase)
      
      case 'current':
        return handleGetCurrentSubscription(supabase, user.id)
      
      case 'billing-portal':
        return handleCreateBillingPortal(supabase, user)
      
      default:
        // Default: return both plans and current subscription
        const [plansResponse, currentResponse] = await Promise.all([
          handleGetPlans(supabase),
          handleGetCurrentSubscription(supabase, user.id)
        ])
        
        const plansData = await plansResponse.json()
        const currentData = await currentResponse.json()
        
        return NextResponse.json({
          plans: plansData.plans || [],
          groupedPlans: plansData.groupedPlans || {},
          currentSubscription: currentData.subscription || null,
          hasAccess: currentData.hasAccess || false
        })
    }

  } catch (error) {
    logger.error('Subscriptions GET error:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subscriptions - Create or modify subscription
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json()
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    switch (action) {
      case 'pause':
        return handlePauseSubscription(supabase, user.id, params.subscriptionId)
      
      case 'resume':
        return handleResumeSubscription(supabase, user.id, params.subscriptionId)
      
      case 'cancel':
        return handleCancelSubscription(supabase, user.id, params.subscriptionId, params.cancelAtPeriodEnd, params.feedback)
      
      case 'change-plan':
        return handleChangePlan(supabase, user.id, params.subscriptionId, params.newPlanId, params.billingCycle)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Subscriptions POST error:', {error})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to get subscription plans
async function handleGetPlans(supabase: SupabaseClient) {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('id, name, price_inr, billing_cycle, plan_type, member_limit, features, is_active, razorpay_plan_id, tier_level, api_access_enabled, multi_gym_enabled, priority_support, advanced_analytics')
      .eq('is_active', true)
      .order('price_inr')
    
    if (error) {
      logger.error('Error fetching subscription plans:', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }
    
    // Group plans by plan_type and billing_cycle for easier frontend consumption
    const groupedPlans: Record<string, Tables<'subscription_plans'>> = {}
    const typedPlans = (plans ?? []) as Tables<'subscription_plans'>[]
    for (const plan of typedPlans) {
      const key = `${plan.plan_type ?? 'default'}_${plan.billing_cycle}`
      groupedPlans[key] = plan
    }
    
    return NextResponse.json({ plans: plans || [], groupedPlans: groupedPlans || {} })
  } catch (error) {
    logger.error('Error in handleGetPlans:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// Helper function to get current subscription
async function handleGetCurrentSubscription(supabase: SupabaseClient, userId: string) {
  try {
    // Get user's gym_id first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.gym_id) {
      logger.error('Error getting user profile or gym_id:', { error: profileError?.message })
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check gym subscription access
    const { data: hasAccess, error: accessError } = await supabase.rpc('check_subscription_access', {
      p_user_id: userId,
    })

    if (accessError) {
      logger.error('Error checking gym subscription access:', { error: accessError.message })
    }

    // Get current subscription details with plan information
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('user_id', userId)
      .eq('gym_id', profile.gym_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error('Error fetching current subscription:', { error: subError.message })
    }

    // Get trial info from current subscription
    let trialStatus = null
    if (subscription) {
      if (subscription.status === 'active' && subscription.trial_end_date) {
        const trialEndDate = new Date(subscription.trial_end_date)
        const now = new Date()
        trialStatus = trialEndDate > now ? 'active' : 'expired'
      } else if (subscription.trial_status) {
        trialStatus = subscription.trial_status
      }
    }

    logger.info('Subscription fetched', {
      userId,
      subscriptionId: subscription?.id,
      status: subscription?.status
    })

    return NextResponse.json({ 
      subscription: subscription || null,
      hasAccess: hasAccess || false,
      trial: subscription && subscription.trial_start_date ? {
        startDate: subscription.trial_start_date,
        endDate: subscription.trial_end_date,
        status: trialStatus
      } : null
    })
  } catch (error) {
    logger.error('Error in handleGetCurrentSubscription:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

// Helper function to create billing portal session
type MinimalUser = { id: string; email?: string | null }
async function handleCreateBillingPortal(supabase: SupabaseClient, user: MinimalUser) {
  try {
    if (!PaymentService.isConfigured()) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    // Get user's gym_id first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.gym_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Check if gym has an active subscription
    const { data: hasAccess, error: accessError } = await supabase.rpc('check_subscription_access', {
      p_user_id: user.id,
    })

    if (accessError || !hasAccess) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Get user's gym_id
    const gymId = await getUserGymId(supabase, user.id)
    if (!gymId) {
      return NextResponse.json({ error: 'User gym not found' }, { status: 404 })
    }

    // Get current subscription to find Razorpay subscription ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('razorpay_subscription_id, razorpay_customer_id')
      .eq('user_id', user.id)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .single()

    if (!subscription?.razorpay_subscription_id) {
      return NextResponse.json({ error: 'No active Razorpay subscription found' }, { status: 400 })
    }

    // For Razorpay, we'll redirect to their dashboard or create a custom billing page
    // Since Razorpay doesn't have a built-in billing portal like Stripe, 
    // we'll return the subscription details for a custom billing interface
    try {
      const razorpaySubscription = await PaymentService.fetchSubscription(subscription.razorpay_subscription_id)
      
      logger.info('Billing portal data retrieved:', {
        userId: user.id,
        subscriptionId: subscription.razorpay_subscription_id,
        status: razorpaySubscription.status
      })

      // Return subscription data for custom billing portal
      return NextResponse.json({ 
        subscriptionId: razorpaySubscription.id,
        status: razorpaySubscription.status,
        planId: razorpaySubscription.plan_id,
        customerId: razorpaySubscription.customer_id,
        currentStart: razorpaySubscription.current_start,
        currentEnd: razorpaySubscription.current_end,
        chargeAt: razorpaySubscription.charge_at,
        // Note: For a full billing portal, you'd implement a custom page
        // that handles subscription modifications using Razorpay APIs
        redirectUrl: `/billing-portal?subscription_id=${razorpaySubscription.id}`
      })

    } catch (error) {
      logger.error('Error fetching Razorpay subscription:', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Failed to fetch subscription details' }, { status: 500 })
    }

  } catch (error) {
    logger.error('Billing portal creation error:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 })
  }
}

// Helper function to pause subscription
async function handlePauseSubscription(supabase: SupabaseClient, userId: string, subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    if (!PaymentService.isConfigured()) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    // Get user's gym_id
    const gymId = await getUserGymId(supabase, userId)
    if (!gymId) {
      return NextResponse.json({ error: 'User gym not found' }, { status: 404 })
    }

    // Verify subscription belongs to user and gym
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, razorpay_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Pause subscription in database
    const { error: pauseError } = await supabase.rpc('pause_subscription', {
      p_subscription_id: subscriptionId
    })

    if (pauseError) {
      logger.error('Error pausing subscription:', { error: pauseError.message })
      return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 })
    }

    // Pause in Razorpay if available
    if (subscription.razorpay_subscription_id) {
      try {
        await PaymentService.pauseSubscription(subscription.razorpay_subscription_id, 'now')
      } catch (razorpayError) {
        logger.error('Error pausing Razorpay subscription:', { error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError) })
        // Don't fail the request if Razorpay update fails
      }
    }

    logger.info('Subscription paused successfully:', {
      userId,
      subscriptionId,
      razorpaySubscriptionId: subscription.razorpay_subscription_id
    })

    return NextResponse.json({ success: true, message: 'Subscription paused successfully' })

  } catch (error) {
    logger.error('Error in handlePauseSubscription:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 })
  }
}

// Helper function to resume subscription
async function handleResumeSubscription(supabase: SupabaseClient, userId: string, subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    if (!PaymentService.isConfigured()) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    // Get user's gym_id
    const gymId = await getUserGymId(supabase, userId)
    if (!gymId) {
      return NextResponse.json({ error: 'User gym not found' }, { status: 404 })
    }

    // Verify subscription belongs to user and gym
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, razorpay_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Resume subscription in database
    const { error: resumeError } = await supabase.rpc('resume_subscription', {
      p_subscription_id: subscriptionId
    })

    if (resumeError) {
      logger.error('Error resuming subscription:', { error: resumeError.message })
      return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
    }

    // Resume in Razorpay if available
    if (subscription.razorpay_subscription_id) {
      const razorpaySubscriptionId = subscription.razorpay_subscription_id
      const maxAttempts = 3
      let attempt = 0
      let lastError: unknown = null

      while (attempt < maxAttempts) {
        try {
          attempt++
          await PaymentService.resumeSubscription(razorpaySubscriptionId, 'now')
          break
        } catch (razorpayError) {
          lastError = razorpayError
          logger.error('Error resuming Razorpay subscription:', {
            userId,
            subscriptionId,
            razorpaySubscriptionId,
            attempt,
            maxAttempts,
            error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
            stack: razorpayError instanceof Error ? razorpayError.stack : undefined
          })
          if (attempt < maxAttempts) {
            // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, attempt * 200))
          }
        }
      }

      if (attempt === maxAttempts) {
        // Roll back DB resume to maintain consistency if Razorpay failed
        const { error: rollbackError } = await supabase.rpc('pause_subscription', {
          p_subscription_id: subscriptionId
        })

        if (rollbackError) {
          logger.error('Failed to rollback subscription after Razorpay resume failure:', {
            userId,
            subscriptionId,
            razorpaySubscriptionId,
            lastError: lastError instanceof Error ? lastError.message : String(lastError),
            rollbackError: rollbackError.message
          })
        } else {
          logger.warn('Rolled back subscription to paused state after Razorpay resume failure:', {
            userId,
            subscriptionId,
            razorpaySubscriptionId,
            lastError: lastError instanceof Error ? lastError.message : String(lastError)
          })
        }

        return NextResponse.json(
          { error: 'Failed to resume subscription with payment provider. Subscription remains paused.' },
          { status: 502 }
        )
      }
    }

    logger.info('Subscription resumed successfully:', {
      userId,
      subscriptionId,
      razorpaySubscriptionId: subscription.razorpay_subscription_id
    })

    return NextResponse.json({ success: true, message: 'Subscription resumed successfully' })

  } catch (error) {
    logger.error('Error in handleResumeSubscription:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
  }
}

// Helper function to cancel subscription
type CancellationFeedback = {
  reason: string
  feedbackText?: string | null
  rating?: number | null
  wouldRecommend?: boolean | null
}
async function handleCancelSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true,
  feedback?: CancellationFeedback
) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    if (!PaymentService.isConfigured()) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    // Get user's gym_id
    const gymId = await getUserGymId(supabase, userId)
    if (!gymId) {
      return NextResponse.json({ error: 'User gym not found' }, { status: 404 })
    }

    // Verify subscription belongs to user and gym
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, razorpay_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Save feedback if provided
    if (feedback) {
      const { error: feedbackError } = await supabase
        .from('feedback')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          reason: feedback.reason,
          feedback_text: feedback.feedbackText || null,
          rating: feedback.rating || null,
          would_recommend: feedback.wouldRecommend || null
        })

      if (feedbackError) {
        logger.error('Error saving feedback:', { error: feedbackError.message })
        // Don't fail the cancellation if feedback saving fails
      } else {
        logger.info('Feedback saved successfully:', {
          userId,
          subscriptionId,
          reason: feedback.reason
        })
      }
    }

    // Cancel subscription in database
    const { error: cancelError } = await supabase.rpc('cancel_subscription', {
      p_subscription_id: subscriptionId,
      p_cancel_at_period_end: cancelAtPeriodEnd
    })

    if (cancelError) {
      logger.error('Error canceling subscription:', { error: cancelError.message })
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }

    // Cancel in Razorpay if available
    if (subscription.razorpay_subscription_id) {
      try {
        if (cancelAtPeriodEnd) {
          // Schedule cancellation at period end
          await PaymentService.cancelSubscription(subscription.razorpay_subscription_id, true)
        } else {
          // Cancel immediately
          await PaymentService.cancelSubscription(subscription.razorpay_subscription_id, false)
        }
      } catch (razorpayError) {
        logger.error('Error canceling Razorpay subscription:', { error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError) })
        // Don't fail the request if Razorpay update fails
      }
    }

    logger.info('Subscription canceled successfully:', {
      userId,
      subscriptionId,
      razorpaySubscriptionId: subscription.razorpay_subscription_id,
      cancelAtPeriodEnd,
      feedbackProvided: !!feedback
    })

    return NextResponse.json({ 
      success: true, 
      message: cancelAtPeriodEnd ? 'Subscription will be canceled at the end of the billing period' : 'Subscription canceled immediately'
    })

  } catch (error) {
    logger.error('Error in handleCancelSubscription:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}

// Helper function to change subscription plan
async function handleChangePlan(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string,
  newPlanId: string,
  billingCycle: 'monthly' | 'annual'
) {
  try {
    if (!subscriptionId || !newPlanId || !billingCycle) {
      return NextResponse.json({ error: 'Subscription ID, new plan ID, and billing cycle are required' }, { status: 400 })
    }

    // Get user's gym_id
    const gymId = await getUserGymId(supabase, userId)
    if (!gymId) {
      return NextResponse.json({ error: 'User gym not found' }, { status: 404 })
    }

    // Verify subscription belongs to user and gym
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, razorpay_subscription_id, subscription_plan_id, current_period_end')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get the new plan details
    const { data: newPlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .eq('billing_cycle', billingCycle)
      .single()

    if (!newPlan) {
      return NextResponse.json({ error: 'New plan not found' }, { status: 404 })
    }

    // Try to schedule the plan change in Razorpay at cycle end (pending update)
    let razorpayUpdateAttempted = false
    let razorpayUpdateSucceeded = false
    if (PaymentService.isConfigured() && subscription.razorpay_subscription_id && newPlan.razorpay_plan_id) {
      razorpayUpdateAttempted = true
      try {
        await PaymentService.updateSubscription(subscription.razorpay_subscription_id, {
          plan_id: newPlan.razorpay_plan_id,
          schedule_change_at: 'now'
        })
        razorpayUpdateSucceeded = true
      } catch (razorpayError) {
        razorpayUpdateSucceeded = false
        logger.warn('Failed to schedule Razorpay plan change at cycle end; will rely on DB scheduling', {
          error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
          subscriptionId,
          newPlanId,
          billingCycle
        })
      }
    }

    // Schedule the plan change in our database at the end of current billing period
    const effectiveDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toISOString()
      : new Date().toISOString()

    const { error: scheduleError } = await supabase.rpc('schedule_subscription_change', {
      p_subscription_id: subscriptionId,
      p_change_type: 'plan_change',
      p_effective_date: effectiveDate,
      p_change_data: {
        new_plan_id: newPlanId,
        new_billing_cycle: billingCycle,
        new_amount: newPlan.price_inr,
        new_razorpay_plan_id: newPlan.razorpay_plan_id
      }
    })

    if (scheduleError) {
      logger.error('Error scheduling plan change:', { error: scheduleError.message })
      return NextResponse.json({ error: 'Failed to schedule plan change' }, { status: 500 })
    }

    logger.info('Plan change scheduled successfully:', {
      userId,
      subscriptionId,
      oldPlan: subscription.subscription_plan_id,
      newPlan: newPlanId,
      billingCycle,
      newAmount: newPlan.price_inr,
      razorpayUpdateAttempted,
      razorpayUpdateSucceeded,
      effectiveDate
    })

    return NextResponse.json({ 
      success: true,
      message: 'Plan change has been scheduled to take effect at the end of the current billing period'
    })

  } catch (error) {
    logger.error('Error in handleChangePlan:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
} 