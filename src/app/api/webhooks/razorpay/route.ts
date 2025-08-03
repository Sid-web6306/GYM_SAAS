import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { getRazorpay } from '@/lib/razorpay';
import { logger, performanceTracker } from '@/lib/logger';
import { serverConfig } from '@/lib/config';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// Razorpay webhook event types
interface RazorpayPaymentEntity {
  id: string
  amount: number
  currency: string
  status: string
  method: string
  captured: boolean
  created_at: number
  email?: string
  contact?: string
  error_code?: string
  error_description?: string
  notes?: Record<string, string>
}

interface RazorpaySubscriptionEntity {
  id: string
  plan_id: string
  customer_id: string
  status: string
  current_start: number
  current_end: number
  ended_at?: number
  charge_at: number
  total_count: number
  paid_count: number
  remaining_count: number
  plan?: {
    item?: {
      amount: number
    }
  }
  notes?: Record<string, string>
}

interface RazorpayWebhookEvent {
  event: string
  created_at: number
  payload: {
    payment?: {
      entity: RazorpayPaymentEntity
    }
    subscription?: {
      entity: RazorpaySubscriptionEntity
    }
  }
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const razorpaySignature = headersList.get('x-razorpay-signature');
  
  const processingStart = Date.now();
  performanceTracker.start('razorpay-webhook');

  // Verify webhook signature
  if (!serverConfig.razorpayWebhookSecret) {
    logger.error('Razorpay webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  try {
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', serverConfig.razorpayWebhookSecret)
      .update(body)
      .digest('hex');

    if (!razorpaySignature || razorpaySignature !== expectedSignature) {
      logger.error('Webhook signature verification failed', { 
        received: razorpaySignature,
        expected: expectedSignature.substring(0, 10) + '...'
      });
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }
  } catch (err) {
    logger.error('Webhook signature verification error', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = await createClient();
  let event: RazorpayWebhookEvent | null = null;

  try {
    event = JSON.parse(body) as RazorpayWebhookEvent;
    
    logger.info('Processing Razorpay webhook', { 
      eventType: event.event, 
      eventId: event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id || 'unknown'
    });

    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event, supabase, processingStart);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event, supabase, processingStart);
        break;
        
      case 'subscription.activated':
        await handleSubscriptionActivated(event, supabase, processingStart);
        break;
        
      case 'subscription.charged':
        await handleSubscriptionCharged(event, supabase, processingStart);
        break;
        
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event, supabase, processingStart);
        break;
        
      case 'subscription.paused':
        await handleSubscriptionPaused(event, supabase, processingStart);
        break;
        
      case 'subscription.resumed':
        await handleSubscriptionResumed(event, supabase, processingStart);
        break;
        
      case 'subscription.pending':
        await handleSubscriptionPending(event, supabase, processingStart);
        break;
        
      case 'subscription.completed':
        await handleSubscriptionCompleted(event, supabase, processingStart);
        break;
        
      default:
        logger.warn('Unhandled webhook event type', { eventType: event.event, eventId: event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id });
    }

    const processingDuration = Date.now() - processingStart;
    logger.info(`✅ Webhook processed successfully in ${processingDuration}ms`);
    
    return NextResponse.json({ 
      received: true, 
      event_type: event.event,
      processing_time_ms: processingDuration 
    });

  } catch (error) {
    const processingDuration = Date.now() - processingStart;
    logger.error('❌ Webhook processing error:', { error: error instanceof Error ? error.message : String(error) });
    
    // Log failed webhook processing
    await logWebhookError(event, error as Error, supabase, processingDuration);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      event_type: event?.event || 'unknown',
      processing_time_ms: processingDuration 
    }, { status: 500 });
  }
}

async function handlePaymentCaptured(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const payment = event.payload.payment!.entity;
  
  logger.info('🎯 Payment captured', { 
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method
  });

  // If this payment is related to a subscription, update the subscription status
  if (payment.notes?.subscriptionId) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', payment.notes.subscriptionId);

    if (error) {
      logger.error('❌ Error updating subscription after payment capture', { 
        error: error.message,
        paymentId: payment.id,
        subscriptionId: payment.notes.subscriptionId
      });
    }
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handlePaymentFailed(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const payment = event.payload.payment!.entity;
  
  logger.warn('⚠️ Payment failed', { 
    paymentId: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    errorCode: payment.error_code,
    errorDescription: payment.error_description
  });

  // If this payment is related to a subscription, update the subscription status
  if (payment.notes?.subscriptionId) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', payment.notes.subscriptionId);

    if (error) {
      logger.error('❌ Error updating subscription after payment failure', { 
        error: error.message,
        paymentId: payment.id,
        subscriptionId: payment.notes.subscriptionId
      });
    }
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionActivated(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('✅ Subscription activated', { 
    subscriptionId: subscription.id,
    planId: subscription.plan_id,
    customerId: subscription.customer_id,
    status: subscription.status
  });

  // Find user from subscription notes or customer
  let userId: string | null = subscription.notes?.userId || null;

  if (!userId) {
    // Try to find user by customer ID
    const razorpay = getRazorpay();
    if (razorpay) {
      try {
        const customer = await razorpay.customers.fetch(subscription.customer_id);
        if (customer.email) {
          const { data: profile } = await supabase.rpc('get_user_id_by_email', {
            p_email: customer.email
          });
          userId = profile;
        }
      } catch (error) {
        logger.warn('⚠️ Could not fetch customer details', { 
          customerId: subscription.customer_id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  if (!userId) {
    logger.error('❌ Could not find user for subscription', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer_id
    });
    return;
  }

  // Check if subscription already exists
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('razorpay_subscription_id', subscription.id)
    .single();

  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date(subscription.current_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      logger.error('❌ Error updating subscription', { 
        error: error.message,
        subscriptionId: subscription.id
      });
    }
  } else {
    // Find plan by Razorpay plan ID
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id, name, billing_cycle')
      .eq('razorpay_plan_id', subscription.plan_id)
      .single();

    if (!plan) {
      logger.error('❌ Plan not found for subscription', { 
        planId: subscription.plan_id,
        subscriptionId: subscription.id
      });
      return;
    }

    // Create new subscription
    const { error } = await supabase.rpc('create_subscription', {
      p_user_id: userId,
      p_plan_id: plan.id,
      p_billing_cycle: plan.billing_cycle,
      p_razorpay_customer_id: subscription.customer_id,
      p_razorpay_subscription_id: subscription.id,
      p_razorpay_price_id: subscription.plan_id,
      p_amount: subscription.plan?.item?.amount || 0,
      p_current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      p_current_period_end: new Date(subscription.current_end * 1000).toISOString()
    });

    if (error) {
      logger.error('❌ Error creating subscription', { 
        error: error.message,
        subscriptionId: subscription.id,
        userId,
        planId: plan.id
      });
      return;
    }

    logger.info('✅ Subscription created successfully', { 
      subscriptionId: subscription.id,
      userId,
      planName: plan.name
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionCharged(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  const payment = event.payload.payment?.entity;
  
  logger.info('💳 Subscription charged', { 
    subscriptionId: subscription.id,
    paymentId: payment?.id,
    amount: payment?.amount,
    status: subscription.status
  });

  // Update subscription with new period dates
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error updating subscription after charge', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionCancelled(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('🚫 Subscription cancelled', { 
    subscriptionId: subscription.id,
    status: subscription.status,
    endedAt: subscription.ended_at
  });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ends_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(),
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error canceling subscription', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionPaused(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('⏸️ Subscription paused', { 
    subscriptionId: subscription.id,
    status: subscription.status
  });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error pausing subscription', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionResumed(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('▶️ Subscription resumed', { 
    subscriptionId: subscription.id,
    status: subscription.status
  });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      paused_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error resuming subscription', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionPending(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('🕒 Subscription pending', { 
    subscriptionId: subscription.id,
    status: subscription.status
  });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error updating subscription to pending', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionCompleted(
  event: RazorpayWebhookEvent, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.payload.subscription!.entity;
  
  logger.info('✅ Subscription completed', { 
    subscriptionId: subscription.id,
    status: subscription.status,
    endedAt: subscription.ended_at
  });

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'completed',
      ends_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error completing subscription', { 
      error: error.message,
      subscriptionId: subscription.id
    });
  }

  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function logWebhookEvent(
  event: RazorpayWebhookEvent,
  supabase: SupabaseClient,
  processingDuration: number
): Promise<void> {
  // Find subscription ID if event relates to a subscription
  let subscriptionId = null;
  
  const razorpaySubscriptionId = event.payload?.subscription?.entity?.id;
  
  if (razorpaySubscriptionId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('razorpay_subscription_id', razorpaySubscriptionId)
      .single();
    
    subscriptionId = data?.id;
  }

  if (subscriptionId) {
    await supabase
      .from('subscription_events')
      .insert({
        subscription_id: subscriptionId,
        event_type: event.event.includes('payment') ? 
          (event.event.includes('captured') ? 'payment_succeeded' : 'payment_failed') :
          event.event.replace('subscription.', ''),
        event_data: {
          razorpay_event_id: event.payload?.subscription?.entity?.id || event.payload?.payment?.entity?.id,
          razorpay_event_type: event.event,
          event_created: event.created_at || Math.floor(Date.now() / 1000)
        },
        webhook_id: event.payload?.subscription?.entity?.id || event.payload?.payment?.entity?.id || 'unknown',
        processing_duration_ms: processingDuration
      });
  }
}

async function logWebhookError(
  event: RazorpayWebhookEvent | null,
  error: Error,
  supabase: SupabaseClient,
  processingDuration: number
): Promise<void> {
  logger.error(`❌ Webhook error for ${event?.event || 'unknown'}`, {
    eventType: event?.event || 'unknown',
    eventId: event?.payload?.subscription?.entity?.id || event?.payload?.payment?.entity?.id || 'unknown',
    error: error.message,
    stack: error.stack,
    processingDuration
  });

  void supabase;
}