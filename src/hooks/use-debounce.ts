'use client'

import { useState, useEffect } from 'react'

/**
 * Hook that debounces a value by the specified delay.
 * Useful for search inputs and filters to prevent excessive API calls.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear the timeout if value changes before delay completes
    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook that debounces multiple values together.
 * Useful when multiple related filters should debounce as a group.
 * 
 * @param values - Object containing values to debounce together
 * @param delay - Delay in milliseconds
 * @returns The debounced values object
 */
export function useDebounceObject<T extends Record<string, string | number | boolean | null | undefined>>(
  values: T, 
  delay: number
): T {
  const [debouncedValues, setDebouncedValues] = useState<T>(values)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValues(values)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [values, delay])

  return debouncedValues
}
