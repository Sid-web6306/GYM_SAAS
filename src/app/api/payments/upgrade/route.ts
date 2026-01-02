import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { RazorpayClient } from '@/services/payments/razorpay-client'
import { SubscriptionService } from '@/services/payments/subscription.service'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils'

interface UpgradePaymentRequest {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
  subscriptionId: string
  newPlanId: string
  billingCycle: 'monthly' | 'annual'
  newAmount: number
}

/**
 * POST /api/payments/upgrade
 * Handles payment verification and subscription update for upgrades
 */
export async function POST(request: NextRequest) {
  const verificationStart = Date.now()
  
  try {
    const body: UpgradePaymentRequest = await request.json()
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      subscriptionId,
      newPlanId,
      billingCycle,
      newAmount
    } = body

    // Validate input
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !subscriptionId || !newPlanId) {
      logger.error('Upgrade payment verification: Missing required fields', { body })
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      )
    }

    // Verify signature using Razorpay's official utility
    try {
      const isValid = validatePaymentVerification(
        {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id
        },
        razorpay_signature,
        serverConfig.razorpayKeySecret!
      )

      if (!isValid) {
        logger.error('Upgrade payment signature verification failed', {
          razorpay_payment_id,
          razorpay_order_id,
          signatureProvided: razorpay_signature.substring(0, 10) + '...'
        })
        return NextResponse.json(
          { error: 'Invalid payment signature' },
          { status: 400 }
        )
      }
    } catch (signatureError) {
      logger.error('Upgrade payment signature verification error', {
        error: signatureError instanceof Error ? signatureError.message : String(signatureError),
        razorpay_payment_id,
        razorpay_order_id
      })
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.error('Upgrade payment verification: User not authenticated', { authError })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's gym_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.gym_id) {
      logger.error('Upgrade payment verification: Gym not found for user', { 
        userId: user.id, 
        error: profileError 
      })
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, razorpay_subscription_id, subscription_plan_id, user_id, gym_id')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .eq('gym_id', profile.gym_id)
      .single()

    if (subError || !subscription) {
      logger.error('Upgrade payment verification: Subscription not found or unauthorized', {
        subscriptionId,
        userId: user.id,
        error: subError?.message
      })
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Get new plan details
    const { data: newPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, price_inr, currency, razorpay_plan_id')
      .eq('id', newPlanId)
      .eq('billing_cycle', billingCycle)
      .single()

    if (planError || !newPlan) {
      logger.error('Upgrade payment verification: New plan not found', {
        newPlanId,
        billingCycle,
        error: planError?.message
      })
      return NextResponse.json({ error: 'New plan not found' }, { status: 404 })
    }

    // Update subscription in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        subscription_plan_id: newPlanId,
        amount: newAmount,
        currency: newPlan.currency || 'INR',
        billing_cycle: billingCycle,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)

    if (updateError) {
      logger.error('Error updating subscription after upgrade payment', {
        error: updateError.message,
        subscriptionId
      })
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    // Update Razorpay subscription
    if (subscription.razorpay_subscription_id) {
      try {
        if (RazorpayClient.isConfigured()) {
          await SubscriptionService.updateSubscription(subscription.razorpay_subscription_id, {
            plan_id: newPlan.razorpay_plan_id || `plan_${newPlanId}_${billingCycle}`,
            schedule_change_at: 'now',
            customer_notify: true
          })
          logger.info('Razorpay subscription updated after upgrade payment', {
            razorpaySubscriptionId: subscription.razorpay_subscription_id,
            newPlanId: newPlan.razorpay_plan_id
          })
        }
      } catch (razorpayError) {
        logger.warn('Failed to update Razorpay subscription after upgrade payment', {
          error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
          subscriptionId
        })
        // Don't fail the request if Razorpay update fails
      }
    }

    logger.info('✅ Subscription upgrade completed successfully', {
      subscriptionId,
      oldPlanId: subscription.subscription_plan_id,
      newPlanId,
      billingCycle,
      newAmount,
      razorpay_payment_id,
      razorpay_order_id,
      userId: user.id,
      duration_ms: Date.now() - verificationStart
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription upgraded successfully',
      subscription: {
        id: subscriptionId,
        status: 'active',
        plan_id: newPlanId,
        billing_cycle: billingCycle,
        amount: newAmount
      },
      payment: {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id
      }
    })

  } catch (error) {
    const duration = Date.now() - verificationStart
    logger.error('❌ Upgrade payment verification error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration
    })
    
    return NextResponse.json(
      { error: 'Upgrade payment verification failed. Please contact support.' },
      { status: 500 }
    )
  }
}
