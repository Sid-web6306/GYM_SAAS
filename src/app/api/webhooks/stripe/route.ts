import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { logger, performanceTracker } from '@/lib/logger';

// Initialize Stripe client lazily to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  });
};

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Extended Stripe types with required properties
interface SubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature')!;
  
  let event: Stripe.Event;
  const processingStart = Date.now();
  
  performanceTracker.start('stripe-webhook');

  try {
    event = getStripe().webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { 
      error: err instanceof Error ? err.message : String(err) 
    });
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    logger.info('Processing Stripe webhook', { 
      eventType: event.type, 
      eventId: event.id 
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event, supabase, processingStart);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, supabase, processingStart);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, supabase, processingStart);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase, processingStart);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, supabase, processingStart);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, supabase, processingStart);
        break;
        
      case 'invoice.finalized':
        await handleInvoiceFinalized(event, supabase, processingStart);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event, supabase, processingStart);
        break;
        
      default:
        logger.warn('Unhandled webhook event type', { eventType: event.type, eventId: event.id });
    }

    const processingDuration = Date.now() - processingStart;
    logger.info(`✅ Webhook processed successfully in ${processingDuration}ms`);
    
    return NextResponse.json({ 
      received: true, 
      event_type: event.type,
      processing_time_ms: processingDuration 
    });

  } catch (error) {
    const processingDuration = Date.now() - processingStart;
    logger.error('❌ Webhook processing error:', {error});
    
    // Log failed webhook processing
    await logWebhookError(event, error as Error, supabase, processingDuration);
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      event_type: event.type,
      processing_time_ms: processingDuration 
    }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  console.log('session', session);
  
  if (!session.customer || !session.subscription) {
    logger.warn('⚠️ Checkout session missing customer or subscription', { 
      sessionId: session.id,
      hasCustomer: !!session.customer,
      hasSubscription: !!session.subscription
    });
    return;
  }

  let userId: string | null = null;

  // First, try to get user ID from session metadata
  if (session.metadata?.userId) {
    userId = session.metadata.userId;
    
    // Update the user's stripe_customer_id if not already set
    const { error: updateError } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('profiles')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      logger.warn('⚠️ Could not update stripe_customer_id for user:', {userId, error: (updateError as Record<string, unknown>).message as string});
    }
  }

  if (!userId) {
    logger.error('❌ Could not find user for checkout session. Customer:', {customer: session.customer, metadata: session.metadata});
    return;
  }

  logger.info('✅ Checkout session completed for user:', {userId});
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionCreated(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.data.object as SubscriptionWithPeriods;
  
  let userId: string | null = subscription.metadata.userId;

  // If userId not found in subscription metadata, try to find it through other means
  if (!userId) {
    logger.info('🔍 User ID not found in subscription metadata, trying alternative lookup methods', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      metadata: subscription.metadata
    });

    // Method 1: Try to find user by getting customer email from Stripe
    if (!userId && typeof subscription.customer === 'string') {
      try {
        // Get customer from Stripe to get email
        const customer = await getStripe().customers.retrieve(subscription.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          // Get user ID by email using RPC function
          const { data: profile } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('get_user_id_by_email', {
            p_email: customer.email
          });

          if (profile) {
            userId = profile as string;
            logger.info('✅ Found user via Stripe customer email lookup', { 
              userId, 
              customerEmail: customer.email,
              customerId: subscription.customer 
            });
          }
                 }
       } catch (stripeError) {
         logger.warn('⚠️ Failed to lookup customer from Stripe', { 
           error: stripeError instanceof Error ? stripeError.message : 'Unknown error',
           customerId: subscription.customer 
         });
       }
     }
   }

  if (!userId) {
    logger.error('❌ Could not find user for subscription after all lookup attempts', { 
      customerId: subscription.customer, 
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
      attemptedMethods: ['subscription_metadata', 'profile_lookup', 'stripe_customer_lookup']
    });
    return;
  }

  // Check if subscription already exists
  const { data: existingSubscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (existingSubscription) {
    logger.info('⚠️ Subscription already exists, treating as update', { 
      subscriptionId: (existingSubscription as Record<string, unknown>).id as string,
      stripeSubscriptionId: subscription.id,
      userId
    });
    // Call the update handler instead
    await handleSubscriptionUpdated(event, supabase, processingStart);
    return;
  }

  // Get subscription plan by Stripe product ID
  const productId = typeof subscription.items.data[0].price.product === 'string' 
    ? subscription.items.data[0].price.product 
    : subscription.items.data[0].price.product.id;

  const { data: plans } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscription_plans')
    .select('id, name')
    .eq('stripe_product_id', productId)
    .single();

  if (!plans) {
    logger.error('❌ Subscription plan not found for product', { 
      productId,
      subscriptionId: subscription.id,
      userId 
    });
    return;
  }

  // Create subscription using existing function
  const billingCycle = subscription.items.data[0].price.recurring?.interval === 'year' ? 'annual' : 'monthly';
  
  const { data: subscriptionId, error } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('create_subscription', {
    p_user_id: userId,
    p_plan_id: (plans as Record<string, unknown>).id as string,
    p_billing_cycle: billingCycle,
    p_stripe_customer_id: subscription.customer as string,
    p_stripe_subscription_id: subscription.id,
    p_stripe_price_id: subscription.items.data[0].price.id,
    p_amount: subscription.items.data[0].price.unit_amount || 0,
    p_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
  });

  if (error) {
    logger.error('❌ Error creating subscription', { 
      error: (error as Record<string, unknown>).message as string,
      userId,
      planId: (plans as Record<string, unknown>).id as string,
      stripeSubscriptionId: subscription.id
    });
    return;
  }

  logger.info('✅ Subscription created successfully', { 
    subscriptionId, 
    userId,
    planName: (plans as Record<string, unknown>).name as string,
    billingCycle,
    stripeSubscriptionId: subscription.id
  });
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionUpdated(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.data.object as SubscriptionWithPeriods;
  
  logger.info('🔄 Processing subscription update', { 
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer
  });

  // Get current subscription data to detect changes
  const { data: currentSubscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!currentSubscription) {
    logger.warn('⚠️ Subscription not found in database, treating as new', { 
      stripeSubscriptionId: subscription.id 
    });
    // If subscription doesn't exist, treat as creation
    await handleSubscriptionCreated(event, supabase, processingStart);
    return;
  }

  // Extract pricing and plan information
  const newPriceId = subscription.items.data[0]?.price.id;
  const newAmount = subscription.items.data[0]?.price.unit_amount || 0;
  const newBillingCycle = subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';

  // Detect if this is a plan change
  const isPlanChange = (currentSubscription as Record<string, unknown>).stripe_price_id !== newPriceId;
  const isStatusChange = (currentSubscription as Record<string, unknown>).status !== subscription.status;
  const isBillingCycleChange = (currentSubscription as Record<string, unknown>).billing_cycle !== newBillingCycle;

  // Prepare update data based on Stripe subscription object
  const updateData: {
    status: string;
    current_period_start: string;
    current_period_end: string;
    amount: number;
    billing_cycle: string;
    updated_at: string;
    subscription_plan_id?: string;
    stripe_price_id?: string;
    canceled_at?: string;
    trial_end?: string;
  } = {
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    amount: newAmount,
    billing_cycle: newBillingCycle,
    updated_at: new Date().toISOString()
  };

  // Handle plan changes
  if (isPlanChange && newPriceId) {
    // Get new plan information
    const productId = typeof subscription.items.data[0].price.product === 'string' 
      ? subscription.items.data[0].price.product 
      : subscription.items.data[0].price.product.id;

    const { data: newPlan } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscription_plans')
      .select('id, name')
      .eq('stripe_product_id', productId)
      .single();

    if (newPlan) {
      updateData.subscription_plan_id = (newPlan as Record<string, unknown>).id as string;
      updateData.stripe_price_id = newPriceId;
      
      logger.info('📋 Plan change detected', {
        oldPlan: (currentSubscription as Record<string, unknown>).subscription_plan_id,
        newPlan: (newPlan as Record<string, unknown>).id as string,
        oldPrice: (currentSubscription as Record<string, unknown>).stripe_price_id,
        newPrice: newPriceId
      });
    }
  }

  // Handle cancellation
  if (subscription.canceled_at) {
    updateData.canceled_at = new Date(subscription.canceled_at * 1000).toISOString();
  }

  // Handle trial end
  if (subscription.trial_end) {
    updateData.trial_end = new Date(subscription.trial_end * 1000).toISOString();
  }

  // Update subscription in database
  const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error updating subscription', { 
      error: (error as Record<string, unknown>).message as string,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      updateData
    });
    return;
  }

  // Determine event type based on changes
  let eventType = 'updated';
  if (isPlanChange) eventType = 'plan_changed';
  if (isStatusChange && subscription.status === 'canceled') eventType = 'canceled';
  if (isStatusChange && subscription.status === 'active') eventType = 'activated';
  if (isBillingCycleChange) eventType = 'billing_cycle_changed';

  // Log subscription event with detailed information
  await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } }).from('subscription_events')
    .insert({
      subscription_id: (currentSubscription as Record<string, unknown>).id as string,
      event_type: eventType,
      event_data: {
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        previous_status: (currentSubscription as Record<string, unknown>).status,
        current_period_end: subscription.current_period_end,
        amount: newAmount,
        previous_amount: (currentSubscription as Record<string, unknown>).amount,
        billing_cycle: newBillingCycle,
        previous_billing_cycle: (currentSubscription as Record<string, unknown>).billing_cycle,
        plan_changed: isPlanChange,
        status_changed: isStatusChange,
        billing_cycle_changed: isBillingCycleChange,
        canceled_at: subscription.canceled_at,
        trial_end: subscription.trial_end
      },
      webhook_id: event.id,
      processing_duration_ms: Date.now() - processingStart
    });

  logger.info('✅ Subscription updated successfully', { 
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    eventType,
    planChanged: isPlanChange,
    statusChanged: isStatusChange,
    billingCycleChanged: isBillingCycleChange,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
  });
  
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleSubscriptionDeleted(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  
  // Update subscription status
  const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('subscriptions')
    .update({
      status: 'canceled',
      ends_at: new Date().toISOString(),
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logger.error('❌ Error canceling subscription', { 
      error: (error as Record<string, unknown>).message as string,
      stripeSubscriptionId: subscription.id
    });
    return;
  }

  logger.info('✅ Subscription canceled successfully', { 
    stripeSubscriptionId: subscription.id,
    canceledAt: new Date().toISOString()
  });
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleInvoicePaymentSucceeded(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const invoice = event.data.object as InvoiceWithSubscription;
  
  if (!invoice.subscription) {
    logger.warn('Invoice payment succeeded but no subscription found', { 
      invoiceId: invoice.id,
      customerId: invoice.customer
    });
    return;
  }

  // Update subscription status to active
  const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    logger.error('❌ Error updating subscription after payment success', { 
      error: (error as Record<string, unknown>).message as string,
      invoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription,
      amountPaid: invoice.amount_paid
    });
    return;
  }

  // Store invoice document
  await storeInvoiceDocument(invoice, supabase);

  logger.info('✅ Payment succeeded for subscription', { 
    invoiceId: invoice.id,
    stripeSubscriptionId: invoice.subscription,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency
  });
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleInvoicePaymentFailed(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const invoice = event.data.object as InvoiceWithSubscription;
  
  if (!invoice.subscription) {
    logger.warn('Invoice payment failed but no subscription found', { 
      invoiceId: invoice.id,
      customerId: invoice.customer
    });
    return;
  }

  // Update subscription status to past_due
  const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    logger.error('❌ Error updating subscription after payment failure', { 
      error: (error as Record<string, unknown>).message as string,
      invoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription,
      amountDue: invoice.amount_due
    });
    return;
  }

  logger.warn('⚠️ Payment failed for subscription', { 
    invoiceId: invoice.id,
    stripeSubscriptionId: invoice.subscription,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
  });
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

// Helper function to store invoice documents in database using RPC
async function storeInvoiceDocument(
  invoice: InvoiceWithSubscription, 
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Find user ID from subscription
    let userId: string | null = null;
    
    if (invoice.subscription) {
      const { data: subscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();
      
      userId = (subscription as Record<string, unknown>)?.user_id as string || null;
    }

    // If no subscription, try to find user by customer email
    if (!userId && invoice.customer) {
      try {
        const customer = await getStripe().customers.retrieve(invoice.customer as string);
        
        if (customer && !customer.deleted && customer.email) {
          // Get user ID by email using RPC function
          const { data: profile } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('get_user_id_by_email', {
            p_email: customer.email
          });

          userId = profile as string || null;
        }
      } catch (stripeError) {
        logger.warn('⚠️ Could not fetch customer from Stripe for document storage', {
          customerId: invoice.customer,
          error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        });
      }
    }

    if (!userId) {
      logger.warn('⚠️ Could not find user for invoice document storage', {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        subscriptionId: invoice.subscription
      });
      return;
    }

    // Create document title
    const planName = invoice.subscription ? 'Subscription' : 'Payment';
    const title = invoice.number 
      ? `Invoice #${invoice.number}` 
      : `${planName} Invoice`;

    // Format description
    const description = `${planName} invoice for ${invoice.currency?.toUpperCase()} ${(invoice.amount_paid || 0) / 100}`;

    // Store document using RPC function for security
    const { data: documentId, error } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('create_document', {
      p_user_id: userId,
      p_type: 'invoice',
      p_title: title,
      p_description: description,
      p_stripe_id: invoice.id,
      p_download_url: invoice.invoice_pdf || undefined,
      p_hosted_url: invoice.hosted_invoice_url || undefined,
      p_amount: invoice.amount_paid || 0,
      p_currency: (invoice.currency || 'inr').toUpperCase(),
      p_status: invoice.status || undefined,
      p_document_date: new Date(invoice.created * 1000).toISOString().split('T')[0],
      p_metadata: {
        number: invoice.number,
        subscription_id: invoice.subscription,
        customer_id: typeof invoice.customer === 'string' ? invoice.customer : null,
        attempt_count: invoice.attempt_count,
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        tags: ['invoice', 'stripe', 'subscription']
      }
    });

    if (error) {
      // Check if it's a duplicate (already exists)
      if ((error as Record<string, unknown>).code === '23505') {
        logger.info('📄 Document already exists for invoice', {
          invoiceId: invoice.id,
          userId
        });
        return;
      }

      logger.error('❌ Error storing invoice document', {
        error: (error as Record<string, unknown>).message as string,
        invoiceId: invoice.id,
        userId
      });
      return;
    }

    logger.info('✅ Invoice document stored successfully', {
      documentId: documentId,
      invoiceId: invoice.id,
      userId,
      title,
      downloadUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
      amount: invoice.amount_paid
    });

  } catch (error) {
    logger.error('❌ Error in storeInvoiceDocument', {
      error: error instanceof Error ? error.message : String(error),
      invoiceId: invoice.id
    });
  }
}

async function handleInvoiceFinalized(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const invoice = event.data.object as InvoiceWithSubscription;
  
  // This event is useful for tracking when invoices become available for download
  logger.info('📄 Invoice finalized', { 
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    amountDue: invoice.amount_due,
    status: invoice.status
  });
  
  // Store invoice document when finalized (has PDF URLs)
  await storeInvoiceDocument(invoice, supabase);
  
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function handleCustomerUpdated(
  event: Stripe.Event, 
  supabase: SupabaseClient, 
  processingStart: number
): Promise<void> {
  const customer = event.data.object as Stripe.Customer;
  logger.info('✅ Customer updated', { 
    customerId: customer.id,
    email: customer.email,
    name: customer.name
  });
  
  if (!customer.email) {
    logger.warn('⚠️ Customer update skipped - no email address', { 
      customerId: customer.id 
    });
    return;
  }
  
  // Update customer details in profiles by finding user with matching email
  // Get user ID by email using RPC function
  const { data: userId, error: userLookupError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('get_user_id_by_email', {
    p_email: customer.email
  });

  if (userLookupError) {
    logger.error('❌ Error looking up user by email', { 
      error: (userLookupError as Record<string, unknown>).message as string,
      email: customer.email,
      customerId: customer.id
    });
    return;
  }

  if (!userId) {
    logger.error('❌ User not found for customer email', { 
      email: customer.email,
      customerId: customer.id 
    });
    return;
  }

  const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (column: string, value: string) => Promise<{ error: unknown }> } } }).from('profiles')
    .update({
      updated_at: new Date().toISOString()
    })
    .eq('id', userId as string);

  if (error) {
    logger.error('❌ Error updating customer profile', { 
      error: (error as Record<string, unknown>).message as string,
      customerId: customer.id,
      email: customer.email,
      name: customer.name
    });
    return;
  }

  logger.info('✅ Customer updated successfully', { 
    customerId: customer.id,
    email: customer.email,
    name: customer.name
  });
  await logWebhookEvent(event, supabase, Date.now() - processingStart);
}

async function logWebhookEvent(
  event: Stripe.Event,
  supabase: SupabaseClient,
  processingDuration: number
): Promise<void> {
  // Find subscription ID if event relates to a subscription
  let subscriptionId = null;
  
  if ('subscription' in event.data.object && event.data.object.subscription) {
    const stripeSubscriptionId = typeof event.data.object.subscription === 'string' 
      ? event.data.object.subscription 
      : event.data.object.subscription.id;

    const { data } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();
    
    subscriptionId = (data as Record<string, unknown>)?.id as string;
  }

  if (subscriptionId) {
    await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } }).from('subscription_events')
      .insert({
        subscription_id: subscriptionId,
        event_type: event.type.includes('payment') ? 
          (event.type.includes('succeeded') ? 'payment_succeeded' : 'payment_failed') :
          'plan_changed',
        event_data: {
          stripe_event_id: event.id,
          stripe_event_type: event.type,
          event_created: event.created
        },
        webhook_id: event.id,
        processing_duration_ms: processingDuration
      });
  }
}

async function logWebhookError(
  event: Stripe.Event,
  error: Error,
  supabase: SupabaseClient,
  processingDuration: number
): Promise<void> {
  logger.error(`❌ Webhook error for ${event.type}`, {
    eventType: event.type,
    eventId: event.id,
    error: error.message,
    stack: error.stack,
    processingDuration
  });

  void supabase;
}