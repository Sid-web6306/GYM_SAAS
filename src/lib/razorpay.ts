import { PaymentService } from '@/services/payment.service'

/**
 * @deprecated Use PaymentService instead
 * Get the singleton Razorpay instance
 * @returns Razorpay instance or null if not configured
 */
export function getRazorpay() {
  return PaymentService.isConfigured() ? PaymentService.getRazorpayInstance() : null
}

/**
 * @deprecated Use PaymentService instead
 * Reset the singleton instance (useful for testing)
 */
export function resetRazorpayInstance(): void {
  // This is now handled by the service
}

/**
 * @deprecated Use PaymentService.isConfigured() instead
 * Check if Razorpay is properly configured
 */
export function isRazorpayConfigured(): boolean {
  return PaymentService.isConfigured()
}