import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { logger } from '@/lib/logger'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

interface RazorpayPayment {
  id: string
  amount: number
  currency: string
  status: string
  method: string
  captured: boolean
  created_at: number
  email?: string
  notes?: Record<string, string>
}

interface RazorpaySubscription {
  id: string
  plan_id: string
  customer_id: string
  status: string
  current_start: number
  current_end: number
  charge_at: number
  total_count: number | string
  paid_count: number | string
  remaining_count: number | string
  notes?: Record<string, string>
}

interface RazorpayPaymentLink {
  id: string
  amount: number
  currency: string
  status: string
  short_url: string
  created_at: string | number
  accept_partial: boolean
  description: string
  customer?: {
    email?: string
  }
}

// POST /api/verify-payment-session - Verify Razorpay payment/subscription
export async function POST(request: NextRequest) {
  try {
    const razorpay = getRazorpay()
    if (!razorpay) {
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    const { paymentId, subscriptionId, paymentLinkId } = await request.json()

    if (!paymentId && !subscriptionId && !paymentLinkId) {
      return NextResponse.json({ error: 'Payment ID, Subscription ID, or Payment Link ID required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let verificationData: Record<string, unknown> | null = null

    // Handle payment verification
    if (paymentId) {
      try {
        const payment = await razorpay.payments.fetch(paymentId) as RazorpayPayment

        // Check if payment was successful
        if (payment.status !== 'captured') {
          return NextResponse.json({ 
            error: 'Payment not completed', 
            payment_status: payment.status 
          }, { status: 400 })
        }

        // Verify this payment belongs to the current user (check notes)
        if (payment.notes?.userId !== user.id) {
          return NextResponse.json({ error: 'Payment not found or unauthorized' }, { status: 404 })
        }

        verificationData = {
          type: 'payment',
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paymentStatus: payment.status,
          method: payment.method,
          captured: payment.captured,
          createdAt: payment.created_at,
          customerEmail: payment.email,
          subscriptionId: payment.notes?.subscriptionId || null,
        }

        // Get plan details if available
        if (payment.notes?.planId) {
          const planDetails = await getPlanDetails(supabase, payment.notes.planId as string)
          if (planDetails) {
            verificationData.planName = planDetails.name
            verificationData.billingCycle = payment.notes.billingCycle || 'monthly'
          }
        }

      } catch (error) {
        logger.error('Payment verification error:', { 
          paymentId, 
          error: error instanceof Error ? error.message : String(error) 
        })
        
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
      }
    }

    // Handle subscription verification
    if (subscriptionId && !verificationData) {
      try {
        const subscription = await razorpay.subscriptions.fetch(subscriptionId) as RazorpaySubscription

        // Verify this subscription belongs to the current user
        if (subscription.notes?.userId !== user.id) {
          return NextResponse.json({ error: 'Subscription not found or unauthorized' }, { status: 404 })
        }

        verificationData = {
          type: 'subscription',
          subscriptionId: subscription.id,
          customerId: subscription.customer_id,
          planId: subscription.plan_id,
          status: subscription.status,
          currentStart: subscription.current_start,
          currentEnd: subscription.current_end,
          chargeAt: subscription.charge_at,
          totalCount: subscription.total_count,
          paidCount: subscription.paid_count,
          remainingCount: subscription.remaining_count,
        }

        // Get plan details
        if (subscription.notes?.planId) {
          const planDetails = await getPlanDetails(supabase, subscription.notes.planId as string)
          if (planDetails) {
            verificationData.planName = planDetails.name
            verificationData.amount = planDetails.price_inr
            verificationData.billingCycle = subscription.notes.billingCycle || 'monthly'
          }
        }

      } catch (error) {
        logger.error('Subscription verification error:', { 
          subscriptionId, 
          error: error instanceof Error ? error.message : String(error) 
        })
        
        return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 500 })
      }
    }

    // Handle payment link verification
    if (paymentLinkId && !verificationData) {
      try {
        const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId) as RazorpayPaymentLink

        verificationData = {
          type: 'payment_link',
          paymentLinkId: paymentLink.id,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          status: paymentLink.status,
          shortUrl: paymentLink.short_url,
          createdAt: paymentLink.created_at,
          acceptPartial: paymentLink.accept_partial,
          description: paymentLink.description,
          customerEmail: paymentLink.customer?.email,
        }

        // Get associated payments if link is paid
        if (paymentLink.status === 'paid') {
          try {
            // For Razorpay, we'll need to fetch payments separately using the payment link ID
            // This is a simplified approach - in practice, you might store payment IDs when they're created
            logger.info('Payment link is paid, payment details available in webhook', { paymentLinkId })
          } catch (error) {
            logger.warn('Could not fetch payment link payments:', { error: error instanceof Error ? error.message : String(error) })
          }
        }

      } catch (error) {
        logger.error('Payment link verification error:', { 
          paymentLinkId, 
          error: error instanceof Error ? error.message : String(error) 
        })
        
        return NextResponse.json({ error: 'Failed to verify payment link' }, { status: 500 })
      }
    }

    if (!verificationData) {
      return NextResponse.json({ error: 'No valid payment data found' }, { status: 404 })
    }

    logger.info('Payment verification successful:', {
      userId: user.id,
      type: verificationData.type,
      paymentId,
      subscriptionId,
      paymentLinkId,
      status: verificationData.status || verificationData.paymentStatus
    })

    return NextResponse.json(verificationData)

  } catch (error) {
    logger.error('Payment verification API error:', { error: error instanceof Error ? error.message : String(error) })
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Helper function to get plan details
async function getPlanDetails(supabase: SupabaseClient, planId: string) {
  try {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id, name, price_inr, billing_cycle')
      .eq('id', planId)
      .single()

    return plan
  } catch (error) {
    logger.warn('Could not fetch plan details:', { planId, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}