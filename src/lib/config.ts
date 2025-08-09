// Environment configuration and validation
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const

const serverEnvVars = {
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
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
  // Razorpay key ID (safe for client-side)
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
} as const

// Server-side config (never sent to browser)
export const serverConfig = {
  razorpayKeyId: serverEnvVars.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: serverEnvVars.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: serverEnvVars.RAZORPAY_WEBHOOK_SECRET || '',
  // Optional Razorpay Plan IDs (stored in database now)
  razorpayPlanIds: {
    starterMonthly: process.env.RAZORPAY_STARTER_MONTHLY_PLAN_ID,
    starterAnnual: process.env.RAZORPAY_STARTER_ANNUAL_PLAN_ID,
    professionalMonthly: process.env.RAZORPAY_PROFESSIONAL_MONTHLY_PLAN_ID,
    professionalAnnual: process.env.RAZORPAY_PROFESSIONAL_ANNUAL_PLAN_ID,
    enterpriseMonthly: process.env.RAZORPAY_ENTERPRISE_MONTHLY_PLAN_ID,
    enterpriseAnnual: process.env.RAZORPAY_ENTERPRISE_ANNUAL_PLAN_ID,
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