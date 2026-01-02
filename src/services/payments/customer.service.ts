/**
 * CustomerService - Handles Razorpay customer operations and refunds
 * Manages customer creation, fetching, and refund processing
 */

import { logger } from '@/lib/logger'
import { RazorpayClient, type RazorpayCustomer, type RazorpayRefund, type RazorpayCustomerCollection } from './razorpay-client'

// Type definitions for customer operations
export interface CreateCustomerData {
  name: string
  email: string
  contact?: string
  notes?: Record<string, string | number | null>
}

export interface CreateRefundData {
  amount: number
  speed?: 'normal' | 'optimum'
  notes?: Record<string, string | number | null>
  receipt?: string
}

export type RazorpayCustomerResult = RazorpayCustomer
export type RazorpayRefundResult = RazorpayRefund

/**
 * CustomerService - Customer and refund operations
 */
export class CustomerService {
  /**
   * Create a Razorpay customer
   */
  static async createCustomer(customerData: CreateCustomerData): Promise<RazorpayCustomerResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
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
   * Create a refund for a payment
   */
  static async createRefund(paymentId: string, refundData: CreateRefundData): Promise<RazorpayRefundResult> {
    const razorpay = RazorpayClient.getRazorpayInstance()
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
   * Fetch all customers
   */
  static async fetchAllCustomers(options: {
    from?: number
    to?: number
    count?: number
    skip?: number
  } = {}): Promise<RazorpayCustomerCollection> {
    const razorpay = RazorpayClient.getRazorpayInstance()
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
    const razorpay = RazorpayClient.getRazorpayInstance()
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
