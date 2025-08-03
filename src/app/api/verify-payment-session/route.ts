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

// POST /api/verify-payment-session - Verify checkout session or payment intent
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const { sessionId, paymentIntentId } = await request.json()

    if (!sessionId && !paymentIntentId) {
      return NextResponse.json({ error: 'Session ID or Payment Intent ID required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let sessionData: any = null

    // Handle checkout session verification
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'payment_intent', 'line_items.data.price.product']
        })

        // Verify this session belongs to the current user
        if (session.metadata?.userId !== user.id) {
          return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 404 })
        }

        // Check if payment was successful
        if (session.payment_status !== 'paid') {
          return NextResponse.json({ 
            error: 'Payment not completed', 
            payment_status: session.payment_status 
          }, { status: 400 })
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

        sessionData = {
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
              sessionData.invoiceId = latestInvoiceId
            }
          } catch (error) {
            logger.warn('Could not retrieve subscription invoice:', { error: error instanceof Error ? error.message : String(error) })
          }
        }

      } catch (error) {
        logger.error('Checkout session verification error:', { 
          sessionId, 
          error: error instanceof Error ? error.message : String(error) 
        })
        
        if (error instanceof Stripe.errors.StripeError) {
          if (error.type === 'StripeInvalidRequestError' && error.message.includes('No such checkout session')) {
            return NextResponse.json({ error: 'Invalid or expired session' }, { status: 404 })
          }
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
        
        return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 })
      }
    }

    // Handle payment intent verification (if provided)
    if (paymentIntentId && !sessionData) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

        // Basic verification - you might want to add more checks here
        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json({ 
            error: 'Payment not completed', 
            payment_status: paymentIntent.status 
          }, { status: 400 })
        }

        sessionData = {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          paymentStatus: paymentIntent.status,
          customerEmail: paymentIntent.receipt_email,
        }

      } catch (error) {
        logger.error('Payment intent verification error:', { 
          paymentIntentId, 
          error: error instanceof Error ? error.message : String(error) 
        })
        
        if (error instanceof Stripe.errors.StripeError) {
          if (error.type === 'StripeInvalidRequestError' && error.message.includes('No such payment_intent')) {
            return NextResponse.json({ error: 'Invalid or expired payment intent' }, { status: 404 })
          }
          return NextResponse.json({ error: error.message }, { status: 400 })
        }
        
        return NextResponse.json({ error: 'Failed to verify payment intent' }, { status: 500 })
      }
    }

    if (!sessionData) {
      return NextResponse.json({ error: 'No valid payment data found' }, { status: 404 })
    }

    logger.info('Payment verification successful:', {
      userId: user.id,
      sessionId,
      paymentIntentId,
      paymentStatus: sessionData.paymentStatus
    })

    return NextResponse.json(sessionData)

  } catch (error) {
    logger.error('Payment verification API error:', { error: error instanceof Error ? error.message : String(error) })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}