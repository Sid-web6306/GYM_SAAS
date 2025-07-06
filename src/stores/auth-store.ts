// src/stores/auth-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  full_name: string | null
  gym_id: string | null
  created_at: string
}

export interface AuthState {
  // State
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isProfileLoading: boolean
  isInitialized: boolean
  
  // Actions
  initialize: () => void // No longer async
  logout: () => Promise<void>
  fetchProfile: () => Promise<void>
  setupProfileSubscription: (userId: string) => void
  cleanup: () => void
  
  // Computed getters
  isAuthenticated: () => boolean
  hasGym: () => boolean
}

// Global auth listener and subscription management
let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null
let profileSubscription: { unsubscribe: () => void } | null = null

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        profile: null,
        isLoading: true,
        isProfileLoading: false,
        isInitialized: false,

        // --- ACTIONS ---

        // Initialize auth state by setting up the listener
        initialize: () => {
          console.log('AuthStore: Initialize called', { 
            isInitialized: get().isInitialized, 
            hasListener: !!authListener,
            currentUser: get().user?.email
          });
          
          // Prevent multiple initializations
          if (get().isInitialized) {
            console.log('AuthStore: Already initialized, skipping');
            return;
          }
          
          // Mark as initializing
          set({ isLoading: true });
          
          const supabase = createClient();
          
          // IMPROVED: Immediately check for existing session
          const checkSession = async () => {
            try {
              const { data: { session }, error } = await supabase.auth.getSession();
              
              console.log('AuthStore: Initial session check', { 
                hasSession: !!session, 
                userEmail: session?.user?.email,
                error,
                currentUser: get().user?.email
              });
              
              if (error) {
                console.error('AuthStore: Session check error', error);
                // Clear any stale user data on session error
                set({ isInitialized: true, isLoading: false, user: null, profile: null });
                return;
              }
              
              if (session?.user) {
                // Always use session user as the source of truth
                console.log('AuthStore: Valid session found, updating user state');
                
                // Update state with session data and mark as initialized
                set({ 
                  user: session.user, 
                  isLoading: false, 
                  isInitialized: true 
                });
                // Fetch profile in background
                get().fetchProfile();
              } else {
                // No session - clear all auth state (including any stale localStorage data)
                console.log('AuthStore: No session found, clearing auth state');
                set({ 
                  user: null, 
                  profile: null, 
                  isLoading: false, 
                  isInitialized: true 
                });
              }
            } catch (error) {
              console.error('AuthStore: Error checking session', error);
              // Always mark as initialized and clear state on error
              set({ isInitialized: true, isLoading: false, user: null, profile: null });
            }
          };
          
          // Execute session check immediately
          checkSession();
          
          // Also set up a small delay to re-check session in case of timing issues
          setTimeout(() => {
            if (!get().user && !get().isLoading) {
              console.log('AuthStore: Re-checking session after delay');
              checkSession();
            }
          }, 500);
          
          // Set up auth state change listener only if not already set
          if (!authListener) {
            authListener = supabase.auth.onAuthStateChange(async (event, session) => {
              console.log('AuthStore: Auth state change', { event, userEmail: session?.user?.email });
              
              const user = session?.user ?? null;
              const currentUser = get().user;

              // Always ensure we're initialized after auth state changes
              if (!get().isInitialized) {
                set({ isInitialized: true, isLoading: false });
              }

              // Handle different auth events
              if (event === 'SIGNED_OUT') {
                console.log('AuthStore: User signed out, cleaning up');
                set({ user: null, profile: null });
                // Clean up profile subscription when user signs out
                if (profileSubscription) {
                  profileSubscription.unsubscribe();
                  profileSubscription = null;
                }
              } else if (event === 'TOKEN_REFRESHED') {
                console.log('AuthStore: Token refreshed');
                // Update user data if token was refreshed
                if (user && user.id === currentUser?.id) {
                  set({ user });
                }
              } else if (event === 'SIGNED_IN') {
                console.log('AuthStore: User signed in');
                set({ user });
                if (user) {
                  await get().fetchProfile();
                  get().setupProfileSubscription(user.id);
                }
              } else {
                // Update user state for other events
                if (user?.id !== currentUser?.id) {
                  console.log('AuthStore: User changed, updating state');
                  set({ user });
                  
                  if (user) {
                    // User logged in - fetch their profile and set up subscription
                    await get().fetchProfile();
                    get().setupProfileSubscription(user.id);
                  } else {
                    // User logged out - clear profile and cleanup subscription
                    set({ profile: null });
                    if (profileSubscription) {
                      profileSubscription.unsubscribe();
                      profileSubscription = null;
                    }
                  }
                }
              }
            });
          }
          
          // Set up profile subscription if user exists
          const currentUser = get().user;
          if (currentUser) {
            get().setupProfileSubscription(currentUser.id);
          }
          
          // Failsafe: Always mark as initialized after 3 seconds
          setTimeout(() => {
            if (!get().isInitialized) {
              console.warn('AuthStore: Force marking as initialized after timeout');
              set({ isInitialized: true, isLoading: false });
            }
          }, 3000);
        },

        // Set up profile subscription (extracted to prevent memory leaks)
        setupProfileSubscription: (userId: string) => {
          // Clean up existing subscription first
          if (profileSubscription) {
            profileSubscription.unsubscribe();
            profileSubscription = null;
          }
          
          const supabase = createClient();
          
          const channel = supabase
            .channel('profile-changes')
            .on('postgres_changes', 
              { 
                event: '*', 
                schema: 'public', 
                table: 'profiles',
                filter: `id=eq.${userId}`
              },
              async () => {
                console.log('AuthStore: Profile updated, refreshing')
                await get().fetchProfile()
              }
            )
            .subscribe();
            
          // Store subscription for cleanup
          profileSubscription = channel;
        },

        // Fetch user profile with a guard to prevent concurrent fetches
        fetchProfile: async () => {
          const { user, isProfileLoading } = get();
          if (!user || isProfileLoading) {
            return; // Don't fetch if no user or already fetching
          }
          
          set({ isProfileLoading: true });
          const supabase = createClient();

          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (!error && profile) {
              set({ profile });
            } else {
              set({ profile: null }); // Ensure profile is cleared if not found or on error
              if (error && error.code !== 'PGRST116') {
                console.error('Profile fetch error:', error);
              }
            }
          } catch (error) {
            console.error('Profile fetch error:', error);
            set({ profile: null });
          } finally {
            set({ isProfileLoading: false });
          }
        },
        
        // Logout user and clear state
        logout: async () => {
          const supabase = createClient()
          
          try {
            await supabase.auth.signOut()
            
            const newState = {
              user: null,
              profile: null,
              isLoading: false,
              isInitialized: true // Mark as initialized to prevent loading screen on logout
            };
            
            set(newState);
            
            // Clean up profile subscription
            if (profileSubscription) {
              profileSubscription.unsubscribe();
              profileSubscription = null;
            }
            
            console.log('AuthStore: Logout completed');
          } catch (error) {
            console.error('AuthStore: Logout error', error);
            // Still clear state even if logout fails
            set({
              user: null,
              profile: null,
              isLoading: false,
              isInitialized: true
            });
          }
        },

        // Cleanup all listeners and subscriptions
        cleanup: () => {
          console.log('AuthStore: Cleaning up subscriptions');
          
          if (authListener) {
            authListener.data.subscription.unsubscribe();
            authListener = null;
          }
          
          if (profileSubscription) {
            profileSubscription.unsubscribe();
            profileSubscription = null;
          }
        },

        // --- COMPUTED GETTERS ---
        isAuthenticated: () => {
          const state = get();
          // Only return true if we have a user AND are initialized
          // This prevents false positives when hydrating stale data from localStorage
          return !!state.user && state.isInitialized;
        },
        hasGym: () => !!get().profile?.gym_id,
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          profile: state.profile,
          // Never persist loading or initialization states
        }),
        onRehydrateStorage: () => (state) => {
          console.log('AuthStore: Rehydration complete', {
            hasUser: !!state?.user,
            userEmail: state?.user?.email,
          });
          
          // After rehydration, always reset loading/init states
          if (state) {
            // These should never be persisted, always start fresh
            state.isInitialized = false;
            state.isLoading = false;
            state.isProfileLoading = false;
            console.log('AuthStore: Reset initialization states after rehydration');
            
            // If we have a user from localStorage, we need to validate it
            // The initialize() function will check if the session is still valid
            if (state.user) {
              console.log('AuthStore: Found persisted user, will validate session on initialize');
            }
          }
        }
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Cleanup on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useAuthStore.getState().cleanup();
  });
}

// Export convenience actions
export const authActions = {
  initialize: () => useAuthStore.getState().initialize(),
  logout: () => useAuthStore.getState().logout(),
  fetchProfile: () => useAuthStore.getState().fetchProfile(),
  cleanup: () => useAuthStore.getState().cleanup(),
  // Helper to get current auth state reliably
  getAuthState: () => {
    const state = useAuthStore.getState();
    return {
      isAuthenticated: state.isAuthenticated(),
      hasGym: state.hasGym(),
      isInitialized: state.isInitialized,
      isLoading: state.isLoading,
      user: state.user,
      profile: state.profile
    };
  }
}

