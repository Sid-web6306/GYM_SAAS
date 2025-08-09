import Razorpay from 'razorpay'
import { serverConfig } from './config'
import { logger } from './logger'

// Singleton instance
let razorpayInstance: Razorpay | null = null

/**
 * Get the singleton Razorpay instance
 * @returns Razorpay instance or null if not configured
 */
export function getRazorpay(): Razorpay | null {
  // Return existing instance if available
  if (razorpayInstance) {
    return razorpayInstance
  }

  // Check if configuration is available
  if (!serverConfig.razorpayKeyId || !serverConfig.razorpayKeySecret) {
    logger.warn('Razorpay configuration not found. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.')
    return null
  }

  try {
    // Create new instance
    razorpayInstance = new Razorpay({
      key_id: serverConfig.razorpayKeyId,
      key_secret: serverConfig.razorpayKeySecret,
    })

    logger.info('Razorpay instance initialized successfully')
    return razorpayInstance
  } catch (error) {
    logger.error('Failed to initialize Razorpay instance:', { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRazorpayInstance(): void {
  razorpayInstance = null
}

/**
 * Check if Razorpay is properly configured
 */
export function isRazorpayConfigured(): boolean {
  return !!(serverConfig.razorpayKeyId && serverConfig.razorpayKeySecret)
}