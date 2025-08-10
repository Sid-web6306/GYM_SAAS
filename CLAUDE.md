# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant Gym SaaS MVP built with Next.js 15 and Supabase. The application allows gym owners to manage their members, view analytics, handle member check-ins, and manage subscriptions with tiered pricing plans. The system includes payment processing through razorpay, subscription management, and comprehensive legal pages (privacy policy, terms of service, refund policy). Each gym owner's data is isolated through a multi-tenant architecture.

## Development Commands

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

## Architecture & Key Patterns

### Authentication System
- **Multi-tenant authentication** with Supabase Auth
- **Server Actions** for auth operations in `src/actions/auth.actions.ts`
- **Zustand store** for client-side auth state management (`src/stores/auth-store.ts`)
- **Onboarding flow** for new gym owners to complete their profiles
- **Social login** support (Google, Facebook) with OAuth callbacks

### File Structure
```
src/
├── app/                     # Next.js App Router
│   ├── (app)/              # Protected routes (dashboard, members, settings, upgrade)
│   ├── (auth)/             # Authentication pages (login, signup, forgot-password)
│   ├── auth/callback/      # OAuth callback handler
│   ├── api/                # API routes (payments, subscriptions, webhooks)
│   ├── contact/            # Contact page
│   ├── onboarding/         # User onboarding flow
│   └── [legal-pages]/      # Privacy policy, terms of service, refund policy
├── actions/                # Server Actions
├── components/             # Reusable UI components
│   ├── ui/                # Shadcn/ui components
│   ├── charts/            # Chart components using Tremor
│   └── legal/             # Legal page components
├── stores/                 # Zustand state management
├── types/                  # TypeScript type definitions
├── utils/supabase/         # Supabase client configurations
└── lib/                    # Utility libraries (config, logger)
database/
└── migrations/             # SQL migration files for schema setup
```

### State Management
- **Zustand** for global state management
- **Stores** in `src/stores/`:
  - `auth-store.ts` - Authentication state
  - `toast-store.ts` - Toast notifications
  - `index.ts` - Store exports

### Database & Types
- **Supabase** as Backend-as-a-Service
- **Type-safe** database interactions with generated types in `src/types/`
- **Multi-tenant** architecture with profiles linked to gym_id
- **RPC functions** for complex operations (e.g., `complete_user_profile`)
- **Migration-based** schema management in `database/migrations/`
- **Subscription plans** with tiered pricing (Starter, Professional, Enterprise)
- **Payment methods** and subscription tracking tables
- **Comprehensive indexes** and constraints for performance

### UI Components
- **Shadcn/ui** component library
- **Tailwind CSS** for styling
- **Tremor** for charts and data visualization
- **Lucide React** for icons
- **React Hook Form** with Zod validation

### Payment & Subscription System
- **Stripe integration** for payment processing
- **Tiered subscription plans** (₹2,999/month Starter, ₹5,999/month Professional, Enterprise)
- **Webhook handling** for payment events in `src/app/api/webhooks/stripe/`
- **Payment methods** storage and management
- **Subscription lifecycle** management with automatic upgrades/downgrades
- **API routes** for payments, subscriptions, and payment verification

### Key Authentication Flows
1. **Standard signup**: Email/password → onboarding → dashboard
2. **Social login**: OAuth → callback → check profile → onboarding/dashboard
3. **Multi-tenant isolation**: Each gym owner has isolated data through gym_id

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_PUBLISHABLE_KEY` - For client-side Stripe integration
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public Stripe key for frontend

## Common Development Patterns

### Server Actions
- Use `'use server'` directive for server-side operations
- Implement proper error handling with form states
- Use Zod schemas for validation
- Return structured error objects for form feedback

### Toast Notifications
- Use `react-hot-toast` for notifications
- Toast store manages application-wide notifications
- URL-based toast messages for redirect scenarios

### Type Safety
- All database operations use generated Supabase types
- Global type helpers available for Tables and Enums
- Strict TypeScript configuration enabled

### Database Migration System
- **Sequential migrations** in `database/migrations/` numbered 01-17
- **Schema includes**: gyms, profiles, members, activities, subscriptions, payment methods
- **Indexes and constraints** for performance and data integrity
- **RPC functions** and database triggers for complex operations
- **Sample data** insertion for subscription plans and testing

### API Architecture
- **RESTful API routes** in `src/app/api/`
- **Payment processing** endpoints (`/api/payments/`, `/api/payment-methods/`)
- **Subscription management** (`/api/subscriptions/`)
- **Webhook handlers** for Stripe events (`/api/webhooks/stripe/`)
- **Document management** and feedback collection endpoints
- **Authentication checks** and session verification

### Legal & Compliance
- **Comprehensive legal pages**: Privacy Policy, Terms of Service, Refund Policy
- **Reusable legal components** in `src/components/legal/`
- **Contact page** with proper business information
- **Policy management** through structured components

### Testing
No specific test framework detected. Check with gym owner for testing preferences before implementing tests.