/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { serverConfig } from '@/lib/config'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Initialize Stripe
const stripe = serverConfig.stripeSecretKey 
  ? new Stripe(serverConfig.stripeSecretKey, {
      apiVersion: '2025-06-30.basil',
    })
  : null

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
    const { data: plans, error } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: boolean) => { order: (column: string) => Promise<{ data: unknown, error: unknown }> } } } }).from('subscription_plans')
      .select('id, name, price_monthly_inr, price_annual_inr, member_limit, features, is_active, stripe_product_id')
      .eq('is_active', true)
      .order('price_monthly_inr')
    
    if (error) {
      logger.error('Error fetching subscription plans:', { error: (error as Record<string, unknown>).message as string })
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
    }
    
    // Additional client-side deduplication as safety measure
    const uniquePlans = ((plans as Record<string, unknown>[]) || []).reduce((acc: Record<string, unknown>[], plan: Record<string, unknown>) => {
      const existingPlan = acc.find(p => (p as Record<string, unknown>).name === (plan as Record<string, unknown>).name)
      if (!existingPlan) {
        acc.push(plan)
      }
      return acc
    }, [] as Record<string, unknown>[])
    
    return NextResponse.json({ plans: uniquePlans })
  } catch (error) {
    logger.error('Error in handleGetPlans:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// Helper function to get current subscription
async function handleGetCurrentSubscription(supabase: SupabaseClient, userId: string) {
  try {
    // Check subscription access
    const { data: hasAccess, error: accessError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('check_subscription_access', {
      p_user_id: userId
    })

    if (accessError) {
      logger.error('Error checking subscription access:', {accessError})
    }

    // Get current subscription details
    const { data: subscription, error: subError } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { order: (column: string, options: { ascending: boolean }) => { limit: (count: number) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } } } }).from('subscriptions')
      .select(`
        *,
        subscription_plans!inner(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subError && (subError as Record<string, unknown>).code !== 'PGRST116') { // PGRST116 is "no rows returned"
      logger.error('Error fetching current subscription:', {subError})
    }

    // Get trial info from subscriptions table (trial data moved from profiles)
    const { data: trialSubscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { order: (column: string, options: { ascending: boolean }) => { limit: (count: number) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } } }).from('subscriptions')
      .select('trial_start_date, trial_end_date, trial_status, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Determine trial status from subscription data
    let trialStatus = null
    if (trialSubscription) {
      if ((trialSubscription as Record<string, unknown>).status === 'active' && (trialSubscription as Record<string, unknown>).trial_end_date) {
        const trialEndDate = new Date((trialSubscription as Record<string, unknown>).trial_end_date as string)
        const now = new Date()
        trialStatus = trialEndDate > now ? 'active' : 'expired'
      } else {
        trialStatus = (trialSubscription as Record<string, unknown>).status === 'canceled' ? 'expired' : 'converted'
      }
    }

    return NextResponse.json({ 
      subscription: subscription || null,
      hasAccess: hasAccess || false,
      trial: trialSubscription ? {
        startDate: (trialSubscription as Record<string, unknown>).trial_start_date as string,
        endDate: (trialSubscription as Record<string, unknown>).trial_end_date as string,
        status: trialStatus
      } : null
    })
  } catch (error) {
    logger.error('Error in handleGetCurrentSubscription:', {error})
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}

// Helper function to create billing portal session
async function handleCreateBillingPortal(supabase: any, user: any) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Check if user has an active subscription
    const { data: hasAccess, error: accessError } = await supabase.rpc('check_subscription_access', {
      p_user_id: user.id
    })

    if (accessError || !hasAccess) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customer: Stripe.Customer | null = null

    const existingCustomers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || undefined,
        metadata: {
          userId: user.id,
        },
      })
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?billing_portal=true`,
    })

    logger.info('Billing portal session created:', {
      userId: user.id,
      customerId: customer.id,
      sessionUrl: session.url
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    logger.error('Billing portal creation error:', {error})
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 })
  }
}

// Helper function to pause subscription
async function handlePauseSubscription(supabase: any, userId: string, subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Pause subscription in database
    const { error: pauseError } = await supabase.rpc('pause_subscription', {
      p_subscription_id: subscriptionId
    })

    if (pauseError) {
      logger.error('Error pausing subscription:', pauseError)
      return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 })
    }

    // Also pause in Stripe if available
    if (stripe && subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          pause_collection: {
            behavior: 'keep_as_draft'
          }
        })
      } catch (stripeError) {
        logger.error('Error pausing Stripe subscription:', {stripeError})
        // Don't fail the request if Stripe update fails
      }
    }

    logger.info('Subscription paused successfully:', {
      userId,
      subscriptionId,
      stripeSubscriptionId: subscription.stripe_subscription_id
    })

    return NextResponse.json({ success: true, message: 'Subscription paused successfully' })

  } catch (error) {
    logger.error('Error in handlePauseSubscription:', {error})
    return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 })
  }
}

// Helper function to resume subscription
async function handleResumeSubscription(supabase: any, userId: string, subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Resume subscription in database
    const { error: resumeError } = await supabase.rpc('resume_subscription', {
      p_subscription_id: subscriptionId
    })

    if (resumeError) {
      logger.error('Error resuming subscription:', resumeError)
      return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
    }

    // Also resume in Stripe if available
    if (stripe && subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          pause_collection: null
        })
      } catch (stripeError) {
        logger.error('Error resuming Stripe subscription:', {stripeError})
        // Don't fail the request if Stripe update fails
      }
    }

    logger.info('Subscription resumed successfully:', {
      userId,
      subscriptionId,
      stripeSubscriptionId: subscription.stripe_subscription_id
    })

    return NextResponse.json({ success: true, message: 'Subscription resumed successfully' })

  } catch (error) {
    logger.error('Error in handleResumeSubscription:', {error})
    return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 })
  }
}

// Helper function to cancel subscription
async function handleCancelSubscription(supabase: SupabaseClient, userId: string, subscriptionId: string, cancelAtPeriodEnd: boolean = true, feedback?: any) {
  try {
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } }).from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Save feedback if provided
    if (feedback) {
      const { error: feedbackError } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } }).from('feedback')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          reason: feedback.reason,
          feedback_text: feedback.feedbackText || null,
          rating: feedback.rating || null,
          would_recommend: feedback.wouldRecommend || null
        })

      if (feedbackError) {
        logger.error('Error saving feedback:', { feedbackError })
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
    const { error: cancelError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('cancel_subscription', {
      p_subscription_id: subscriptionId,
      p_cancel_at_period_end: cancelAtPeriodEnd
    })

    if (cancelError) {
      logger.error('Error canceling subscription:', {cancelError})
      return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }

    // Also cancel in Stripe if available
    if (stripe && (subscription as Record<string, unknown>).stripe_subscription_id) {
      try {
        if (cancelAtPeriodEnd) {
          await stripe.subscriptions.update((subscription as Record<string, unknown>).stripe_subscription_id as string, {
            cancel_at_period_end: true
          })
        } else {
          await stripe.subscriptions.cancel((subscription as Record<string, unknown>).stripe_subscription_id as string)
        }
      } catch (stripeError) {
        logger.error('Error canceling Stripe subscription:', {stripeError})
        // Don't fail the request if Stripe update fails
      }
    }

    logger.info('Subscription canceled successfully:', {
      userId,
      subscriptionId,
      stripeSubscriptionId: (subscription as Record<string, unknown>).stripe_subscription_id as string,
      cancelAtPeriodEnd,
      feedbackProvided: !!feedback
    })

    return NextResponse.json({ 
      success: true, 
      message: cancelAtPeriodEnd ? 'Subscription will be canceled at the end of the billing period' : 'Subscription canceled immediately'
    })

  } catch (error) {
    logger.error('Error in handleCancelSubscription:', {error})
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}

// Helper function to change subscription plan
async function handleChangePlan(supabase: any, userId: string, subscriptionId: string, newPlanId: string, billingCycle: string) {
  try {
    if (!subscriptionId || !newPlanId || !billingCycle) {
      return NextResponse.json({ error: 'Subscription ID, new plan ID, and billing cycle are required' }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get the new plan details
    const { data: newPlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single()

    if (!newPlan) {
      return NextResponse.json({ error: 'New plan not found' }, { status: 404 })
    }

    // Schedule the plan change
    const { error: scheduleError } = await supabase.rpc('schedule_subscription_change', {
      p_subscription_id: subscriptionId,
      p_change_type: 'plan_change',
      p_effective_date: new Date().toISOString(),
      p_change_data: {
        new_plan_id: newPlanId,
        new_billing_cycle: billingCycle,
        new_amount: billingCycle === 'monthly' ? newPlan.price_monthly_inr : newPlan.price_annual_inr
      }
    })

    if (scheduleError) {
      logger.error('Error scheduling plan change:', scheduleError)
      return NextResponse.json({ error: 'Failed to schedule plan change' }, { status: 500 })
    }

    logger.info('Plan change scheduled successfully:', {
      userId,
      subscriptionId,
      oldPlan: subscription.subscription_plan_id,
      newPlan: newPlanId,
      billingCycle
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Plan change has been scheduled and will take effect at the next billing period'
    })

  } catch (error) {
    logger.error('Error in handleChangePlan:', {error})
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
} 