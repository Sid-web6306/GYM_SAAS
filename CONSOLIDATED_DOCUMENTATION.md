# 🚀 Gym SaaS MVP - Complete Documentation

This is a comprehensive documentation file consolidating all the individual guides and documentation for the Gym SaaS MVP project.

## 📚 Table of Contents

1. [Project Overview](#project-overview)
2. [Getting Started](#getting-started)
3. [Environment Setup](#environment-setup)
4. [Architecture & Technology Stack](#architecture--technology-stack)
5. [Authentication System](#authentication-system)
6. [Real-time System](#real-time-system)
7. [Stripe Integration](#stripe-integration)
8. [PWA Implementation](#pwa-implementation)
9. [Performance & Security](#performance--security)
10. [Development Guides](#development-guides)
11. [Migration Guides](#migration-guides)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

### 🎯 Project Goal

A multi-tenant SaaS application for managing gym memberships, schedules, and check-ins. This project is a solo-developer effort to build a functional MVP within 6 weeks.

### ✨ Core Features (MVP Scope)

- **Secure Authentication:** Gym owners can sign up and log in
- **Multi-tenancy:** Each gym owner's data is isolated and secure
- **Member Management:** Ability to add, view, update, and delete members
- **Dashboard:** A simple overview of key metrics (e.g., total members)
- **Check-in System:** A basic feature for members to check into the gym
- **Real-time Updates:** Live synchronization across all browser tabs
- **Subscription Management:** Integrated Stripe payment processing
- **PWA Support:** Works as a native mobile app

### 🛠️ Technology Stack

- **Frontend:** Next.js 15 (App Router) with TypeScript
- **Styling:** Tailwind CSS + Shadcn/ui
- **Backend (BaaS):** Supabase (PostgreSQL, Auth, Storage, Real-time)
- **State Management:** TanStack Query + Zustand
- **Payments:** Stripe with React Stripe.js
- **Deployment:** Vercel

---

## Getting Started

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### File Structure
```
src/
├── app/                     # Next.js App Router
│   ├── (app)/              # Protected routes (dashboard, etc.)
│   ├── (auth)/             # Authentication pages
│   └── auth/callback/      # OAuth callback handler
├── actions/                # Server Actions
├── components/             # Reusable UI components
│   ├── ui/                # Shadcn/ui components
│   ├── charts/            # Chart components using Tremor
│   ├── pwa/               # PWA-specific components
│   └── providers/         # Context providers
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand state management
├── types/                  # TypeScript type definitions
├── lib/                    # Utilities and configurations
└── utils/supabase/         # Supabase client configurations
```

---

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (Optional - will create prices dynamically if not provided)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_starter_monthly
STRIPE_STARTER_ANNUAL_PRICE_ID=price_starter_annual
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_professional_monthly
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=price_professional_annual
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_enterprise_monthly
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID=price_enterprise_annual

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development
```

### Setup Steps

1. **Supabase Setup:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project or use existing one
   - Go to Settings > API
   - Copy the Project URL and anon/public key
   - Add to your `.env.local` file

2. **Stripe Setup:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Navigate to Developers > API Keys
   - Copy your publishable key and secret key
   - For webhooks, go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Copy the webhook secret

---

## Architecture & Technology Stack

### Authentication System

The application uses a modern authentication architecture that separates server state (TanStack Query) from client UI state (Zustand).

#### Key Features:
- **Multi-tenant authentication** with Supabase Auth
- **Server Actions** for auth operations in `src/actions/auth.actions.ts`
- **TanStack Query** for server state management
- **Zustand store** for client-side UI state management
- **Onboarding flow** for new gym owners to complete their profiles
- **Social login** support (Google, Facebook) with OAuth callbacks

#### Usage Example:
```typescript
import { useAuth, useLogout } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store'

function MyComponent() {
  // Server state from TanStack Query
  const { user, profile, isAuthenticated, hasGym, isLoading } = useAuth()
  const logoutMutation = useLogout()
  
  // UI state from Zustand
  const { showWelcomeMessage, rememberEmail } = useAuthStore()
  
  const handleLogout = () => {
    logoutMutation.mutate()
  }
}
```

### State Management

#### TanStack Query (Server State)
- User authentication data
- Gym data and analytics
- Member management
- Subscription information
- Automatic caching and background refetching

#### Zustand (Client UI State)
- UI preferences and settings
- Toast notifications
- Onboarding status
- Theme preferences

### Database & Types

- **Supabase** as Backend-as-a-Service
- **Type-safe** database interactions with generated types
- **Multi-tenant** architecture with profiles linked to gym_id
- **RPC functions** for complex operations
- **Row Level Security (RLS)** for data isolation

---

## Real-time System

### Architecture Overview

The real-time system provides live data synchronization across all browser tabs and user sessions using Supabase Real-time and TanStack Query integration.

### Key Components

1. **RealtimeProvider** - App-level real-time state management
2. **useRealtime Hook** - Generic subscription hook with flexible configuration
3. **Cross-tab Synchronization** - Uses BroadcastChannel API for tab communication
4. **Automatic Query Invalidation** - TanStack Query cache updates

### Usage Examples

#### Basic Real-time Status
```typescript
import { useRealtimeStatus } from '@/components/providers/realtime-provider'

function StatusIndicator() {
  const { isConnected, subscriptionCount } = useRealtimeStatus()
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-xs">
        {isConnected ? `Live (${subscriptionCount})` : 'Offline'}
      </span>
    </div>
  )
}
```

#### Members Real-time Updates
```typescript
import { useMembersRealtime } from '@/hooks/use-realtime'

function MembersPage() {
  const { profile } = useAuth()
  
  const { isConnected } = useMembersRealtime(profile?.gym_id, {
    enabled: true,
    onMemberUpdate: () => console.log('Member data updated!')
  })
  
  // useMembers automatically gets real-time updates
  const { data: members } = useMembers(profile?.gym_id, filters)
  
  return <div>Members {isConnected ? '🟢' : '🔴'}</div>
}
```

### Performance Features

- **Circuit Breaker Pattern**: Prevents excessive invalidations
- **Debounced Invalidation**: Batches rapid updates
- **Priority Processing**: DELETE events get reduced throttling
- **Memory Efficient**: Automatic cleanup and leak prevention

---

## Stripe Integration

### Overview

The application includes comprehensive Stripe integration with both redirect-based and embedded payment flows, real-time webhook processing, and automated subscription management.

### Features

- **Modern Stripe React Components** with PaymentElement
- **Multiple Payment Flows**: Redirect-based and embedded forms
- **Express Checkout**: Apple Pay, Google Pay support
- **Real-time Sync**: Webhook-driven database updates
- **Document Downloads**: Invoice and receipt generation
- **Enhanced Analytics**: Payment and subscription tracking

### Payment Flow Options

#### 1. Redirect-based Checkout
```typescript
const { redirectToCheckout } = useStripeCheckout()

const handleUpgrade = () => {
  redirectToCheckout(planId, billingCycle)
}
```

#### 2. Embedded Payment Forms
```typescript
const PaymentForm = ({ clientSecret }) => {
  return (
    <PaymentElementForm
      clientSecret={clientSecret}
      onSuccess={handleSuccess}
      onError={handleError}
      showExpressCheckout={true}
    />
  )
}
```

### Webhook Configuration

Required webhook events in Stripe Dashboard:
```
✅ checkout.session.completed
✅ customer.subscription.created  
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
✅ invoice.finalized
✅ customer.updated
```

### Local Development with Webhooks

#### Using ngrok (Recommended)
```bash
# Install ngrok
npm install -g ngrok

# Run your app
npm run dev

# In another terminal, expose localhost
ngrok http 3000

# Update Stripe webhook URL to: https://abc123.ngrok.io/api/webhooks/stripe
```

#### Using Stripe CLI
```bash
# Install and login to Stripe CLI
stripe login

# Forward events to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Test Cards

Use these test cards for development:
- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0000 0000 3220`

---

## PWA Implementation

### Overview

The project has been converted to a PWA-first strategy, providing a single codebase that works across all devices with native-like functionality.

### Features Implemented

#### ✅ Core PWA Features
- Service Worker for offline functionality
- Web App Manifest
- Installable app experience
- Responsive design for all devices
- Offline status indicator
- Install prompt with platform detection

#### ✅ Mobile Optimizations
- Touch-friendly UI components
- Responsive tables and forms
- Mobile-first responsive design
- Proper viewport configuration
- iOS Safari compatibility

### Installation Instructions

#### For Users (Mobile)

**iOS (Safari)**
1. Open the app in Safari
2. Tap the share button (square with arrow)
3. Select "Add to Home Screen"
4. Tap "Add" to install

**Android (Chrome)**
1. Open the app in Chrome
2. Look for the "Install App" banner
3. Tap "Install" or use the three-dot menu
4. Select "Install App" or "Add to Home Screen"

### Configuration

#### Next.js Configuration (`next.config.ts`)
```typescript
const withPWA = require('@ducanh2912/next-pwa')({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  }
})
```

---

## Performance & Security

### Performance Improvements

#### 1. Dynamic Imports Strategy
- **Chart Components**: Tremor library dynamically imported (~200KB+ savings)
- **PWA Components**: Non-essential components loaded on demand
- **Centralized Management**: Single `dynamic-imports.ts` file

#### 2. Query Optimization
- **Circuit Breaker Pattern**: Prevents excessive query invalidations
- **Debounced Invalidation**: Batches rapid updates for better performance
- **Strategic Cache Management**: Targeted invalidation reduces unnecessary refetches

#### 3. Memory Management
- **Automatic Cleanup**: Proper subscription and component cleanup
- **Mount State Tracking**: Prevents operations on unmounted components
- **Efficient Cross-tab Communication**: Minimal payload broadcasting

### Security Enhancements

#### 1. Input Sanitization
```typescript
import { sanitizeInput, validateInput } from '@/lib/sanitization'

const email = sanitizeInput.email(userInput)
if (!validateInput.email(email)) {
  throw new Error('Invalid email')
}
```

#### 2. Enhanced Cookie Security
- Strict cookie security settings
- Comprehensive cookie cleanup on logout
- Secure domain handling for production

#### 3. Type Safety
```typescript
import { isValidUser, isCompleteProfile } from '@/lib/type-guards'

if (isValidUser(user) && isCompleteProfile(profile)) {
  // TypeScript now knows the exact types
  console.log(user.id, profile.gym_id)
}
```

---

## Development Guides

### Theme Integration

The application supports multiple themes with seamless switching and persistence.

#### Available Themes
1. **Light** - Clean and minimal light theme (default)
2. **Blue** - Professional blue theme
3. **Green** - Fresh green theme
4. **Purple** - Creative purple theme
5. **Rose** - Elegant rose theme

#### Usage
```typescript
import { ThemeSelector } from '@/components/ui/theme-selector'

function MyComponent() {
  return <ThemeSelector />
}
```

#### Adding New Themes
1. Define theme in theme selector
2. Add CSS variables in `globals.css`
3. Update theme provider configuration

### Logging System

Use the centralized logging system for better debugging:

```typescript
import { logger } from '@/lib/logger'

// Use structured logging
logger.auth.login('User signed in', { userId, email })
logger.error('Database error', { query, error: error.message })
```

### Error Handling

Comprehensive error boundaries are implemented throughout the application:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

function MyApp() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  )
}
```

---

## Migration Guides

### Codebase Refactoring (Packages to Flattened Structure)

The project has been refactored from a complex packages structure to a clean, single-codebase approach.

#### Benefits Achieved
- **Simplified Architecture**: Single, clean codebase with logical organization
- **Reduced Complexity**: One package.json, one tsconfig.json
- **Better Developer Experience**: Simple imports, better IDE support
- **Maintained All Functionality**: All features preserved

#### Migration Steps
1. Update all import statements to use `@/` aliases
2. Move configuration files to project root
3. Consolidate dependencies in single package.json
4. Test all functionality after migration

### Authentication Architecture Migration

Migration from Zustand-only auth to TanStack Query + Zustand separation:

#### Before (Old)
```tsx
const { user, profile, isAuthenticated, logout } = useAuthStore()
```

#### After (New)
```tsx
// Server state from TanStack Query
const { user, profile, isAuthenticated } = useAuth()
const logoutMutation = useLogout()

// UI state from Zustand
const { showWelcomeMessage } = useAuthStore()
```

### Stripe React Migration

Migration to modern Stripe React components:

#### Key Improvements
- **Embedded Payment Forms**: No redirects needed
- **Express Checkout**: Built-in wallet support
- **Better TypeScript Support**: Comprehensive type definitions
- **Enhanced Appearance**: Improved styling with theme support

---

## Troubleshooting

### Common Issues

#### Real-time Updates Not Working
1. Check Supabase Real-time is enabled in project settings
2. Verify webhook endpoint is receiving events
3. Check browser console for connection errors

#### Stripe Integration Issues
1. **"Stripe not configured"**: Check environment variables
2. **Webhook verification failed**: Verify webhook secret
3. **Payment fails**: Ensure using test cards in test mode

#### Build/TypeScript Errors
1. Run `npm run type-check` to validate TypeScript
2. Check that all environment variables are set
3. Verify all imports use correct paths

#### PWA Installation Issues
1. **Install prompt not showing**: Check PWA audit in DevTools
2. **Service worker not registering**: Ensure HTTPS in production
3. **Offline functionality not working**: Check service worker registration

### Debug Commands

```bash
# Check if service worker is working
console.log('serviceWorker' in navigator)

# Test webhook endpoint
curl -X POST localhost:3000/api/webhooks/stripe

# Check environment variables
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)

# Validate Stripe configuration
npm run stripe:validate
```

### Health Checks

#### Database Connection
```sql
-- Check if profile exists for user
SELECT * FROM profiles WHERE id = 'user-id-here';
```

#### Real-time Subscriptions
```typescript
// Check subscription count
console.log(`Active subscriptions: ${subscriptionCount}`)
```

#### Payment Flow
1. Navigate to `/upgrade` page
2. Complete test payment using `4242 4242 4242 4242`
3. Verify webhook logs show successful processing
4. Check database for updated subscription status

---

## 🎉 Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured for production
- [ ] Stripe webhook endpoints updated to production URLs
- [ ] Supabase RLS policies properly configured
- [ ] PWA manifest and service worker configured
- [ ] Database migrations applied
- [ ] Error tracking and monitoring set up

### Deployment Steps

1. **Build and Test**
   ```bash
   npm run build
   npm run start
   ```

2. **Environment Setup**
   - Update all environment variables for production
   - Configure production Stripe webhook endpoints
   - Set up production domain for cookies

3. **Database Setup**
   - Run all database migrations
   - Set up production Supabase project
   - Configure RLS policies

4. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Configure performance monitoring
   - Set up webhook monitoring

### Post-deployment Verification

- [ ] Authentication flow works correctly
- [ ] Payment processing is functional
- [ ] Real-time updates are working
- [ ] PWA installation works on mobile devices
- [ ] All webhooks are processing successfully
- [ ] Error rates are within acceptable limits

---

This consolidated documentation provides a comprehensive guide to the Gym SaaS MVP project. For specific technical details or troubleshooting not covered here, refer to the individual documentation files or reach out for support.

**🚀 Your gym management SaaS is now ready for production deployment!** 🎯✨ 