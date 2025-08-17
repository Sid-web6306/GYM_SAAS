// src/stores/index.ts

// Export all stores
export * from './auth-store' // Auth UI state only (client-side)
export * from './settings-store' // Settings UI state with persistence
export * from './toast-store' // Toast notifications
export * from './ui-store' // Global UI state (sidebar, theme, etc.)

/**
 * Store Architecture Migration Complete
 * 
 * ✅ TanStack Query now handles all server state:
 *    - Authentication data (user, profile)
 *    - Gym data and analytics
 *    - Members data and management
 *    - Real-time subscriptions
 * 
 * ✅ Zustand now handles only client UI state:
 *    - auth-store.ts: Auth UI preferences (welcome message, last login, etc.)
 *    - ui-store.ts: Global UI state (sidebar, theme, layout preferences)
 *    - toast-store.ts: Toast notification queue
 * 
 * 🗑️ Removed legacy stores:
 *    - auth-store-legacy-adapter.ts (migration helper)
 *    - auth-store-new.ts (server state version)
 *    - members-store.ts (replaced by TanStack Query)
 *    - gym-store.ts (replaced by TanStack Query)
 * 
 * Benefits of new architecture:
 * - Zero hydration issues
 * - Automatic caching and invalidation
 * - Background refetching
 * - Optimistic updates
 * - Built-in error handling
 * - Multi-tab synchronization
 * - Proper separation of concerns
 */

