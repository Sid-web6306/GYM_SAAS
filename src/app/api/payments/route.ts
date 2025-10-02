/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { PaymentService } from '@/services/payment.service'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'

// POST /api/payments - Create or update Razorpay subscription
export async function POST(request: NextRequest) {
  try {
    if (!PaymentService.isConfigured()) {
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

    // Check for existing active subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id, status, subscription_plan_id, razorpay_subscription_id, current_period_end')
      .eq('user_id', user.id)
      .eq('gym_id', profile?.gym_id || '')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If user has an active subscription, handle upgrade/downgrade with payment
    if (existingSubscription) {
      logger.info('Existing active subscription found, handling upgrade/downgrade', {
        userId: user.id,
        gymId: profile?.gym_id,
        existingSubscriptionId: existingSubscription.id,
        currentPlanId: existingSubscription.subscription_plan_id,
        newPlanId: planId,
        billingCycle
      })

      // Check if it's the same plan and billing cycle
      if (existingSubscription.subscription_plan_id === planId) {
        return NextResponse.json({
          error: 'You already have an active subscription for this plan',
          existingSubscription: {
            id: existingSubscription.id,
            status: existingSubscription.status,
            current_period_end: existingSubscription.current_period_end
          }
        }, { status: 400 })
      }

      // Get current plan details for comparison
      const { data: currentPlan } = await supabase
        .from('subscription_plans')
        .select('price_inr, currency, billing_cycle, plan_type, name')
        .eq('id', existingSubscription.subscription_plan_id)
        .single()

      if (!currentPlan) {
        return NextResponse.json({ error: 'Current plan not found' }, { status: 404 })
      }

      // Check if this is a billing cycle change (same plan type, different cycle)
      const isBillingCycleChange = currentPlan.plan_type === plan.plan_type && 
                                   currentPlan.billing_cycle !== billingCycle

      logger.info('Plan change analysis', {
        currentPlan: {
          id: existingSubscription.subscription_plan_id,
          type: currentPlan.plan_type,
          cycle: currentPlan.billing_cycle,
          amount: currentPlan.price_inr
        },
        newPlan: {
          id: planId,
          type: plan.plan_type,
          cycle: billingCycle,
          amount: plan.price_inr
        },
        isBillingCycleChange,
        isTierChange: currentPlan.plan_type !== plan.plan_type
      })

      // Calculate proration amount (difference between plans)
      const currentAmount = currentPlan.price_inr
      const newAmount = plan.price_inr
      const prorationAmount = newAmount - currentAmount

      logger.info('Proration calculation', {
        currentAmount,
        newAmount,
        prorationAmount,
        isUpgrade: prorationAmount > 0,
        isDowngrade: prorationAmount < 0,
        currentPlanId: existingSubscription.subscription_plan_id,
        newPlanId: planId,
        billingCycle
      })

      // If it's an upgrade (higher price), create a payment order
      if (prorationAmount > 0) {
        try {
          // Validate proration amount
          if (prorationAmount < 100) { // Minimum 1 rupee in paise
            logger.warn('Proration amount too small, treating as free upgrade', {
              prorationAmount,
              currentAmount,
              newAmount
            })
            
            // Update subscription directly for very small amounts
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                subscription_plan_id: planId,
                amount: plan.price_inr,
                currency: plan.currency || 'INR',
                billing_cycle: billingCycle,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSubscription.id)

            if (updateError) {
              logger.error('Error updating subscription for small proration:', { error: updateError.message })
              return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
            }

            return NextResponse.json({
              success: true,
              message: 'Subscription upgraded successfully (no payment required)',
              subscription: {
                id: existingSubscription.id,
                status: 'active',
                plan_id: planId,
                billing_cycle: billingCycle,
                amount: plan.price_inr
              }
            })
          }

        // Create Razorpay order for the proration amount
        const orderData = {
          amount: Math.round(prorationAmount), // Amount is already in paise
          currency: plan.currency || 'INR',
          receipt: `upg_${Date.now()}`, // Shortened receipt (max 40 chars)
          notes: {
            type: 'subscription_upgrade',
            subscriptionId: existingSubscription.id,
            oldPlanId: existingSubscription.subscription_plan_id,
            newPlanId: planId,
            billingCycle,
            userId: user.id,
            gymId: profile?.gym_id || ''
          }
        }

          logger.info('Creating Razorpay order with data:', orderData)
          
          const order = await PaymentService.createOrder(orderData)

          logger.info('Razorpay order created for subscription upgrade', {
            orderId: order.id,
            amount: prorationAmount,
            subscriptionId: existingSubscription.id
          })
          
          // Return checkout data for payment
          return NextResponse.json({
            requiresPayment: true,
            orderId: order.id,
            amount: prorationAmount,
            currency: plan.currency || 'INR',
            upgradeType: isBillingCycleChange ? 'billing_cycle_change' : 
                        currentPlan.plan_type !== plan.plan_type ? 'tier_change' : 'plan_change',
            checkout: {
              key: serverConfig.razorpayKeyId,
              order_id: order.id,
              name: 'Gym SaaS Pro',
              description: `Subscription upgrade - ${plan.name} (${billingCycle})`,
              image: `${request.headers.get('origin')}/icon.svg`,
              prefill: {
                name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
                email: user.email || '',
              },
              theme: {
                color: '#3B82F6',
              },
              modal: {
                ondismiss: function() {
                  console.log('Payment modal dismissed');
                }
              },
              handler: async function(response: any) {
                // This will be handled by the frontend
                console.log('Payment successful:', response);
              }
            },
            subscriptionData: {
              subscriptionId: existingSubscription.id,
              newPlanId: planId,
              billingCycle,
              newAmount: plan.price_inr,
              currentPlan: {
                id: existingSubscription.subscription_plan_id,
                type: currentPlan.plan_type,
                cycle: currentPlan.billing_cycle,
                amount: currentPlan.price_inr
              },
              newPlan: {
                id: planId,
                type: plan.plan_type,
                cycle: billingCycle,
                amount: plan.price_inr
              }
            }
          })
        } catch (orderError) {
          logger.error('Error creating Razorpay order for upgrade:', { 
            error: orderError instanceof Error ? orderError.message : String(orderError),
            errorDetails: orderError,
            prorationAmount,
            currency: plan.currency || 'INR'
          })
          return NextResponse.json({ 
            error: 'Failed to create payment order',
            details: orderError instanceof Error ? orderError.message : 'Unknown error'
          }, { status: 500 })
        }
      } else {
        // Downgrade - update immediately without payment
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            subscription_plan_id: planId,
            amount: plan.price_inr,
            currency: plan.currency || 'INR',
            billing_cycle: billingCycle,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)

        if (updateError) {
          logger.error('Error updating subscription for downgrade:', { error: updateError.message })
          return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
        }

        // Update Razorpay subscription
        if (existingSubscription.razorpay_subscription_id) {
          try {
            await PaymentService.updateSubscription(existingSubscription.razorpay_subscription_id, {
              plan_id: plan.razorpay_plan_id || `plan_${planId}_${billingCycle}`,
              schedule_change_at: 'now',
              customer_notify: true
            })
            logger.info('Razorpay subscription updated for downgrade', {
              razorpaySubscriptionId: existingSubscription.razorpay_subscription_id,
              newPlanId: plan.razorpay_plan_id
            })
          } catch (razorpayError) {
            logger.warn('Failed to update Razorpay subscription for downgrade', {
              error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
              subscriptionId: existingSubscription.id
            })
          }
        }

        logger.info('✅ Subscription downgraded successfully', {
          subscriptionId: existingSubscription.id,
          oldPlanId: existingSubscription.subscription_plan_id,
          newPlanId: planId,
          billingCycle,
          userId: user.id
        })

        return NextResponse.json({
          success: true,
          message: 'Subscription downgraded successfully',
          subscription: {
            id: existingSubscription.id,
            status: 'active',
            plan_id: planId,
            billing_cycle: billingCycle,
            amount: plan.price_inr
          }
        })
      }
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
        const customers = await PaymentService.fetchAllCustomers({
          count: 100  // Increase count or implement pagination
        });
        logger.info('Razorpay customers:', { customers: customers.items.length })
        existingCustomer = customers.items.find((c: any) => c.email === user.email);
      }
      
      if (existingCustomer) {
        logger.info('Razorpay customer found:', { customer: existingCustomer })
        customer = existingCustomer
      } else {
        customer = await PaymentService.createCustomer(customerData)
      }
    } catch (error) {
      logger.error('Error creating/finding Razorpay customer:', { error: error instanceof Error ? error.message : JSON.stringify(error) })
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
      const subscription = await PaymentService.createSubscription(subscriptionData)

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
          offer_id: 'offer_R46udDRoTcRPIK',
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