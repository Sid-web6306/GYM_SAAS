/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'


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

      // Return data required to open Razorpay Checkout on frontend
      return NextResponse.json({
        subscriptionId: subscription.id,
        customerId: customer.id,
        checkout: {
          key: serverConfig.razorpayKeyId,
          subscription_id: subscription.id,
          name: 'Gym SaaS Pro',
          description: `${plan.name} - ${billingCycle} Subscription`,
          image: `${request.headers.get('origin')}/icon.svg`,
          webview_intent: true,
          prefill: {
            name: customerData.name,
            email: customerData.email,
          },
          theme: {
            color: '#3B82F6',
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
            }
          }
        }
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

// Note: Payment verification is now handled entirely by Razorpay and webhooks
// The hosted checkout flow doesn't require custom verification endpoints 