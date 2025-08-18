// Enhanced auth messages with social authentication support
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