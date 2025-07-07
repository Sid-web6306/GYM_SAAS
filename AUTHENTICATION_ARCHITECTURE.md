# Authentication Architecture - TanStack Query + Zustand

This document explains the new authentication architecture that separates server state (TanStack Query) from client UI state (Zustand).

## 🏗️ Architecture Overview

### Before (Old Architecture)
```
┌─────────────────────────────────────────┐
│              Zustand Store              │
│  ┌─────────────────────────────────────┐ │
│  │        Server State                 │ │
│  │  • user: User | null                │ │
│  │  • profile: Profile | null          │ │
│  │  • isLoading: boolean               │ │
│  │  • Authentication actions           │ │
│  │  • Profile fetching                 │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │        Client UI State              │ │
│  │  • showWelcomeMessage: boolean      │ │
│  │  • rememberEmail: string            │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Problems:**
- ❌ Hydration mismatches in Next.js SSR
- ❌ Complex state synchronization
- ❌ Manual cache invalidation
- ❌ No optimistic updates
- ❌ Poor error handling
- ❌ No background refetching

### After (New Architecture)
```
┌─────────────────────────────────────────┐
│            TanStack Query               │
│  ┌─────────────────────────────────────┐ │
│  │        Server State                 │ │
│  │  • user: User | null                │ │
│  │  • profile: Profile | null          │ │
│  │  • isLoading: boolean               │ │
│  │  • Authentication mutations         │ │
│  │  • Automatic caching               │ │
│  │  • Background refetching           │ │
│  │  • Multi-tab sync                  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│              Zustand Store              │
│  ┌─────────────────────────────────────┐ │
│  │        Client UI State              │ │
│  │  • showWelcomeMessage: boolean      │ │
│  │  • rememberEmail: string            │ │
│  │  • lastLoginTime: number            │ │
│  │  • preferredLoginMethod: string     │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Zero hydration issues
- ✅ Automatic caching and invalidation
- ✅ Background refetching
- ✅ Optimistic updates
- ✅ Built-in error handling
- ✅ Multi-tab synchronization
- ✅ Proper separation of concerns

## 📁 File Structure

```
src/
├── hooks/
│   └── use-auth.ts                    # 🆕 TanStack Query auth hooks
├── stores/
│   ├── auth-store.ts                  # 🔄 Now only UI state
│   ├── auth-store-legacy-adapter.ts   # 🔄 Migration helper
│   └── index.ts                       # 🔄 Updated exports
└── components/
    ├── providers/
    │   ├── query-provider.tsx         # 🆕 TanStack Query provider
    │   └── session-provider-new.tsx   # 🆕 New session provider
    └── auth/
        └── AuthGuard-new.tsx          # 🆕 New auth guards
```

## 🚀 Quick Start

### For New Components (Recommended)

```tsx
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
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>Welcome {user?.email}</h1>
      {showWelcomeMessage && <p>Welcome to our app!</p>}
      <button onClick={handleLogout}>
        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  )
}
```

### For Legacy Components (Temporary)

```tsx
import { useLegacyAuthStore } from '@/stores/auth-store-legacy-adapter'

function LegacyComponent() {
  // This provides the old API but uses the new architecture under the hood
  const { user, isAuthenticated, logout } = useLegacyAuthStore()
  
  const handleLogout = () => logout()
  
  return <div>{user?.email}</div>
}
```

## 🔄 Migration Guide

### Step 1: Update Imports

**Before:**
```tsx
import { useAuthStore } from '@/stores/auth-store'
```

**After:**
```tsx
import { useAuth, useLogout } from '@/hooks/use-auth'
import { useAuthStore } from '@/stores/auth-store' // Only for UI state
```

### Step 2: Update State Access

**Before:**
```tsx
const { user, profile, isAuthenticated, isLoading } = useAuthStore()
```

**After:**
```tsx
const { user, profile, isAuthenticated, isLoading } = useAuth()
```

### Step 3: Update Actions

**Before:**
```tsx
const { logout } = useAuthStore()
const handleLogout = () => logout()
```

**After:**
```tsx
const logoutMutation = useLogout()
const handleLogout = () => logoutMutation.mutate()
```

### Step 4: Update Computed Values

**Before:**
```tsx
const isAuthenticated = useAuthStore(state => state.isAuthenticated())
```

**After:**
```tsx
const { isAuthenticated } = useAuth() // Already computed
```

## 🎯 Available Hooks

### Core Authentication

```tsx
import { 
  useAuth,           // Main auth hook
  useAuthUser,       // Just the user
  useAuthProfile,    // Just the profile
  useLogout,         // Logout mutation
  useUpdateProfile,  // Update profile mutation
  useAuthGuard,      // Route protection
  useInitializeAuth  // App initialization
} from '@/hooks/use-auth'
```

### Hook Details

#### `useAuth()`
Returns the complete authentication state:
```tsx
const {
  user,            // User | null
  profile,         // Profile | null
  isLoading,       // boolean
  isAuthenticated, // boolean
  hasGym,          // boolean
  error,           // Error | null
  refetch          // () => void
} = useAuth()
```

#### `useLogout()`
Returns a mutation for logging out:
```tsx
const logoutMutation = useLogout()

// Usage
logoutMutation.mutate() // Logs out and redirects

// State
logoutMutation.isPending // boolean
logoutMutation.error     // Error | null
```

#### `useUpdateProfile()`
Returns a mutation for updating the user profile:
```tsx
const updateProfileMutation = useUpdateProfile()

// Usage
updateProfileMutation.mutate({
  userId: user.id,
  updates: { full_name: 'New Name' }
})
```

#### `useAuthGuard()`
Provides route protection:
```tsx
const { canAccess, isLoading } = useAuthGuard({
  requireAuth: true,
  requireGym: true,
  redirectTo: '/login'
})
```

## 🎨 UI State Management

The Zustand store now only handles client-side UI state:

```tsx
import { useAuthStore, authUIActions } from '@/stores/auth-store'

// In components
const {
  showWelcomeMessage,
  lastLoginTime,
  rememberEmail,
  isOnboardingCompleted,
  preferredLoginMethod
} = useAuthStore()

// Actions
authUIActions.setShowWelcomeMessage(false)
authUIActions.setRememberEmail('user@example.com')
authUIActions.setLastLoginTime(Date.now())
```

## 🔧 Advanced Features

### Multi-tab Synchronization
Authentication state automatically syncs across browser tabs:
- Login in one tab → All tabs redirect to dashboard
- Logout in one tab → All tabs redirect to login
- Profile updates sync instantly

### Automatic Background Refetching
- Refetches on window focus
- Refetches on network reconnection
- Configurable stale time and cache time

### Error Handling
```tsx
const { error, isLoading } = useAuth()

if (error) {
  return <div>Authentication error: {error.message}</div>
}
```

### Loading States
```tsx
const { isLoading } = useAuth()
const logoutMutation = useLogout()

return (
  <div>
    {isLoading && <div>Loading authentication...</div>}
    <button 
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
    </button>
  </div>
)
```

## 🚨 Migration Checklist

- [ ] Update component imports
- [ ] Replace `useAuthStore()` with `useAuth()` for server state
- [ ] Replace auth actions with TanStack Query mutations
- [ ] Update loading state handling
- [ ] Update error handling
- [ ] Test multi-tab synchronization
- [ ] Remove legacy adapter once migration is complete

## ⚠️ Common Pitfalls

1. **Don't mix old and new patterns** - Use either the legacy adapter or the new hooks, not both
2. **UI state vs Server state** - Remember which store handles what
3. **Mutation vs Direct calls** - Use `mutation.mutate()` instead of direct function calls
4. **Loading states** - TanStack Query provides different loading states than Zustand
5. **Error handling** - Errors are now handled differently with TanStack Query

## 🔮 Future Improvements

- [ ] Add offline support
- [ ] Implement optimistic updates for profile changes
- [ ] Add retry logic for failed authentication
- [ ] Implement session refresh tokens
- [ ] Add authentication analytics

## 📚 Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Next.js SSR Best Practices](https://nextjs.org/docs/advanced-features/server-side-rendering) 