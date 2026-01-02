/**
 * RazorpayClient - Core Razorpay integration and configuration
 * Handles initialization, configuration, and basic Razorpay instance management
 */

import Razorpay from 'razorpay'
import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'

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

/**
 * RazorpayClient - Core Razorpay integration
 */
export class RazorpayClient {
  private static razorpay: Razorpay | null = null

  /**
   * Initialize Razorpay instance
   */
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
   * Reset the Razorpay instance (useful for testing)
   */
  static resetInstance(): void {
    this.razorpay = null
  }
}
