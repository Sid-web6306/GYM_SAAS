/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { serverConfig } from '@/lib/config'

import { logger } from '@/lib/logger'
import Stripe from 'stripe'

// Initialize Stripe
const stripe = serverConfig.stripeSecretKey 
  ? new Stripe(serverConfig.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    })
  : null

async function getStripeProductId(planId: string): Promise<string | null> {
  const supabase = await createClient()
  
  // First try direct mapping from subscription_plans table
  const { data: plan } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscription_plans')
    .select('stripe_product_id')
    .eq('id', planId)
    .single()
  
  if ((plan as Record<string, unknown>)?.stripe_product_id) {
    return (plan as Record<string, unknown>).stripe_product_id as string
  }
  
  return null
}

// POST /api/payments - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
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

    // Get the Stripe Product ID from our mapping
    const stripeProductId = await getStripeProductId(planId)
    
    if (!stripeProductId) {
      return NextResponse.json({ 
        error: 'Plan not found or not properly configured' 
      }, { status: 404 })
    }

    // Get the product and its prices from Stripe
    const product = await stripe.products.retrieve(stripeProductId)
    
    if (!product.active) {
      return NextResponse.json({ error: 'Plan is not available' }, { status: 404 })
    }

    // Get prices for this product
    const prices = await stripe.prices.list({
      product: stripeProductId,
      active: true,
      type: 'recurring'
    })

    // Find the appropriate price based on billing cycle
    const targetInterval = billingCycle === 'monthly' ? 'month' : 'year'
    const selectedPrice = prices.data.find(price => 
      price.recurring?.interval === targetInterval
    )

    if (!selectedPrice) {
      return NextResponse.json({ 
        error: `No ${billingCycle} pricing available for this plan` 
      }, { status: 404 })
    }

    const commonMetadata = {
      userId: user.id,
      gymId: profile?.gym_id || '',
      fullName: profile?.full_name || '',
      userEmail: user.email || '',
      planId,
      stripeProductId,
      billingCycle,
      ...metadata,
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: selectedPrice.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/upgrade`,
      metadata: commonMetadata,
      customer_email: user.email,
      allow_promotion_codes: true,
    })

    logger.info('Checkout session created:', {
      sessionId: session.id,
      checkoutUrl: session.url,
      planId,
      stripeProductId,
      billingCycle,
      userId: user.id,
      amount: session.amount_total,
      currency: session.currency,
    })

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    })

  } catch (error) {
    logger.error('Payments API error:', {error})
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create payment' 
    }, { status: 500 })
  }
}

// GET /api/payments?session_id=xxx - Verify checkout session
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'payment_intent', 'line_items.data.price.product']
    })

    // Verify this session belongs to the current user
    if (session.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    let planName = 'Subscription'
    let billingCycle = 'monthly'
    const amount = session.amount_total || 0

    // Extract plan details from line items
    if (session.line_items?.data && session.line_items.data.length > 0) {
      const lineItem = session.line_items.data[0]
      const price = lineItem.price
      const product = price?.product as Stripe.Product
      
      if (product) {
        planName = product.name
      }
      
      if (price?.recurring) {
        billingCycle = price.recurring.interval === 'year' ? 'annual' : 'monthly'
      }
    }

    const sessionData = {
      type: 'checkout_session',
      sessionId: session.id,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      amount,
      planName,
      billingCycle,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
    }

    // Try to get the invoice ID if it's a subscription
    if (sessionData.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(sessionData.subscriptionId)
        const latestInvoiceId = typeof subscription.latest_invoice === 'string' 
          ? subscription.latest_invoice 
          : subscription.latest_invoice?.id

        if (latestInvoiceId) {
          (sessionData as any).invoiceId = latestInvoiceId
        }
      } catch (error) {
        logger.warn('Could not retrieve subscription invoice:', { error: error instanceof Error ? error.message : String(error) })
      }
    }

    logger.info('Payment verification successful:', {
      userId: user.id,
      sessionId,
      paymentStatus: sessionData.paymentStatus
    })

    return NextResponse.json({ 
      success: true, 
      payment: sessionData 
    })

  } catch (error) {
    logger.error('Payment verification error:', { error: error instanceof Error ? error.message : String(error) })
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to verify payment' 
    }, { status: 500 })
  }
} 