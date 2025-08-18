import type { User } from '@supabase/supabase-js'
import type { ProfileWithRBAC } from '@/types/rbac.types'

/**
 * Type guards for runtime type checking and improved type safety
 */

// User type guards
export const isValidUser = (user: unknown): user is User => {
  return typeof user === 'object' && 
         user !== null && 
         'id' in user && 
         typeof (user as User).id === 'string' &&
         'email' in user &&
         (typeof (user as User).email === 'string' || (user as User).email === null)
}

export const isAuthenticatedUser = (user: unknown): user is User => {
  return isValidUser(user) && user.email !== null
}

// Profile type guards
export const isValidProfile = (profile: unknown): profile is ProfileWithRBAC => {
  return typeof profile === 'object' &&
         profile !== null &&
         'id' in profile &&
         typeof (profile as ProfileWithRBAC).id === 'string'
}

export const isCompleteProfile = (profile: unknown): profile is ProfileWithRBAC & { gym_id: string } => {
  return isValidProfile(profile) &&
         'gym_id' in profile &&
         typeof (profile as ProfileWithRBAC).gym_id === 'string' &&
         (profile as ProfileWithRBAC).gym_id !== null
}

// Session type guards
export const isValidSession = (session: unknown): session is { user: User } => {
  return typeof session === 'object' &&
         session !== null &&
         'user' in session &&
         isValidUser((session as { user: User }).user)
}

// Error type guards
export const isSupabaseError = (error: unknown): error is { message: string; code?: string } => {
  return typeof error === 'object' &&
         error !== null &&
         'message' in error &&
         typeof (error as { message: string }).message === 'string'
}

export const isAuthenticationError = (error: unknown): boolean => {
  if (!isSupabaseError(error)) return false
  
  const authErrorPatterns = [
    'session_expired',
    'jwt expired',
    'refresh_token_not_found',
    'invalid_jwt',
    'JWT expired',
    'No API key found',
    'Invalid API key',
    'User not found',
    'permission denied',
    'Invalid user',
    'User session not found',
    'unauthorized',
    'invalid_grant'
  ]
  
  return authErrorPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  ) || error.code === '401' || error.code === '403'
}

// Form data type guards
export const isValidEmail = (email: unknown): email is string => {
  if (typeof email !== 'string') return false
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

// Password validation removed - using passwordless authentication

export const isValidGymName = (gymName: unknown): gymName is string => {
  return typeof gymName === 'string' && 
         gymName.trim().length >= 2 && 
         gymName.trim().length <= 100
}

// Member type guards
export const isValidMemberStatus = (status: unknown): status is 'active' | 'inactive' | 'pending' | 'suspended' => {
  const validStatuses = ['active', 'inactive', 'pending', 'suspended']
  return typeof status === 'string' && validStatuses.includes(status)
}

export const isValidMemberName = (name: unknown): name is string => {
  return typeof name === 'string' && 
         name.trim().length >= 1 && 
         name.trim().length <= 50 &&
         /^[a-zA-Z\s'-]+$/.test(name)
}

// Database record type guards
export const isValidDatabaseRecord = (record: unknown): record is { id: string; created_at: string } => {
  return typeof record === 'object' &&
         record !== null &&
         'id' in record &&
         'created_at' in record &&
         typeof (record as { id: string }).id === 'string' &&
         typeof (record as { created_at: string }).created_at === 'string'
}

// Subscription type guards
export const isValidSubscriptionStatus = (status: unknown): status is 'active' | 'canceled' | 'past_due' | 'incomplete' | 'scheduled' => {
  const validStatuses = ['active', 'canceled', 'past_due', 'incomplete', 'scheduled']
  return typeof status === 'string' && validStatuses.includes(status)
}

export const isValidBillingCycle = (cycle: unknown): cycle is 'monthly' | 'annual' => {
  return cycle === 'monthly' || cycle === 'annual'
}

// Environment type guards
export const isValidEnvironment = (env: unknown): env is 'development' | 'production' | 'test' => {
  return env === 'development' || env === 'production' || env === 'test'
}

// API response type guards
export const isSuccessResponse = <T>(response: unknown): response is { data: T; error: null } => {
  return typeof response === 'object' &&
         response !== null &&
         'data' in response &&
         'error' in response &&
         (response as { error: unknown }).error === null
}

export const isErrorResponse = (response: unknown): response is { data: null; error: { message: string } } => {
  return typeof response === 'object' &&
         response !== null &&
         'data' in response &&
         'error' in response &&
         (response as { data: unknown }).data === null &&
         typeof (response as { error: unknown }).error === 'object' &&
         (response as { error: { message: unknown } }).error !== null &&
         'message' in (response as { error: { message: unknown } }).error
}

// Utility type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value)
}

export const isBoolean = (value: unknown): value is boolean => {
  return typeof value === 'boolean'
}

export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const isArray = <T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] => {
  if (!Array.isArray(value)) return false
  
  if (itemGuard) {
    return value.every(itemGuard)
  }
  
  return true
}

export const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.trim().length > 0
}

export const isValidUUID = (value: unknown): value is string => {
  if (!isString(value)) return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

// Form validation type guards
export const isValidFormData = (formData: unknown): formData is FormData => {
  return formData instanceof FormData
}

// Date type guards
export const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !isNaN(date.getTime())
}

export const isValidDateString = (dateString: unknown): dateString is string => {
  if (!isString(dateString)) return false
  
  const date = new Date(dateString)
  return isValidDate(date)
}

// URL type guards
export const isValidURL = (url: unknown): url is string => {
  if (!isString(url)) return false
  
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// JSON type guards
export const isValidJSON = (json: unknown): json is string => {
  if (!isString(json)) return false
  
  try {
    JSON.parse(json)
    return true
  } catch {
    return false
  }
}

/**
 * Higher-order type guard creator for optional values
 */
export const createOptionalGuard = <T>(guard: (value: unknown) => value is T) => {
  return (value: unknown): value is T | null | undefined => {
    return value === null || value === undefined || guard(value)
  }
}

/**
 * Higher-order type guard creator for arrays
 */
export const createArrayGuard = <T>(itemGuard: (value: unknown) => value is T) => {
  return (value: unknown): value is T[] => {
    return isArray(value, itemGuard)
  }
} 