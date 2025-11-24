import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'

// Global scroll position preservation
let savedScrollPosition = 0
let scrollPreservationTimer: NodeJS.Timeout | null = null

function preserveScrollPosition() {
  if (typeof window === 'undefined') return
  savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop
}

function restoreScrollPosition() {
  if (typeof window === 'undefined') return
  
  // Clear any existing timer
  if (scrollPreservationTimer) {
    clearTimeout(scrollPreservationTimer)
  }
  
  // Restore scroll after a brief delay to allow DOM updates
  scrollPreservationTimer = setTimeout(() => {
    window.scrollTo({
      top: savedScrollPosition,
      behavior: 'instant' // No smooth scrolling during refetches
    })
  }, 50)
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR-friendly settings
        staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - data stays in cache for 10 minutes
        retry: 3,
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: false, // Only refetch if data is stale (respects staleTime)
        refetchOnReconnect: true, // Refetch when network reconnects
        
        // Scroll preservation and layout stability
        refetchInterval: false, // Disable automatic refetching to reduce scroll jumps
        placeholderData: (previousData: unknown) => previousData, // Prevents layout shifts during refetches
      },
      mutations: {
        retry: 1, // Retry failed mutations once
      },
    },
    // Add global listeners for scroll preservation during queries and mutations
    mutationCache: new MutationCache({
      onMutate: () => {
        preserveScrollPosition()
      },
      onSuccess: () => {
        restoreScrollPosition()
      },
      onError: () => {
        restoreScrollPosition()
      },
      onSettled: () => {
        restoreScrollPosition()
      },
    }),
    queryCache: new QueryCache({
      onSuccess: () => {
        restoreScrollPosition()
      },
      onError: () => {
        restoreScrollPosition()
      },
      onSettled: () => {
        restoreScrollPosition()
      },
    }),
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
} 