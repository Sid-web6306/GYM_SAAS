/**
 * Enhanced Auth Messages
 * 
 * This file handles:
 * 1. URL query parameter → User-friendly message mapping
 * 2. Supabase error → User-friendly message transformation
 */

// ========== URL PARAMETER MESSAGES ==========
// These are shown when redirecting with ?message=key
export const AUTH_MESSAGES = {
  // Email OTP verification
  'check-email': {
    title: 'Check Your Email',
    message: 'We\'ve sent you a 6-digit verification code. Please enter the code to verify your account.',
    type: 'info' as const,
  },
  'email-verified': {
    title: 'Email Verified!',
    message: 'Your email has been successfully verified. You can now access your dashboard.',
    type: 'success' as const,
  },
  'email-verification-failed': {
    title: 'Verification Failed',
    message: 'Invalid or expired verification code. Please check the code and try again, or request a new one.',
    type: 'error' as const,
  },

  // Authentication errors
  'invalid-credentials': {
    title: 'Invalid Credentials',
    message: 'The email you entered is incorrect or the account does not exist. Please check your email and try again.',
    type: 'error' as const,
  },
  'email-not-confirmed': {
    title: 'Email Not Verified',
    message: 'Please verify your email with the 6-digit code we sent you before signing in.',
    type: 'warning' as const,
  },
  'account-exists': {
    title: 'Account Already Exists',
    message: 'An account with this email already exists. Please sign in instead.',
    type: 'warning' as const,
  },
  'signup-disabled': {
    title: 'Registration Unavailable',
    message: 'New account registration is currently disabled. Please contact support for assistance.',
    type: 'warning' as const,
  },

  // Enhanced Social authentication messages
  'social-auth-error': {
    title: 'Social Login Failed',
    message: 'Unable to complete social authentication. Please try again or use email login instead.',
    type: 'error' as const,
  },
  'social-auth-cancelled': {
    title: 'Login Cancelled',
    message: 'Social login was cancelled. You can try again or use email login instead.',
    type: 'warning' as const,
  },
  'social-auth-invalid': {
    title: 'Invalid Request',
    message: 'The social login request was invalid. Please try again.',
    type: 'error' as const,
  },
  'social-auth-server-error': {
    title: 'Server Error',
    message: 'The social login provider experienced an error. Please try again in a few moments.',
    type: 'error' as const,
  },
  'social-auth-missing-code': {
    title: 'Authentication Failed',
    message: 'No authorization code was received from the social login provider. Please try again.',
    type: 'error' as const,
  },
  'social-auth-expired': {
    title: 'Login Expired',
    message: 'The social login session has expired. Please try logging in again.',
    type: 'warning' as const,
  },
  'social-auth-no-session': {
    title: 'Session Error',
    message: 'Unable to establish a session after social login. Please try again.',
    type: 'error' as const,
  },
  'social-auth-timeout': {
    title: 'Login Timeout',
    message: 'Social login took too long. Please try again.',
    type: 'warning' as const,
  },
  'social-onboarding-complete': {
    title: 'Welcome!',
    message: 'Your account has been successfully created. Welcome to your gym management dashboard!',
    type: 'success' as const,
  },

  // Profile and onboarding
  'profile-creation-failed': {
    title: 'Profile Setup Failed',
    message: 'Unable to complete your profile setup. Please try completing the onboarding process again.',
    type: 'error' as const,
  },
  'profile-fetch-error': {
    title: 'Profile Error',
    message: 'Unable to load your profile information. Please refresh the page or contact support.',
    type: 'error' as const,
  },
  'onboarding-incomplete': {
    title: 'Setup Required',
    message: 'Please complete your gym setup to access the full dashboard.',
    type: 'info' as const,
  },
  'onboarding-complete': {
    title: 'Setup Complete!',
    message: 'Your gym has been successfully set up. Welcome to your dashboard!',
    type: 'success' as const,
  },

  // Session and access
  'session-expired': {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
    type: 'warning' as const,
  },
  'access-denied': {
    title: 'Access Denied',
    message: 'You don\'t have permission to access this page. Please contact your administrator.',
    type: 'error' as const,
  },
  'logout-success': {
    title: 'Logged Out',
    message: 'You have been successfully logged out. Come back anytime!',
    type: 'success' as const,
  },

  // General errors
  'server-error': {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again in a few moments.',
    type: 'error' as const,
  },
  'network-error': {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    type: 'error' as const,
  },
  'maintenance': {
    title: 'Maintenance Mode',
    message: 'The application is currently under maintenance. Please try again later.',
    type: 'info' as const,
  },

  // Success messages
  'welcome-back': {
    title: 'Welcome Back!',
    message: 'Successfully logged in. Redirecting to your dashboard...',
    type: 'success' as const,
  },
  'account-created': {
    title: 'Account Created!',
    message: 'Your account has been successfully created. Please check your email to verify your address.',
    type: 'success' as const,
  },

  // Default fallback
  'unknown-error': {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    type: 'error' as const,
  },
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
export type AuthMessageType = 'success' | 'error' | 'warning' | 'info';

// Helper function to get auth message with fallback
export function getAuthMessage(key: string | null): typeof AUTH_MESSAGES[AuthMessageKey] {
  if (!key || !(key in AUTH_MESSAGES)) {
    return AUTH_MESSAGES['unknown-error'];
  }
  return AUTH_MESSAGES[key as AuthMessageKey];
}

// Helper function to display auth message in components
export function displayAuthMessage(searchParams: URLSearchParams, showToast?: (title: string, message: string, type: AuthMessageType) => void) {
  const messageKey = searchParams.get('message');
  const details = searchParams.get('details');
  
  if (messageKey) {
    const authMessage = getAuthMessage(messageKey);
    let finalMessage = authMessage.message;
    
    // Append details if available and in development
    if (details && process.env.NODE_ENV === 'development') {
      finalMessage += ` (Details: ${decodeURIComponent(details)})`;
    }
    
    if (showToast) {
      showToast(authMessage.title, finalMessage, authMessage.type);
    }
    
    return {
      title: authMessage.title,
      message: finalMessage,
      type: authMessage.type,
    };
  }
  
  return null;
}

// ========== SUPABASE ERROR MESSAGE TRANSFORMATION ==========
// These transform confusing Supabase errors into user-friendly messages

interface ErrorMapping {
  pattern: RegExp
  userMessage: string
  redirectTo?: 'login' | 'signup'
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // ===== LOGIN ERRORS =====
  {
    pattern: /signups?.*(not|are)?\s*(allowed|disabled)/i,
    userMessage: 'No account found with this phone number. Please sign up to create an account.',
    redirectTo: 'signup'
  },
  {
    pattern: /user not found|not found|doesn't exist|does not exist/i,
    userMessage: 'No account found. Please check your phone number or sign up to create an account.',
    redirectTo: 'signup'
  },
  
  // ===== SIGNUP ERRORS =====
  {
    pattern: /already.*registered|user.*already.*exists|email.*taken|phone.*taken/i,
    userMessage: 'An account with this phone number already exists. Please log in instead.',
    redirectTo: 'login'
  },
  {
    pattern: /signup.*disabled|new.*registration.*disabled/i,
    userMessage: 'New signups are currently disabled. Please contact support.',
  },
  
  // ===== OTP/VERIFICATION ERRORS =====
  {
    pattern: /otp.*disabled|sms.*disabled/i,
    userMessage: 'Phone authentication is currently unavailable. Please try email or contact support.',
  },
  {
    pattern: /invalid.*otp|otp.*invalid|incorrect.*code|wrong.*code/i,
    userMessage: 'Invalid verification code. Please check the code and try again.',
  },
  {
    pattern: /otp.*expired|code.*expired|token.*expired/i,
    userMessage: 'Verification code has expired. Please request a new one.',
  },
  {
    pattern: /failed.*to.*send.*sms|sms.*failed|sms.*error/i,
    userMessage: 'Failed to send SMS. Please check your phone number and try again.',
  },
  
  // ===== RATE LIMITING =====
  {
    pattern: /rate.*limit|too.*many.*requests|429|too.*many.*attempts/i,
    userMessage: 'Too many attempts. Please wait a few minutes before trying again.',
  },
  
  // ===== NETWORK ERRORS =====
  {
    pattern: /network|fetch.*failed|connection.*failed/i,
    userMessage: 'Network error. Please check your connection and try again.',
  },
  
  // ===== ACCOUNT STATUS =====
  {
    pattern: /account.*disabled|user.*disabled|account.*suspended/i,
    userMessage: 'This account has been disabled. Please contact support.',
  },
  {
    pattern: /email.*not.*confirmed|phone.*not.*confirmed/i,
    userMessage: 'Please verify your account first.',
  },
  
  // ===== VALIDATION ERRORS =====
  {
    pattern: /invalid.*phone|phone.*invalid|invalid.*format/i,
    userMessage: 'Invalid phone number format. Please include country code (e.g., +1234567890).',
  },
  {
    pattern: /invalid.*email|email.*invalid/i,
    userMessage: 'Invalid email address. Please check and try again.',
  },
]

/**
 * Transform Supabase error into user-friendly message
 */
export function transformAuthError(error: string | Error): {
  message: string
  redirectTo?: 'login' | 'signup'
} {
  const errorMsg = typeof error === 'string' ? error : error.message
  
  // Find matching error pattern
  for (const mapping of ERROR_MAPPINGS) {
    if (mapping.pattern.test(errorMsg)) {
      return {
        message: mapping.userMessage,
        redirectTo: mapping.redirectTo
      }
    }
  }
  
  // Default fallback message
  return {
    message: 'An error occurred. Please try again or contact support.',
  }
}

/**
 * Get user-friendly error message for login
 */
export function getLoginErrorMessage(error: string | Error): string {
  const { message } = transformAuthError(error)
  return message
}

/**
 * Get user-friendly error message for signup  
 */
export function getSignupErrorMessage(error: string | Error): string {
  const { message } = transformAuthError(error)
  return message
}

/**
 * Get user-friendly error message for OTP verification
 */
export function getOTPErrorMessage(error: string | Error): string {
  const { message } = transformAuthError(error)
  return message
}

/**
 * Check if error indicates user should sign up instead of log in
 */
export function shouldRedirectToSignup(error: string | Error): boolean {
  const errorMsg = typeof error === 'string' ? error : error.message
  return /user not found|not found|signups?.*(not|are)?\s*(allowed|disabled)/i.test(errorMsg)
}

/**
 * Check if error indicates user should log in instead of sign up
 */
export function shouldRedirectToLogin(error: string | Error): boolean {
  const errorMsg = typeof error === 'string' ? error : error.message
  return /already.*registered|user.*already.*exists|email.*taken|phone.*taken/i.test(errorMsg)
}