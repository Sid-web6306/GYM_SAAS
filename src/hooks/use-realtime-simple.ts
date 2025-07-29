'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { useOptimizedQueryInvalidation } from '@/lib/query-optimizations'

// Comprehensive table to query keys mapping - matches actual query key patterns used by pages
const TABLE_QUERY_MAPPINGS = {
  members: (gymId: string) => [
    // Members page queries
    ['members', 'list'],              // Covers all member list queries regardless of filters
    ['members', 'stats', gymId],      // Members stats on members page
    
    // Dashboard page queries that depend on member data
    ['gym', 'stats', gymId],          // Gym stats on dashboard (uses member data)
    ['gym', 'analytics', gymId],      // Gym analytics charts (uses member data)
    
    // Specific member detail queries (for edit/view)
    ['members', 'detail'],            // Individual member queries
    
    // Recent activity queries
    ['members', 'activity', gymId]    // Member activity feed
  ],
  gyms: (gymId: string) => [
    ['gym', gymId],                   // Individual gym queries
    ['gym', 'stats', gymId],          // Gym stats
    ['gym', 'analytics', gymId]       // Gym analytics
  ],
  profiles: (userId: string) => [
    ['auth'],                         // Auth session queries
    ['auth', 'profile', userId]       // User profile queries
  ],
  subscriptions: (userId: string) => [
    ['subscription-info', userId],    // Current subscription
    ['user-subscriptions', userId],   // Subscription history
    ['check-subscription-access', userId], // Access checks
    ['trial-info']                    // Trial status
  ]
} as const

type TableName = keyof typeof TABLE_QUERY_MAPPINGS

// Simple realtime hook that auto-subscribes to table changes for a gym
export function useRealtimeSync(gymId: string | null) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()
  const { invalidateQueries } = useOptimizedQueryInvalidation()
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map())
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const cleanupFunctionsRef = useRef<Set<() => void>>(new Set())
  const isMountedRef = useRef(true)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const channels = channelsRef.current
    const cleanupFunctions = cleanupFunctionsRef.current
    
    // Lazy initialize supabase client
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current
    
    // Only log setup in production or when debugging
    if (process.env.NODE_ENV === 'production' || process.env.DEBUG_REALTIME) {
      logger.realtime.connect('Setting up realtime subscriptions', { 
        isAuthenticated, 
        hasUser: !!user, 
        gymId,
        hasSupabase: !!supabase 
      })
    }
    
    // Reset mounted state
    isMountedRef.current = true
    
    // Only set up realtime if user is authenticated and has a gym
    if (!isAuthenticated || !user || !gymId) {
      // Only log skipping setup if debugging
      if (process.env.DEBUG_REALTIME) {
        logger.realtime.connect('Skipping realtime setup - missing requirements', { 
          isAuthenticated, 
          hasUser: !!user, 
          gymId 
        })
      }
      // Cleanup any existing subscriptions
      channels.forEach((channel) => {
        try {
          supabase.removeChannel(channel)
        } catch (error) {
          logger.realtime.error('Error removing channel during cleanup', { 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      })
      channels.clear()
      
      // Execute all cleanup functions
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          logger.realtime.error('Error during cleanup function execution', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
      cleanupFunctions.clear()
      return
    }
    
    // Set up cross-tab communication listener
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'realtime-broadcast') {
        try {
          const broadcastData = JSON.parse(event.newValue || '{}')
          if (broadcastData.type === 'realtime-update') {
            logger.realtime.update('Cross-tab broadcast received', { 
              table: broadcastData.table, 
              eventType: broadcastData.eventType,
              broadcastGymId: broadcastData.gymId,
              currentGymId: gymId
            })
            
            // For member events, check if it's relevant to current gym
            let shouldProcess = true
            if (broadcastData.table === 'members') {
              // If the broadcast includes gymId info, only process if it matches current gym
              // If no gymId info, process anyway to be safe
              if (broadcastData.gymId && broadcastData.gymId !== gymId) {
                shouldProcess = false
                logger.realtime.update('Skipping cross-tab event - different gym', {
                  eventType: broadcastData.eventType,
                  broadcastGymId: broadcastData.gymId,
                  currentGymId: gymId
                })
              } else {
                logger.realtime.update('Processing cross-tab event for matching gym', {
                  eventType: broadcastData.eventType,
                  broadcastGymId: broadcastData.gymId,
                  currentGymId: gymId
                })
              }
            }
            
            if (!shouldProcess) return
            
            // Refetch relevant queries when receiving broadcast from another tab
            const getQueryKeys = TABLE_QUERY_MAPPINGS[broadcastData.table as TableName]
            if (getQueryKeys) {
              const entityId = broadcastData.table === 'members' || broadcastData.table === 'gyms' ? gymId : user.id
              const queryKeys = getQueryKeys(entityId)
              
              // Use immediate invalidation for DELETE events and cross-tab communication
              const useImmediate = broadcastData.eventType === 'DELETE' || true
              
              queryKeys.forEach(queryKey => {
                logger.realtime.update('Cross-tab query invalidation', { 
                  queryKey, 
                  immediate: useImmediate,
                  eventType: broadcastData.eventType
                })
                
                // Use partial matching for query invalidation to catch queries with different filters
                queryClient.invalidateQueries({
                  queryKey: queryKey,
                  exact: false, // Allow partial matching to catch filtered queries
                  refetchType: 'all'
                })
              })
            }
          }
        } catch (error) {
          logger.realtime.error('Error parsing cross-tab broadcast', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }
    
    // Add storage event listener for cross-tab communication
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent)
    }
    
    // Set up subscriptions for key tables
    const setupSubscription = (table: TableName, filter?: string) => {
      const channelName = filter ? `${table}-${filter}` : table
      
      // Skip if already subscribed
      if (channelsRef.current.has(channelName)) return

      const channel = supabase
        .channel(`realtime-${channelName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            // Check if component is still mounted to prevent memory leaks
            if (!isMountedRef.current) {
              logger.realtime.update('Update skipped - component unmounted', { table })
              return
            }

            const now = Date.now()
            
            // Reduce throttling for DELETE events, increase for subscription-related events
            const throttleMs = payload.eventType === 'DELETE' ? 50 : 
                              table === 'subscriptions' ? 1000 : 200
            if (now - lastUpdateRef.current < throttleMs) {
              logger.realtime.update('Throttling realtime update - too frequent', { table, eventType: payload.eventType })
              return
            }
            
            lastUpdateRef.current = now
            
            logger.realtime.update('Realtime update received', { 
              table, 
              eventType: payload.eventType,
              gymId,
              userId: user.id,
              hasOldRecord: !!payload.old,
              hasNewRecord: !!payload.new
            })
            
            // Special handling for DELETE events - they might not have gym_id in the payload
            // but we still want to invalidate queries for this gym
            let shouldProcess = true
            if (table === 'members' && filter && payload.eventType === 'DELETE') {
              // For DELETE events on members, always process if we're subscribed to this gym
              // since the DELETE might not include the old record data
              shouldProcess = true
              logger.realtime.update('Processing DELETE event for members table', { 
                gymId, 
                hasOldRecord: !!payload.old 
              })
            }
            
            if (!shouldProcess) {
              logger.realtime.update('Skipping event - does not match filter criteria', { 
                table, 
                eventType: payload.eventType 
              })
              return
            }
            
            // Get query keys to invalidate based on table
            const getQueryKeys = TABLE_QUERY_MAPPINGS[table]
            const entityId = table === 'members' || table === 'gyms' ? gymId : user.id
            const queryKeys = getQueryKeys(entityId)
            
            logger.realtime.update('Processing realtime update for all tabs', { 
              table, 
              eventType: payload.eventType, 
              queryKeysCount: queryKeys.length 
            })
            
            // For DELETE events, use immediate invalidation to ensure UI updates quickly
            const useImmediate = payload.eventType === 'DELETE'
            
            queryKeys.forEach(queryKey => {
              // Check if component is still mounted before processing
              if (!isMountedRef.current) return
              
              logger.realtime.update('Scheduling query invalidation', { 
                queryKey, 
                immediate: useImmediate,
                eventType: payload.eventType 
              })
              
              // Use partial matching to ensure all related queries are invalidated across different pages
              if (useImmediate) {
                // For DELETE events, use immediate direct invalidation
                queryClient.invalidateQueries({
                  queryKey: queryKey,
                  exact: false, // Allow partial matching to catch filtered queries
                  refetchType: 'all'
                })
              } else {
                // For other events, use optimized invalidation
                invalidateQueries(queryKey, {
                  exact: false,
                  refetchType: 'all',
                  immediate: useImmediate
                })
              }
            })
            
            // Broadcast to other tabs using storage event with error handling
            try {
              if (typeof localStorage !== 'undefined') {
                const broadcastEvent = {
                  type: 'realtime-update',
                  table,
                  eventType: payload.eventType,
                  timestamp: Date.now(),
                  gymId: table === 'members' ? gymId : undefined,
                  recordId: (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id,
                  tabId: Math.random().toString(36).substr(2, 9) // Unique tab identifier
                }
                
                // Use a unique key each time to ensure the storage event fires
                const storageKey = `realtime-broadcast-${Date.now()}-${Math.random()}`
                localStorage.setItem(storageKey, JSON.stringify(broadcastEvent))
                
                // Clean up the storage item after a short delay
                setTimeout(() => {
                  try {
                    localStorage.removeItem(storageKey)
                  } catch (error) {
                    logger.realtime.error('Error during storage cleanup', {
                      error: error instanceof Error ? error.message : 'Unknown error'
                    })
                  }
                }, 1000)
                
                logger.realtime.update('Cross-tab broadcast sent', {
                  table,
                  eventType: payload.eventType,
                  storageKey,
                  gymId: table === 'members' ? gymId : undefined
                })
              }
            } catch (error) {
              logger.realtime.error('Storage broadcast failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
        )
        .subscribe((status) => {
          // Only log status in debug mode to reduce console noise
          if (process.env.DEBUG_REALTIME) {
            console.log('Realtime subscription status:', status, 'for table:', table, 'channel:', channelName, 'type:', typeof status)
          }
          
          if (status === 'SUBSCRIBED') {
            logger.realtime.connect('Subscribed to realtime updates', { table, channelName })
          } else if (status === 'CHANNEL_ERROR') {
            logger.realtime.error('Error subscribing to realtime updates', { table, channelName, status })
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            logger.realtime.disconnect('Realtime subscription ended', { table, channelName, status })
          } else {
            // Log unexpected status but don't treat as error (only in debug mode)
            if (process.env.DEBUG_REALTIME) {
              console.log('Unexpected realtime status:', status, 'type:', typeof status, 'table:', table, 'channel:', channelName)
            }
            logger.realtime.update('Realtime subscription status update', { table, channelName, status })
          }
        })

      channelsRef.current.set(channelName, channel)
    }

    // Set up gym-specific subscriptions with error handling
    try {
      setupSubscription('members', `gym_id=eq.${gymId}`)
      setupSubscription('gyms', `id=eq.${gymId}`)
    } catch (error) {
      logger.realtime.error('Error setting up gym subscriptions', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        gymId 
      })
    }
    
    // Set up additional member subscription without filter to catch DELETE events
    // that might not include the old record data
    const setupMemberDeleteSubscription = () => {
      const channelName = 'members-all-deletes'
      
      if (channelsRef.current.has(channelName)) return

      const channel = supabase
        .channel(`realtime-${channelName}`)
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'members'
            // No filter - catch all member deletions
          },
          (payload) => {
            if (!isMountedRef.current) return

            logger.realtime.update('Member DELETE event received (no filter)', { 
              eventType: payload.eventType,
              hasOldRecord: !!payload.old,
              gymId
            })
            
            // For unfiltered DELETE events, always invalidate current gym's member queries
            // since we can't be sure which gym the deleted member belonged to
            const memberQueryKeys = TABLE_QUERY_MAPPINGS.members(gymId)
            
            memberQueryKeys.forEach(queryKey => {
              if (!isMountedRef.current) return
              
              logger.realtime.update('Invalidating member queries from DELETE subscription', { 
                queryKey,
                immediate: true
              })
              
              // Use direct invalidation for DELETE events with partial matching
              queryClient.invalidateQueries({
                queryKey: queryKey,
                exact: false, // Allow partial matching to catch filtered queries
                refetchType: 'all'
              })
            })
          }
        )
        .subscribe((status) => {
          // Only log status in debug mode to reduce console noise
          if (process.env.DEBUG_REALTIME) {
            console.log('DELETE subscription status:', status, 'for channel:', channelName, 'type:', typeof status)
          }
          
          // Handle different subscription statuses
          if (status === 'SUBSCRIBED') {
            logger.realtime.connect('Subscribed to member DELETE events', { channelName })
          } else if (status === 'CHANNEL_ERROR') {
            logger.realtime.error('Error subscribing to member DELETE events', { channelName, status })
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            logger.realtime.disconnect('Member DELETE subscription ended', { channelName, status })
          } else {
            // Log unexpected status but don't treat as error (only in debug mode)
            if (process.env.DEBUG_REALTIME) {
              console.log('Unexpected DELETE status:', status, 'type:', typeof status, 'channel:', channelName)
            }
            logger.realtime.update('Member DELETE subscription status update', { channelName, status })
          }
        })

      channelsRef.current.set(channelName, channel)
    }
    
    try {
      setupMemberDeleteSubscription()
    } catch (error) {
      logger.realtime.error('Error setting up member delete subscription', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
    
    // Set up user-specific subscriptions with error handling
    try {
      setupSubscription('profiles', `id=eq.${user.id}`)
      setupSubscription('subscriptions', `user_id=eq.${user.id}`)
    } catch (error) {
      logger.realtime.error('Error setting up user subscriptions', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id 
      })
    }
    
    logger.realtime.connect('Realtime subscriptions established', { 
      gymId, 
      userId: user.id,
      channelCount: channels.size 
    })

    // Add storage cleanup to cleanup functions
    const storageCleanup = () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent)
      }
    }
    cleanupFunctions.add(storageCleanup)

    // Cleanup function
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false
      
      // Remove all channels with error handling
      channels.forEach((channel, channelName) => {
        try {
          supabase.removeChannel(channel)
          logger.realtime.disconnect('Channel removed', { channelName })
        } catch (error) {
          logger.realtime.error('Error removing channel', {
            channelName,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
      channels.clear()
      
      // Execute all cleanup functions
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          logger.realtime.error('Error during cleanup', {
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      })
      cleanupFunctions.clear()
      
      logger.realtime.disconnect('Realtime subscriptions cleaned up', { gymId, userId: user.id })
    }
  }, [isAuthenticated, user, gymId, queryClient, invalidateQueries])

  // Cleanup on unmount
  useEffect(() => {
    const channels = channelsRef.current
    const supabase = supabaseRef.current
    
    return () => {
      channels.forEach((channel) => {
        supabase?.removeChannel(channel)
      })
      channels.clear()
    }
  }, [])

  return {
    isConnected: channelsRef.current.size > 0,
    subscriptionCount: channelsRef.current.size
  }
}

// Hook for specific table realtime updates (backward compatibility)
export function useTableRealtime(
  table: TableName,
  entityId: string | null,
  options?: {
    enabled?: boolean
  }
) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    const existingChannel = channelRef.current
    const supabase = supabaseRef.current
    
    if (!options?.enabled || !isAuthenticated || !user || !entityId) {
      if (existingChannel) {
        supabase?.removeChannel(existingChannel)
        channelRef.current = null
      }
      return
    }
    const filter = table === 'members' 
      ? `gym_id=eq.${entityId}` 
      : table === 'gyms'
      ? `id=eq.${entityId}`
      : `user_id=eq.${entityId}`

    const channel = supabase?.channel(`realtime-${table}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          console.log(`📡 Table realtime update - ${table}:`, payload.eventType)
          
          // Get query keys to invalidate
          const getQueryKeys = TABLE_QUERY_MAPPINGS[table]
          const queryKeys = getQueryKeys(entityId)
          
          // Invalidate all related queries
          queryKeys.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey })
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Table ${table} realtime subscription active`)
        }
      })

    if (channel) {
      channelRef.current = channel
    }

    return () => {
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current)
      }
    }
  }, [table, entityId, options?.enabled, isAuthenticated, user, queryClient])

  return {
    isConnected: !!channelRef.current
  }
}

// Simplified members realtime hook
export function useMembersRealtimeSimple(gymId: string | null, enabled = true) {
  return useTableRealtime('members', gymId, { enabled })
}

// Simplified gym realtime hook  
export function useGymRealtimeSimple(gymId: string | null, enabled = true) {
  return useTableRealtime('gyms', gymId, { enabled })
} 