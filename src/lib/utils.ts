import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to check if an error is a Next.js redirect error
export function isNextRedirectError(error: unknown): boolean {
  return (
    error instanceof Error && 
    (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))
  )
}

// Utility function to handle errors in try-catch blocks that should re-throw redirect errors
export function handleCatchError(error: unknown, fallbackMessage?: string): void {
  // Re-throw redirect errors so they can be handled properly by Next.js
  if (isNextRedirectError(error)) {
    throw error
  }
  
  // Log other errors
  console.error(fallbackMessage || 'Caught error:', error)
}
