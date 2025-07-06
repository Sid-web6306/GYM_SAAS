export const AUTH_MESSAGES = {
  'user-exists': 'Account already exists. Please log in.',
  'email-not-confirmed': 'Please check your email and click the confirmation link.',
  'invalid-credentials': 'Invalid email or password.',
  'confirmation-sent': 'Confirmation email sent! Please check your inbox.',
  'signup-success': 'Account created successfully! Please check your email.',
  'login-success': 'Welcome back!',
  'logout-success': 'Logged out successfully.',
  'profile-updated': 'Profile updated successfully.',
  'password-reset-sent': 'Password reset email sent. Please check your inbox.',
  'password-updated': 'Password updated successfully.',
  'social-auth-error': 'Social authentication failed. Please try again.',
  'session-expired': 'Your session has expired. Please log in again.',
  'profile-incomplete': 'Please complete your profile to continue.',
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;

export const getAuthMessage = (key: AuthMessageKey): string => {
  return AUTH_MESSAGES[key];
};

export const getAuthMessageFromUrl = (message: string): string => {
  const key = message as AuthMessageKey;
  return AUTH_MESSAGES[key] || message;
};