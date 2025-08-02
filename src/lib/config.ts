// Environment configuration and validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

const serverEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
} as const

// Validate required client-side environment variables
function validateClientEnv() {
  const missing = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value && key !== 'NEXT_PUBLIC_APP_URL')
    .map(([key]) => key)

  if (missing.length > 0) {
    console.warn(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and make sure all required variables are set.\n' +
      'See packages/web/ENVIRONMENT_SETUP.md for detailed setup instructions.'
    )
  }
}

// Validate server-side environment variables
function validateServerEnv() {
  const missing = Object.entries(serverEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.warn(
      `Missing server environment variables: ${missing.join(', ')}\n` +
      'Some features may not work correctly. Check your .env.local file.'
    )
  }
}

// Client-side config (safe to use in browser)
export const clientConfig = {
  supabaseUrl: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  appUrl: requiredEnvVars.NEXT_PUBLIC_APP_URL,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  // Stripe publishable key (safe for client-side)
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '',
} as const

// Server-side config (never sent to browser)
export const serverConfig = {
  stripeSecretKey: serverEnvVars.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: serverEnvVars.STRIPE_WEBHOOK_SECRET || '',
  // Optional Stripe Price IDs
  stripePriceIds: {
    starterMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    starterAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    professionalMonthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    professionalAnnual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
    enterpriseMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    enterpriseAnnual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
  },
} as const

// Initialize and validate environment
if (typeof window !== 'undefined') {
  // Client-side validation
  validateClientEnv()
} else {
  // Server-side validation
  validateServerEnv()
}

// Helper function to check if environment is properly configured
export function isEnvConfigured() {
  return !!(
    requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL &&
    requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Helper to get environment name
export function getEnvironmentName() {
  if (process.env.NODE_ENV === 'development') return 'development'
  if (process.env.NODE_ENV === 'production') return 'production'
  return process.env.NEXT_PUBLIC_APP_ENV || 'development'
} 