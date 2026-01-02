/**
 * SubscriptionService - Handles Razorpay subscription operations
 * Manages subscription creation, updates, cancellation, and billing operations
 */

import { createClient as createServerClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'
import { RazorpayClient, type RazorpaySubscription } from './razorpay-client'
import { OrderService } from './order.service'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

// Type definitions for subscription operations
export interface CreateSubscriptionData {
  plan_id: string
  customer_id: string
  total_count: number
  quantity?: number
  start_at?: number
  expire_by?: number
  customer_notify?: boolean
  notes?: Record<string, string | number | null>
  addons?: Array<{
    item: {
      name: string
      amount: number
      currency: string
    }
  }>
}

export interface UpdateSubscriptionData {
  plan_id: string
  schedule_change_at?: 'now' | 'cycle_end'
  customer_notify?: boolean
  quantity?: number
  remaining_count?: number
}

export interface SubscriptionUpgradeData {
  subscriptionId: string
  newPlanId: string
  billingCycle: 'monthly' | 'annual'
  currentPlan: {
    id: string
    type: string
    cycle: string
    amount: number
  }
  newPlan: {
    id: string
    type: string
    cycle: string
    amount: number
  }
  prorationAmount: number
  userId: string
  gymId: string
}

export interface SubscriptionDowngradeData {
  subscriptionId: string
  newPlanId: string
  billingCycle: 'monthly' | 'annual'
  refundAmount: number
  userId: string
  gymId: string
}

export interface PaymentResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  requiresPayment?: boolean
  orderId?: string
  amount?: number
  currency?: string
  upgradeType?: 'billing_cycle_change' | 'tier_change' | 'plan_change'
  subscriptionData?: SubscriptionUpgradeData
  refund?: {
    refundId: string
    amount: number
    status: string
  }
  checkout?: {
    key: string
    order_id: string
    name: string
    description: string
    image: string
    prefill: {
      name: string
      email: string
    }
    theme: {
      color: string
    }
    modal?: {
      ondismiss?: () => void
    }
    handler?: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  }
}

export type RazorpaySubscriptionResult = RazorpaySubscription

/**
 * SubscriptionService - Subscription management operations
 */
export class SubscriptionService {
  /**
   * Create a Razorpay subscription
   */
  static async createSubscription(subscriptionData: CreateSubscriptionData): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Creating Razorpay subscription', { subscriptionData })
      
      const subscription = await razorpay.subscriptions.create(subscriptionData)

      logger.info('Razorpay subscription created successfully', {
        subscriptionId: subscription.id,
        planId: subscription.plan_id,
        customerId: subscription.customer_id
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to create Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionData
      })
      throw error
    }
  }

  /**
   * Update a Razorpay subscription
   */
  static async updateSubscription(subscriptionId: string, updateData: UpdateSubscriptionData): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Updating Razorpay subscription', { subscriptionId, updateData })
      
      const subscription = await razorpay.subscriptions.update(subscriptionId, updateData)

      logger.info('Razorpay subscription updated successfully', {
        subscriptionId,
        planId: subscription.plan_id,
        status: subscription.status
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to update Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        updateData
      })
      throw error
    }
  }

  /**
   * Fetch a Razorpay subscription
   */
  static async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Fetching Razorpay subscription', { subscriptionId })
      
      const subscription = await razorpay.subscriptions.fetch(subscriptionId)

      logger.info('Razorpay subscription fetched successfully', {
        subscriptionId,
        status: subscription.status
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to fetch Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId
      })
      throw error
    }
  }

  /**
   * Cancel a Razorpay subscription
   */
  static async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Cancelling Razorpay subscription', { subscriptionId, cancelAtCycleEnd })
      
      const subscription = await razorpay.subscriptions.cancel(subscriptionId, cancelAtCycleEnd)

      logger.info('Razorpay subscription cancelled successfully', {
        subscriptionId,
        status: subscription.status
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to cancel Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        cancelAtCycleEnd
      })
      throw error
    }
  }

  /**
   * Pause a Razorpay subscription
   */
  static async pauseSubscription(subscriptionId: string, pauseAt: 'now' | number = 'now'): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Pausing Razorpay subscription', { subscriptionId, pauseAt })
      
      const subscription = await razorpay.subscriptions.pause(subscriptionId, {
        pause_at: pauseAt === 'now' ? 'now' : 'now' // Razorpay only supports 'now' for pause
      })

      logger.info('Razorpay subscription paused successfully', {
        subscriptionId,
        status: subscription.status
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to pause Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        pauseAt
      })
      throw error
    }
  }

  /**
   * Resume a Razorpay subscription
   */
  static async resumeSubscription(subscriptionId: string, resumeAt: 'now' | number = 'now'): Promise<RazorpaySubscriptionResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Resuming Razorpay subscription', { subscriptionId, resumeAt })
      
      const subscription = await razorpay.subscriptions.resume(subscriptionId, {
        resume_at: resumeAt === 'now' ? 'now' : 'now' // Razorpay only supports 'now' for resume
      })

      logger.info('Razorpay subscription resumed successfully', {
        subscriptionId,
        status: subscription.status
      })

      return subscription as RazorpaySubscription
    } catch (error) {
      logger.error('Failed to resume Razorpay subscription', {
        error: error instanceof Error ? error.message : String(error),
        subscriptionId,
        resumeAt
      })
      throw error
    }
  }

  /**
   * Handle subscription upgrade with payment
   */
  static async handleSubscriptionUpgrade(upgradeData: SubscriptionUpgradeData): Promise<PaymentResult> {
    try {
      const { subscriptionId, newPlanId, billingCycle, prorationAmount, userId, gymId } = upgradeData

      // Validate proration amount
      if (prorationAmount < 100) { // Minimum 1 rupee in paise
        logger.warn('Proration amount too small, treating as free upgrade', {
          prorationAmount,
          subscriptionId
        })
        
        // Update subscription directly for very small amounts
        const supabase = await createServerClient()
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            subscription_plan_id: newPlanId,
            billing_cycle: billingCycle,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscriptionId)

        if (updateError) {
          throw new Error(`Failed to update subscription: ${updateError.message}`)
        }

        return {
          success: true,
          data: {
            message: 'Subscription upgraded successfully (no payment required)',
            subscription: {
              id: subscriptionId,
              status: 'active',
              plan_id: newPlanId,
              billing_cycle: billingCycle
            }
          }
        }
      }

      // Create Razorpay order for the proration amount
      const orderData = {
        amount: Math.round(prorationAmount),
        currency: 'INR',
        receipt: `upg_${Date.now()}`,
        notes: {
          type: 'subscription_upgrade',
          subscriptionId,
          newPlanId,
          billingCycle,
          userId,
          gymId
        }
      }

      const order = await OrderService.createOrder(orderData)

      // Get user profile for checkout data
      const supabase = await createServerClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

      return {
        success: true,
        requiresPayment: true,
        orderId: order.id,
        amount: prorationAmount,
        currency: 'INR',
        upgradeType: 'tier_change', // This could be determined more precisely
        subscriptionData: upgradeData,
        checkout: {
          key: serverConfig.razorpayKeyId!,
          order_id: order.id,
          name: 'Centric Fit Pro',
          description: `Subscription upgrade - ${upgradeData.newPlan.type} (${billingCycle})`,
          image: '/icon.svg',
          prefill: {
            name: profile?.full_name || 'Customer',
            email: '', // Will be filled by frontend
          },
          theme: {
            color: '#3B82F6',
          }
        }
      }
    } catch (error) {
      logger.error('Subscription upgrade failed', {
        error: error instanceof Error ? error.message : String(error),
        upgradeData
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process upgrade'
      }
    }
  }

  /**
   * Handle subscription downgrade with refund
   */
  static async handleSubscriptionDowngrade(downgradeData: SubscriptionDowngradeData): Promise<PaymentResult> {
    try {
      const { subscriptionId, newPlanId, billingCycle, refundAmount } = downgradeData

      // Update subscription in database first
      const supabase = await createServerClient()
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          subscription_plan_id: newPlanId,
          billing_cycle: billingCycle,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`)
      }

      // Update Razorpay subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('razorpay_subscription_id')
        .eq('id', subscriptionId)
        .single()

      if (subscription?.razorpay_subscription_id) {
        try {
          await this.updateSubscription(subscription.razorpay_subscription_id, {
            plan_id: `plan_${newPlanId}_${billingCycle}`,
            schedule_change_at: 'now',
            customer_notify: true
          })
        } catch (razorpayError) {
          logger.warn('Failed to update Razorpay subscription for downgrade', {
            error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
            subscriptionId
          })
        }
      }

      // Process refund for unused portion (if significant amount)
      let refundResult = null
      if (refundAmount >= 100) { // Only refund if amount is at least ₹1
        try {
          // Note: In a real implementation, you would need to store payment details
          // to process refunds. For now, we'll skip the refund and just downgrade
          logger.warn('Refund processing not implemented - no payment storage available', {
            subscriptionId,
            refundAmount
          })
          
          // Skip refund processing for now
          refundResult = null
        } catch (refundError) {
          logger.error('Failed to create refund for subscription downgrade', {
            error: refundError instanceof Error ? refundError.message : String(refundError),
            subscriptionId,
            refundAmount
          })
          // Don't fail the downgrade if refund fails
        }
      }

      return {
        success: true,
        data: {
          message: refundResult 
            ? `Subscription downgraded successfully. Refund of ₹${refundAmount / 100} will be processed.`
            : 'Subscription downgraded successfully',
          subscription: {
            id: subscriptionId,
            status: 'active',
            plan_id: newPlanId,
            billing_cycle: billingCycle
          },
          refund: refundResult
        }
      }
    } catch (error) {
      logger.error('Subscription downgrade failed', {
        error: error instanceof Error ? error.message : String(error),
        downgradeData
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process downgrade'
      }
    }
  }

  /**
   * Get subscription by ID from database
   */
  static async getSubscriptionById(subscriptionId: string): Promise<Tables['subscriptions']['Row'] | null> {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch subscription: ${error.message}`)
    }

    return data
  }

  /**
   * Get subscription plan by ID
   */
  static async getSubscriptionPlan(planId: string): Promise<Tables['subscription_plans']['Row'] | null> {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch subscription plan: ${error.message}`)
    }

    return data
  }
}
