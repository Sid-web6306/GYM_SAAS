import { logger } from './logger'

/**
 * Input sanitization utilities for security and data integrity
 */
export const sanitizeInput = {
  /**
   * Sanitize general text input by removing dangerous characters
   */
  text: (input: string | null | undefined): string => {
    if (!input) return ''
    
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // Trim whitespace
    sanitized = sanitized.trim()
    
    // Remove potentially dangerous HTML/XML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '')
    
    // Limit length to prevent DoS
    const maxLength = 1000
    if (sanitized.length > maxLength) {
      logger.warn('Input truncated due to length', { 
        originalLength: sanitized.length, 
        maxLength 
      })
      sanitized = sanitized.substring(0, maxLength)
    }
    
    return sanitized
  },

  /**
   * Sanitize email addresses
   */
  email: (input: string | null | undefined): string => {
    if (!input) return ''
    
    // Convert to lowercase and trim
    let email = input.toLowerCase().trim()
    
    // Remove any characters that aren't valid in email addresses
    email = email.replace(/[^a-z0-9@._+-]/g, '')
    
    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) {
      logger.warn('Invalid email format detected', { email: email.substring(0, 10) + '...' })
    }
    
    return email
  },

  /**
   * Sanitize phone numbers
   */
  phone: (input: string | null | undefined): string => {
    if (!input) return ''
    
    // Remove everything except numbers, spaces, parentheses, hyphens, and plus signs
    const phone = input.replace(/[^0-9+()-\s]/g, '').trim()
    
    // Limit length
    return phone.substring(0, 20)
  },

  /**
   * Sanitize gym/business names
   */
  gymName: (input: string | null | undefined): string => {
    if (!input) return ''
    
    let gymName = sanitizeInput.text(input)
    
    // Additional business name specific rules
    gymName = gymName.replace(/[<>'"&]/g, '') // Remove potentially dangerous chars
    gymName = gymName.substring(0, 100) // Limit length
    
    // Ensure minimum length
    if (gymName.length < 2) {
      throw new Error('Gym name must be at least 2 characters long')
    }
    
    return gymName
  },

  /**
   * Sanitize member names
   */
  memberName: (input: string | null | undefined): string => {
    if (!input) return ''
    
    let name = input.trim()
    
    // Allow only letters, spaces, hyphens, and apostrophes
    name = name.replace(/[^a-zA-Z\s'-]/g, '')
    
    // Remove multiple spaces
    name = name.replace(/\s+/g, ' ')
    
    // Limit length
    name = name.substring(0, 50)
    
    return name
  },

  /**
   * Sanitize search queries
   */
  searchQuery: (input: string | null | undefined): string => {
    if (!input) return ''
    
    let query = input.trim()
    
    // Remove potentially dangerous characters
    query = query.replace(/[<>'"&%]/g, '')
    
    // Limit length
    query = query.substring(0, 100)
    
    return query
  },

  /**
   * Sanitize URLs
   */
  url: (input: string | null | undefined): string => {
    if (!input) return ''
    
    const url = input.trim()
    
    // Only allow HTTP/HTTPS URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      logger.warn('Invalid URL protocol detected', { url: url.substring(0, 20) + '...' })
      return ''
    }
    
    try {
      const urlObj = new URL(url)
      return urlObj.toString()
    } catch (error) {
      logger.warn('Invalid URL format', { 
        url: url.substring(0, 20) + '...',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return ''
    }
  }
}

/**
 * Validation utilities
 */
export const validateInput = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  },

  /**
   * Validate password strength
   */
  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123']
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },

  /**
   * Validate phone number format
   */
  phone: (phone: string): boolean => {
    // Basic phone validation - adjust regex based on your requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/[\s()-]/g, ''))
  },

  /**
   * Validate member status
   */
  memberStatus: (status: string): boolean => {
    const validStatuses = ['active', 'inactive', 'pending', 'suspended']
    return validStatuses.includes(status.toLowerCase())
  }
}

/**
 * Rate limiting utilities (simple in-memory implementation)
 * In production, use Redis or similar for distributed rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimit = {
  /**
   * Check if action is rate limited
   */
  check: (key: string, maxAttempts: number, windowMs: number): boolean => {
    const now = Date.now()
    const record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      // First attempt or window expired
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (record.count >= maxAttempts) {
      logger.warn('Rate limit exceeded', { key, attempts: record.count, maxAttempts })
      return false
    }
    
    // Increment count
    record.count++
    return true
  },

  /**
   * Reset rate limit for a key
   */
  reset: (key: string): void => {
    rateLimitStore.delete(key)
  },

  /**
   * Clean up expired entries
   */
  cleanup: (): void => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }
}

// Clean up rate limit store every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    rateLimit.cleanup()
  }, 5 * 60 * 1000)
} 