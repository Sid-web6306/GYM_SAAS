# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant Gym SaaS MVP built with Next.js 15 and Supabase. The application allows gym owners to manage their members, view analytics, and handle member check-ins. Each gym owner's data is isolated through a multi-tenant architecture.

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
│   ├── (app)/              # Protected routes (dashboard, etc.)
│   ├── (auth)/             # Authentication pages
│   └── auth/callback/      # OAuth callback handler
├── actions/                # Server Actions
├── components/             # Reusable UI components
│   ├── ui/                # Shadcn/ui components
│   └── charts/            # Chart components using Tremor
├── stores/                 # Zustand state management
├── types/                  # TypeScript type definitions
└── utils/supabase/         # Supabase client configurations
```

### State Management
- **Zustand** for global state management
- **Stores** in `src/stores/`:
  - `auth-store.ts` - Authentication state
  - `gym-store.ts` - Gym-specific data
  - `members-store.ts` - Member management
  - `toast-store.ts` - Toast notifications

### Database & Types
- **Supabase** as Backend-as-a-Service
- **Type-safe** database interactions with generated types
- **Multi-tenant** architecture with profiles linked to gym_id
- **RPC functions** for complex operations (e.g., `complete_user_profile`)

### UI Components
- **Shadcn/ui** component library
- **Tailwind CSS** for styling
- **Tremor** for charts and data visualization
- **Lucide React** for icons
- **React Hook Form** with Zod validation

### Key Authentication Flows
1. **Standard signup**: Email/password → onboarding → dashboard
2. **Social login**: OAuth → callback → check profile → onboarding/dashboard
3. **Multi-tenant isolation**: Each gym owner has isolated data through gym_id

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

### Testing
No specific test framework detected. Check with gym owner for testing preferences before implementing tests.