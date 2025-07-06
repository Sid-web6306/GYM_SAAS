// src/stores/index.ts

// Export all stores
export * from './auth-store'
export * from './gym-store'
export * from './members-store'
export * from './toast-store'

// Import stores for initialization
import { useAuthStore } from './auth-store'
import { useGymStore } from './gym-store'
import { useMembersStore } from './members-store'

// Global store initialization
export const initializeStores = async () => {
  try {
    // Initialize auth store first (no await needed as it's synchronous)
    useAuthStore.getState().initialize()
    
    // Wait a bit for auth to initialize, then check for other stores
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Once auth is initialized, we can initialize other stores if needed
    const { user, profile } = useAuthStore.getState()
    
    if (user && profile?.gym_id) {
      // Initialize gym and members data
      await Promise.all([
        useGymStore.getState().fetchGym(profile.gym_id),
        useGymStore.getState().fetchStats(profile.gym_id),
        useMembersStore.getState().fetchMembers(profile.gym_id),
      ])
    }
  } catch (error) {
    console.error('Store initialization error:', error)
  }
}

