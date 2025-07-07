// Enhanced auth messages with social authentication support
export const AUTH_MESSAGES = {
  // Email verification
  'check-email': {
    title: 'Check Your Email',
    message: 'We\'ve sent you a confirmation link. Please check your email and click the link to verify your account.',
    type: 'info' as const,
  },
  'email-verified': {
    title: 'Email Verified!',
    message: 'Your email has been successfully verified. You can now access your dashboard.',
    type: 'success' as const,
  },
  'email-verification-failed': {
    title: 'Verification Failed',
    message: 'Unable to verify your email. The link may have expired or already been used. Please try signing up again.',
    type: 'error' as const,
  },

  // Password reset
  'password-reset-sent': {
    title: 'Reset Link Sent',
    message: 'Check your email for a password reset link. Make sure to check your spam folder too.',
    type: 'info' as const,
  },
  'password-updated': {
    title: 'Password Updated',
    message: 'Your password has been successfully updated. You can now log in with your new password.',
    type: 'success' as const,
  },
  'password-reset-failed': {
    title: 'Reset Failed',
    message: 'Unable to reset your password. The link may have expired. Please request a new reset link.',
    type: 'error' as const,
  },

  // Authentication errors
  'invalid-credentials': {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect. Please check your credentials and try again.',
    type: 'error' as const,
  },
  'email-not-confirmed': {
    title: 'Email Not Verified',
    message: 'Please check your email and click the verification link before signing in.',
    type: 'warning' as const,
  },
  'account-exists': {
    title: 'Account Already Exists',
    message: 'An account with this email already exists. Please sign in instead or use password reset if you forgot your password.',
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