/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { logger } from '@/lib/logger'


// POST /api/payments - Create Razorpay subscription
export async function POST(request: NextRequest) {
  try {
    const razorpay = getRazorpay()
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    const { 
      planId, 
      billingCycle,
      metadata = {}
    } = await request.json()

    if (!planId || !billingCycle) {
      return NextResponse.json({ error: 'Plan ID and billing cycle are required' }, { status: 400 })
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, gym_id')
      .eq('id', user.id)
      .single()

    // Get subscription plan details
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('billing_cycle', billingCycle)
      .single()

    if (!plan) {
      return NextResponse.json({ 
        error: 'Plan not found or not properly configured' 
      }, { status: 404 })
    }

    // Create or get Razorpay customer
    const customerData = {
      name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
      email: user.email || '',
      notes: {
        userId: user.id,
        gymId: profile?.gym_id || '',
      }
    }

    let customer
    try {
      // Search for existing customer by email
      let existingCustomer = null;
      if (user.email) {
        const customers = await razorpay.customers.all({
          count: 100  // Increase count or implement pagination
        });
        existingCustomer = customers.items.find((c: any) => c.email === user.email);
      }
      
      if (existingCustomer) {
        customer = existingCustomer
      } else {
        customer = await razorpay.customers.create(customerData)
      }
    } catch (error) {
      logger.error('Error creating/finding Razorpay customer:', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    }

    // Create subscription
    const subscriptionData = {
      plan_id: plan.razorpay_plan_id || `plan_${planId}_${billingCycle}`,
      customer_id: customer.id,
      quantity: 1,
      total_count: billingCycle === 'annual' ? 12 : 60, // 5 years max
      notes: {
        userId: user.id,
        gymId: profile?.gym_id || '',
        planId,
        billingCycle,
        ...metadata,
      }
    }

    try {
      const subscription = await razorpay.subscriptions.create(subscriptionData)

      logger.info('Razorpay subscription created:', {
        subscriptionId: subscription.id,
        customerId: customer.id,
        planId,
        billingCycle,
        userId: user.id,
        amount: plan.price_inr,
      })

      // Create payment link for the subscription
      const paymentLinkData = {
        amount: plan.price_inr,
        currency: 'INR',
        accept_partial: false,
        description: `${plan.name} subscription`,
        customer: {
          name: customerData.name,
          email: customerData.email,
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: subscriptionData.notes,
        callback_url: `${request.headers.get('origin')}/payment-success?subscription_id=${subscription.id}`,
        callback_method: 'get',
      }

      const paymentLink = await razorpay.paymentLink.create(paymentLinkData)

      return NextResponse.json({
        subscriptionId: subscription.id,
        paymentLinkId: paymentLink.id,
        paymentLinkUrl: paymentLink.short_url,
        checkoutUrl: paymentLink.short_url, // For compatibility with upgrade page
        customerId: customer.id,
      })

    } catch (error) {
      logger.error('Error creating Razorpay subscription:', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

  } catch (error) {
    logger.error('Payments API error:', { error: error instanceof Error ? error.message : String(error) })
    
    return NextResponse.json({ 
      error: 'Failed to create payment' 
    }, { status: 500 })
  }
}

// GET /api/payments?subscription_id=xxx - Verify Razorpay subscription/payment
export async function GET(request: NextRequest) {
  try {
    const razorpay = getRazorpay()
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscription_id')
    const paymentId = searchParams.get('payment_id')

    if (!subscriptionId && !paymentId) {
      return NextResponse.json({ error: 'Subscription ID or Payment ID required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let paymentData: any = {}

    if (subscriptionId) {
      // Retrieve subscription details
      try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId)
        
        // Verify this subscription belongs to the current user
        if (subscription.notes?.userId !== user.id) {
          return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
        }

        paymentData = {
          type: 'subscription',
          subscriptionId: subscription.id,
          customerId: subscription.customer_id,
          planId: subscription.plan_id,
          status: subscription.status,
          amount: 0, // Will be fetched from plan
          billingCycle: subscription.notes?.billingCycle || 'monthly',
          currentStart: subscription.current_start,
          currentEnd: subscription.current_end,
          chargeAt: subscription.charge_at,
        }

        // Get plan details for amount
        if (subscription.notes?.planId) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('name, price_inr')
            .eq('id', String(subscription.notes.planId))
            .single()

          if (plan) {
            paymentData.planName = plan.name
            paymentData.amount = plan.price_inr
          }
        }

      } catch (error) {
        logger.error('Error fetching Razorpay subscription:', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }
    }

    if (paymentId) {
      // Retrieve payment details
      try {
        const payment = await razorpay.payments.fetch(paymentId)
        
        // Verify payment belongs to current user
        if (payment.notes?.userId && payment.notes.userId !== user.id) {
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
        }
        
        paymentData = {
          type: 'payment',
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          captured: payment.captured,
          createdAt: payment.created_at,
        }

        // If payment has subscription info
        if (payment.notes?.subscriptionId) {
          paymentData.subscriptionId = payment.notes.subscriptionId
        }

      } catch (error) {
        logger.error('Error fetching Razorpay payment:', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      }
    }

    logger.info('Payment verification successful:', {
      userId: user.id,
      subscriptionId,
      paymentId,
      status: paymentData.status
    })

    return NextResponse.json({ 
      success: true, 
      payment: paymentData 
    })

  } catch (error) {
    logger.error('Payment verification error:', { error: error instanceof Error ? error.message : String(error) })
    
    return NextResponse.json({ 
      error: 'Failed to verify payment' 
    }, { status: 500 })
  }
} 