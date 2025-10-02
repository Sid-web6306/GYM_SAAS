import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { serverConfig } from '@/lib/config'
import { logger } from '@/lib/logger'
import { PaymentService } from '@/services/payment.service'
// Import Razorpay's official validation utility
import { validatePaymentVerification } from 'razorpay/dist/utils/razorpay-utils'

interface VerifyPaymentRequest {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}

/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature and activates subscription
 * Uses official Razorpay SDK validation utility
 */
export async function POST(request: NextRequest) {
  const verificationStart = Date.now()
  
  try {
    const body: VerifyPaymentRequest = await request.json()
    const { 
      razorpay_payment_id, 
      razorpay_subscription_id, 
      razorpay_signature 
    } = body

    // Validate input
    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      logger.error('Payment verification: Missing required fields', { body })
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      )
    }

    // Verify signature using Razorpay's official utility
    try {
      const isValid = validatePaymentVerification(
        {
          subscription_id: razorpay_subscription_id,
          payment_id: razorpay_payment_id
        },
        razorpay_signature,
        serverConfig.razorpayKeySecret!
      )

      if (!isValid) {
        logger.error('Payment signature verification failed', {
          razorpay_payment_id,
          razorpay_subscription_id,
          signatureProvided: razorpay_signature.substring(0, 10) + '...'
        })
        return NextResponse.json(
          { error: 'Invalid payment signature' },
          { status: 400 }
        )
      }
    } catch (signatureError) {
      logger.error('Payment signature verification error', {
        error: signatureError instanceof Error ? signatureError.message : String(signatureError),
        razorpay_payment_id,
        razorpay_subscription_id
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
      logger.error('Payment verification: User not authenticated', { authError })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's gym_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gym_id, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.gym_id) {
      logger.error('Payment verification: Gym not found for user', { 
        userId: user.id, 
        error: profileError 
      })
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
    }

    // Find subscription by Razorpay subscription ID
    const { data: existingSubscription, error: subFetchError } = await supabase
      .from('subscriptions')
      .select('id, status, gym_id')
      .eq('razorpay_subscription_id', razorpay_subscription_id)
      .single()

    if (subFetchError && subFetchError.code !== 'PGRST116') {
      logger.error('Error fetching subscription', {
        error: subFetchError.message,
        razorpay_subscription_id
      })
      return NextResponse.json(
        { error: 'Failed to verify subscription' },
        { status: 500 }
      )
    }

    let subscriptionId: string

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id)

      if (updateError) {
        logger.error('Error updating subscription after payment', {
          error: updateError.message,
          subscriptionId: existingSubscription.id
        })
        return NextResponse.json(
          { error: 'Failed to activate subscription' },
          { status: 500 }
        )
      }

      subscriptionId = existingSubscription.id

      logger.info('✅ Payment verified and subscription activated', {
        subscriptionId,
        razorpay_payment_id,
        razorpay_subscription_id,
        gym_id: profile.gym_id,
        user_id: user.id,
        duration_ms: Date.now() - verificationStart
      })
    } else {
      // 🚀 IMMEDIATE ACTIVATION: Create subscription now, don't wait for webhook
      logger.info('💡 Payment verified - creating subscription immediately (not waiting for webhook)', {
        razorpay_subscription_id,
        razorpay_payment_id,
        gym_id: profile.gym_id,
        user_id: user.id
      })

      // Fetch subscription details from Razorpay to get plan info
      if (!PaymentService.isConfigured()) {
        logger.error('Razorpay not configured for immediate subscription creation')
        return NextResponse.json(
          { error: 'Payment system not configured' },
          { status: 500 }
        )
      }

      try {
        const razorpaySubscription = await PaymentService.fetchSubscription(razorpay_subscription_id)
        
        // Find the matching plan in our database
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('id, plan_type, billing_cycle, price_inr, currency')
          .eq('razorpay_plan_id', razorpaySubscription.plan_id)
          .single()

        if (!planData) {
          logger.warn('⚠️ Plan not found in database, will rely on webhook to create subscription', {
            razorpay_plan_id: razorpaySubscription.plan_id
          })
          return NextResponse.json({
            success: true,
            message: 'Payment verified successfully. Subscription activation in progress.',
            razorpay_payment_id,
            razorpay_subscription_id
          })
        }

        // Create subscription record immediately
        const currentStart = razorpaySubscription.current_start 
          ? new Date(razorpaySubscription.current_start * 1000).toISOString()
          : new Date().toISOString()
        const currentEnd = razorpaySubscription.current_end
          ? new Date(razorpaySubscription.current_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days

        const { data: newSubscription, error: createError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            gym_id: profile.gym_id,
            subscription_plan_id: planData.id,
            razorpay_subscription_id,
            razorpay_customer_id: razorpaySubscription.customer_id,
            status: 'active',
            current_period_start: currentStart,
            current_period_end: currentEnd,
            amount: planData.price_inr,
            currency: planData.currency || 'INR',
            billing_cycle: planData.billing_cycle,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (createError) {
          // Check if subscription was already created (race condition with webhook)
          if (createError.code === '23505') { // Unique constraint violation
            logger.info('Subscription already exists (race condition with webhook)', {
              razorpay_subscription_id
            })
            const { data: existingSub } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('razorpay_subscription_id', razorpay_subscription_id)
              .single()
            
            subscriptionId = existingSub?.id || ''
          } else {
            logger.error('❌ Failed to create subscription immediately', {
              error: createError.message,
              razorpay_subscription_id
            })
            return NextResponse.json(
              { error: 'Failed to activate subscription' },
              { status: 500 }
            )
          }
        } else {
          subscriptionId = newSubscription.id
          logger.info('✅ Subscription created and activated immediately', {
            subscriptionId,
            razorpay_payment_id,
            razorpay_subscription_id,
            gym_id: profile.gym_id,
            plan_type: planData.plan_type,
            billing_cycle: planData.billing_cycle,
            duration_ms: Date.now() - verificationStart
          })
        }
      } catch (razorpayError) {
        logger.error('❌ Error fetching subscription from Razorpay', {
          error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
          razorpay_subscription_id
        })
        // Fall back to webhook processing
        return NextResponse.json({
          success: true,
          message: 'Payment verified successfully. Subscription activation in progress.',
          razorpay_payment_id,
          razorpay_subscription_id
        })
      }
    }

    return NextResponse.json({
      success: true,
      subscription_id: subscriptionId,
      message: 'Payment verified and subscription activated successfully',
      gym_id: profile.gym_id
    })

  } catch (error) {
    const duration = Date.now() - verificationStart
    logger.error('❌ Payment verification error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration_ms: duration
    })
    
    return NextResponse.json(
      { error: 'Payment verification failed. Please contact support.' },
      { status: 500 }
    )
  }
}


