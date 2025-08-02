import { useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from './logger'

/**
 * Circuit breaker for query invalidation to prevent infinite loops
 */
class QueryInvalidationCircuitBreaker {
  private static instance: QueryInvalidationCircuitBreaker
  private invalidationCounts = new Map<string, { count: number; lastReset: number }>()
  private readonly maxInvalidationsPerMinute = 10
  private readonly resetIntervalMs = 60 * 1000 // 1 minute

  static getInstance(): QueryInvalidationCircuitBreaker {
    if (!QueryInvalidationCircuitBreaker.instance) {
      QueryInvalidationCircuitBreaker.instance = new QueryInvalidationCircuitBreaker()
    }
    return QueryInvalidationCircuitBreaker.instance
  }

  shouldAllowInvalidation(queryKey: string): boolean {
    const now = Date.now()
    const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : queryKey
    
    const record = this.invalidationCounts.get(keyStr)
    
    if (!record || (now - record.lastReset) > this.resetIntervalMs) {
      // First invalidation or reset period expired
      this.invalidationCounts.set(keyStr, {
        count: 1,
        lastReset: now
      })
      return true
    }

    if (record.count >= this.maxInvalidationsPerMinute) {
      logger.warn('Query invalidation circuit breaker triggered', {
        queryKey: keyStr,
        count: record.count,
        maxAllowed: this.maxInvalidationsPerMinute
      })
      return false
    }

    // Increment count
    record.count++
    return true
  }

  reset(queryKey?: string): void {
    if (queryKey) {
      const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : queryKey
      this.invalidationCounts.delete(keyStr)
    } else {
      this.invalidationCounts.clear()
    }
  }

  getStats(): Record<string, { count: number; lastReset: number }> {
    return Object.fromEntries(this.invalidationCounts)
  }
}

/**
 * Debounced query invalidation to prevent excessive refetches
 */
class DebouncedQueryInvalidator {
  private static instance: DebouncedQueryInvalidator
  private pendingInvalidations = new Map<string, NodeJS.Timeout>()
  private readonly debounceMs = 300

  static getInstance(): DebouncedQueryInvalidator {
    if (!DebouncedQueryInvalidator.instance) {
      DebouncedQueryInvalidator.instance = new DebouncedQueryInvalidator()
    }
    return DebouncedQueryInvalidator.instance
  }

  scheduleInvalidation(
    queryClient: ReturnType<typeof useQueryClient>,
    queryKey: unknown[],
    options?: {
      exact?: boolean
      refetchType?: 'active' | 'inactive' | 'all'
    }
  ): void {
    const keyStr = queryKey.join(':')
    const circuitBreaker = QueryInvalidationCircuitBreaker.getInstance()

    // Clear existing timeout
    const existingTimeout = this.pendingInvalidations.get(keyStr)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Schedule new invalidation
    const timeout = setTimeout(() => {
      if (circuitBreaker.shouldAllowInvalidation(keyStr)) {
        try {
          queryClient.invalidateQueries({
            queryKey,
            exact: options?.exact ?? true,
            refetchType: options?.refetchType ?? 'active'
          })
          
          logger.debug('Query invalidated', { queryKey: keyStr })
        } catch (error) {
          logger.error('Query invalidation failed', {
            queryKey: keyStr,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      this.pendingInvalidations.delete(keyStr)
    }, this.debounceMs)

    this.pendingInvalidations.set(keyStr, timeout)
  }

  cancelInvalidation(queryKey: unknown[]): void {
    const keyStr = queryKey.join(':')
    const timeout = this.pendingInvalidations.get(keyStr)
    
    if (timeout) {
      clearTimeout(timeout)
      this.pendingInvalidations.delete(keyStr)
    }
  }

  flush(): void {
    // Execute all pending invalidations immediately
    this.pendingInvalidations.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.pendingInvalidations.clear()
  }
}

/**
 * Hook for optimized query invalidation with circuit breaker and debouncing
 */
export const useOptimizedQueryInvalidation = () => {
  const queryClient = useQueryClient()
  const debouncedInvalidator = DebouncedQueryInvalidator.getInstance()
  const circuitBreaker = QueryInvalidationCircuitBreaker.getInstance()

  const invalidateQueries = useCallback((
    queryKey: unknown[],
    options?: {
      exact?: boolean
      refetchType?: 'active' | 'inactive' | 'all'
      immediate?: boolean
    }
  ) => {
    if (options?.immediate) {
      // Immediate invalidation (bypass debouncing)
      const keyStr = queryKey.join(':')
      if (circuitBreaker.shouldAllowInvalidation(keyStr)) {
        queryClient.invalidateQueries({
          queryKey,
          exact: options?.exact ?? true,
          refetchType: options?.refetchType ?? 'active'
        })
      }
    } else {
      // Debounced invalidation
      debouncedInvalidator.scheduleInvalidation(queryClient, queryKey, options)
    }
  }, [queryClient, debouncedInvalidator, circuitBreaker])

  const cancelInvalidation = useCallback((queryKey: unknown[]) => {
    debouncedInvalidator.cancelInvalidation(queryKey)
  }, [debouncedInvalidator])

  const resetCircuitBreaker = useCallback((queryKey?: string) => {
    circuitBreaker.reset(queryKey)
  }, [circuitBreaker])

  const getInvalidationStats = useCallback(() => {
    return circuitBreaker.getStats()
  }, [circuitBreaker])

  return {
    invalidateQueries,
    cancelInvalidation,
    resetCircuitBreaker,
    getInvalidationStats
  }
}

/**
 * Hook for tracking query performance metrics
 */
export const useQueryPerformanceTracker = () => {
  const metricsRef = useRef({
    queryCount: 0,
    invalidationCount: 0,
    errorCount: 0,
    averageQueryTime: 0,
    slowQueries: [] as Array<{ queryKey: string; duration: number; timestamp: number }>
  })

  const trackQuery = useCallback((queryKey: unknown[], duration: number) => {
    const metrics = metricsRef.current
    const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)

    metrics.queryCount++
    metrics.averageQueryTime = (metrics.averageQueryTime + duration) / 2

    // Track slow queries (>1000ms)
    if (duration > 1000) {
      metrics.slowQueries.push({
        queryKey: keyStr,
        duration,
        timestamp: Date.now()
      })

      // Keep only last 10 slow queries
      if (metrics.slowQueries.length > 10) {
        metrics.slowQueries.shift()
      }

      logger.warn('Slow query detected', {
        queryKey: keyStr,
        duration: `${duration}ms`
      })
    }
  }, [])

  const trackInvalidation = useCallback((queryKey: unknown[]) => {
    metricsRef.current.invalidationCount++
    
    const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)
    logger.debug('Query invalidation tracked', { queryKey: keyStr })
  }, [])

  const trackError = useCallback((queryKey: unknown[], error: Error) => {
    metricsRef.current.errorCount++
    
    const keyStr = Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)
    logger.error('Query error tracked', {
      queryKey: keyStr,
      error: error.message
    })
  }, [])

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current }
  }, [])

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      queryCount: 0,
      invalidationCount: 0,
      errorCount: 0,
      averageQueryTime: 0,
      slowQueries: []
    }
  }, [])

  return {
    trackQuery,
    trackInvalidation,
    trackError,
    getMetrics,
    resetMetrics
  }
}

/**
 * Enhanced debounce utility with cancellation support
 */
export function createDebouncedFunction<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  const debouncedFunc = ((...args: Parameters<T>) => {
    lastArgs = args
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
  }) as T & { cancel: () => void; flush: () => void }

  debouncedFunc.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  debouncedFunc.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId)
      func(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return debouncedFunc
} 