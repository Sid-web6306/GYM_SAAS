/**
 * PaymentService - Clean service layer for payment and subscription operations
 * Handles Razorpay integration, subscription management, and payment processing
 */

import { createClient as createServerClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'
import Razorpay from 'razorpay'
import { Database } from '@/types/supabase'

type Tables = Database['public']['Tables']

// Razorpay TypeScript interfaces based on official documentation
export interface RazorpayOrder {
  id: string
  entity: string
  amount: number | string
  amount_paid: number | string
  amount_due: number | string
  currency: string
  receipt: string
  offer_id?: string | null
  status: string
  attempts: number | string
  notes: Record<string, string | number | null>
  created_at: number | string
}

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number | string
  currency: string
  status: string
  order_id: string
  method: string
  amount_refunded?: number | string | null
  refund_status?: string | null
  captured: boolean
  description?: string | null
  card_id?: string | null
  bank?: string | null
  wallet?: string | null
  vpa?: string | null
  email: string
  contact: string | number
  fee: number | string
  tax: number | string
  error_code?: string | null
  error_description?: string | null
  error_source?: string | null
  error_step?: string | null
  error_reason?: string | null
  notes: Record<string, string | number | null>
  acquirer_data?: Record<string, unknown> | null
  created_at: number | string
}

export interface RazorpayCustomer {
  id: string
  entity: string
  name: string
  email: string
  contact: string | number
  gstin?: string | null
  notes: Record<string, string | number | null>
  created_at: number | string
}

export interface RazorpaySubscription {
  id: string
  entity: string
  plan_id: string
  customer_id: string
  status: string
  current_start: number
  current_end: number
  ended_at?: number | null
  quantity: number
  notes: Record<string, string | number | null>
  charge_at: number
  start_at: number
  end_at: number
  auth_attempts: number
  total_count: number
  paid_count: number
  customer_notify: boolean
  created_at: number
  expire_by: number
  short_url: string
  has_scheduled_changes: boolean
  change_scheduled_at?: number | null
  source: string
  payment_method: string
  offer_id?: string | null
  remaining_count: number | string
}

export interface RazorpayRefund {
  id: string
  entity: string
  amount: number | string
  currency: string
  payment_id: string
  notes: Record<string, string | number | null>
  receipt?: string | null
  acquirer_data?: Record<string, unknown> | null
  created_at: number | string
  batch_id?: string | null
  status: string
  speed_processed: string
  speed_requested: string
}

export interface RazorpayCustomerCollection {
  entity: string
  count: number
  items: RazorpayCustomer[]
}

export interface RazorpayPaymentCollection {
  entity: string
  count: number
  items: RazorpayPayment[]
}

// Using proper Supabase types from Database schema

// Type definitions for payment operations
export interface CreateOrderData {
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string | number | null>
}

export interface CreateRefundData {
  amount: number
  speed?: 'normal' | 'optimum'
  notes?: Record<string, string | number | null>
  receipt?: string
}

export interface CreateCustomerData {
  name: string
  email: string
  contact?: string
  notes?: Record<string, string | number | null>
}

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

// Use the official Razorpay types instead of custom result interfaces
export type RazorpayOrderResult = RazorpayOrder
export type RazorpayRefundResult = RazorpayRefund
export type RazorpaySubscriptionResult = RazorpaySubscription
export type RazorpayCustomerResult = RazorpayCustomer

/**
 * PaymentService - Core payment and subscription management operations
 */
export class PaymentService {
  private static razorpay: Razorpay | null = null

  // Initialize Razorpay instance
  private static initializeRazorpay(): Razorpay | null {
    if (this.razorpay) {
      return this.razorpay
    }

    if (!serverConfig.razorpayKeyId || !serverConfig.razorpayKeySecret) {
      logger.warn('Razorpay configuration not found. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.')
      return null
    }

    try {
      this.razorpay = new Razorpay({
        key_id: serverConfig.razorpayKeyId,
        key_secret: serverConfig.razorpayKeySecret,
      })
      logger.info('Razorpay service initialized successfully')
      return this.razorpay
    } catch (error) {
      logger.error('Failed to initialize Razorpay service:', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      return null
    }
  }

  /**
   * Check if Razorpay is properly configured
   */
  static isConfigured(): boolean {
    return this.initializeRazorpay() !== null
  }

  /**
   * Get the Razorpay instance
   */
  static getRazorpayInstance(): Razorpay | null {
    return this.initializeRazorpay()
  }

  /**
   * Create a Razorpay order
   */
  static async createOrder(orderData: CreateOrderData): Promise<RazorpayOrderResult> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Creating Razorpay order', { orderData })
      
      const order = await razorpay.orders.create({
        amount: Math.round(orderData.amount),
        currency: orderData.currency,
        receipt: orderData.receipt,
        notes: orderData.notes || {}
      })

      logger.info('Razorpay order created successfully', {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      })

      return order as RazorpayOrder
    } catch (error) {
      logger.error('Failed to create Razorpay order', {
        error: error instanceof Error ? error.message : String(error),
        orderData
      })
      throw error
    }
  }

  /**
   * Create a refund for a payment
   */
  static async createRefund(paymentId: string, refundData: CreateRefundData): Promise<RazorpayRefundResult> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Creating Razorpay refund', { paymentId, refundData })
      
      const refund = await razorpay.payments.refund(paymentId, {
        amount: Math.round(refundData.amount),
        speed: refundData.speed || 'normal',
        notes: refundData.notes || {},
        receipt: refundData.receipt
      })

      logger.info('Razorpay refund created successfully', {
        refundId: refund.id,
        paymentId,
        amount: refund.amount,
        status: refund.status
      })

      return refund as RazorpayRefund
    } catch (error) {
      logger.error('Failed to create Razorpay refund', {
        error: error instanceof Error ? error.message : String(error),
        paymentId,
        refundData
      })
      throw error
    }
  }

  /**
   * Create a Razorpay customer
   */
  static async createCustomer(customerData: CreateCustomerData): Promise<RazorpayCustomerResult> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Creating Razorpay customer', { customerData })
      
      const customer = await razorpay.customers.create({
        name: customerData.name,
        email: customerData.email,
        contact: customerData.contact,
        notes: customerData.notes || {}
      })

      logger.info('Razorpay customer created successfully', {
        customerId: customer.id,
        email: customer.email
      })

      return customer as RazorpayCustomer
    } catch (error) {
      logger.error('Failed to create Razorpay customer', {
        error: error instanceof Error ? error.message : String(error),
        customerData
      })
      throw error
    }
  }

  /**
   * Create a Razorpay subscription
   */
  static async createSubscription(subscriptionData: CreateSubscriptionData): Promise<RazorpaySubscriptionResult> {
    const razorpay = this.initializeRazorpay()
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
    const razorpay = this.initializeRazorpay()
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
    const razorpay = this.initializeRazorpay()
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
    const razorpay = this.initializeRazorpay()
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
      const orderData: CreateOrderData = {
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

      const order = await this.createOrder(orderData)

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
          name: 'Gym SaaS Pro',
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
   * Verify payment signature
   */
  static async verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<boolean> {
    try {
      const crypto = await import('crypto')
      const razorpaySecret = serverConfig.razorpayKeySecret
      
      if (!razorpaySecret) {
        throw new Error('Razorpay secret not configured')
      }

      const body = orderId + '|' + paymentId
      const expectedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(body)
        .digest('hex')

      return expectedSignature === signature
    } catch (error) {
      logger.error('Payment signature verification failed', {
        error: error instanceof Error ? error.message : String(error),
        orderId,
        paymentId
      })
      return false
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

  /**
   * Fetch a payment by ID
   */
  static async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Fetching Razorpay payment', { paymentId })
      
      const payment = await razorpay.payments.fetch(paymentId)

      logger.info('Razorpay payment fetched successfully', {
        paymentId,
        status: payment.status
      })

      return payment
    } catch (error) {
      logger.error('Failed to fetch Razorpay payment', {
        error: error instanceof Error ? error.message : String(error),
        paymentId
      })
      throw error
    }
  }

  /**
   * Pause a Razorpay subscription
   */
  static async pauseSubscription(subscriptionId: string, pauseAt: 'now' | number = 'now'): Promise<RazorpaySubscriptionResult> {
    const razorpay = this.initializeRazorpay()
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
    const razorpay = this.initializeRazorpay()
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
   * Fetch all customers
   */
  static async fetchAllCustomers(options: {
    from?: number
    to?: number
    count?: number
    skip?: number
  } = {}): Promise<RazorpayCustomerCollection> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Fetching all Razorpay customers', { options })
      
      const response = await razorpay.customers.all(options)

      logger.info('Razorpay customers fetched successfully', {
        count: response.count
      })

      return {
        entity: response.entity,
        count: response.count,
        items: response.items.map(customer => customer as RazorpayCustomer)
      }
    } catch (error) {
      logger.error('Failed to fetch all Razorpay customers', {
        error: error instanceof Error ? error.message : String(error),
        options
      })
      throw error
    }
  }

  /**
   * Fetch a customer by ID
   */
  static async fetchCustomer(customerId: string): Promise<RazorpayCustomerResult> {
    const razorpay = this.initializeRazorpay()
    if (!razorpay) {
      throw new Error('Razorpay not configured')
    }

    try {
      logger.info('Fetching Razorpay customer', { customerId })
      
      const customer = await razorpay.customers.fetch(customerId)

      logger.info('Razorpay customer fetched successfully', {
        customerId,
        email: customer.email
      })

      return customer as RazorpayCustomer
    } catch (error) {
      logger.error('Failed to fetch Razorpay customer', {
        error: error instanceof Error ? error.message : String(error),
        customerId
      })
      throw error
    }
  }
}
