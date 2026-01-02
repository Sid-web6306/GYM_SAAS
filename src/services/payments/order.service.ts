/**
 * OrderService - Handles Razorpay order operations and payment verification
 * Manages order creation, payment fetching, and signature verification
 */

import { logger } from '@/lib/logger'
import { serverConfig } from '@/lib/config'
import { RazorpayClient, type RazorpayOrder, type RazorpayPayment } from './razorpay-client'

// Type definitions for order operations
export interface CreateOrderData {
  amount: number
  currency: string
  receipt: string
  notes?: Record<string, string | number | null>
}

/**
 * OrderService - Order and payment operations
 */
export class OrderService {
  /**
   * Create a Razorpay order
   */
  static async createOrder(orderData: CreateOrderData): Promise<RazorpayOrder> {
    const razorpay = RazorpayClient.getRazorpayInstance()
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
   * Fetch a payment by ID
   */
  static async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    const razorpay = RazorpayClient.getRazorpayInstance()
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
}
