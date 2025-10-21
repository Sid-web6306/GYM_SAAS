/**
 * User-friendly error messages for member import errors
 * Maps technical error patterns to readable messages
 */

interface ErrorMapping {
  patterns: string[]
  message: string
}

export const IMPORT_ERROR_MESSAGES: ErrorMapping[] = [
  // Database constraint errors
  {
    patterns: ['duplicate', 'unique', 'already exists'],
    message: 'Member with this information already exists'
  },
  {
    patterns: ['violates foreign key', 'foreign_key'],
    message: 'Invalid reference to gym or related data'
  },
  {
    patterns: ['null value', 'not-null', 'required'],
    message: 'Required information is missing'
  },
  
  // Validation errors
  {
    patterns: ['email', 'invalid'],
    message: 'Invalid email format'
  },
  {
    patterns: ['phone', 'invalid'],
    message: 'Invalid phone number format'
  },
  
  // Permission errors
  {
    patterns: ['permission', 'policy', 'rls', 'not authorized', 'forbidden'],
    message: 'You do not have permission to add this member'
  },
  
  // Network/Connection errors
  {
    patterns: ['network', 'fetch failed', 'connection'],
    message: 'Network error - please check your connection'
  },
  
  // Timeout errors
  {
    patterns: ['timeout', 'timed out'],
    message: 'Request timed out - please try again'
  },
  
  // Generic database errors
  {
    patterns: ['pgrst', 'postgres', 'database error'],
    message: 'Database error - please contact support'
  },
  
  // Rate limiting
  {
    patterns: ['rate limit', 'too many requests'],
    message: 'Too many requests - please wait a moment'
  },
]

export const DEFAULT_IMPORT_ERROR_MESSAGE = 'Unable to import this member - please verify the data'

/**
 * Converts a technical error to a user-friendly message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const errorStr = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  
  // Log the actual error for debugging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Import error received:', errorStr)
  }
  
  // Find matching error pattern
  // Check if ANY pattern matches (more lenient than requiring all patterns)
  for (const mapping of IMPORT_ERROR_MESSAGES) {
    const hasMatch = mapping.patterns.some(pattern => errorStr.includes(pattern.toLowerCase()))
    if (hasMatch) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Matched pattern, returning message:', mapping.message)
      }
      return mapping.message
    }
  }
  
  // Log when no pattern matches
  if (process.env.NODE_ENV === 'development') {
    console.log('No pattern matched, returning default message')
  }
  
  // Return default message if no pattern matches
  return DEFAULT_IMPORT_ERROR_MESSAGE
}

