/**
 * Avatar utility functions for consistent avatar handling across the application
 */

// Available avatar colors for consistent theming
export const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-cyan-500'
] as const

export type AvatarColor = typeof AVATAR_COLORS[number]

/**
 * Generate initials from a name or email
 * @param name - User's full name
 * @param email - User's email address
 * @returns Generated initials (1-2 characters)
 */
export function generateInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const nameParts = name.trim().split(' ').filter(part => part.length > 0)
    
    if (nameParts.length >= 2) {
      // First and last name initials
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    } else if (nameParts.length === 1) {
      // Single name - use first character
      return nameParts[0][0].toUpperCase()
    }
  }
  
  if (email?.trim()) {
    return email.trim()[0].toUpperCase()
  }
  
  return 'U' // Default fallback
}

/**
 * Generate a consistent background color for an avatar based on text
 * @param text - Name, email, or other identifying text
 * @returns CSS class for background color
 */
export function generateAvatarColor(text?: string | null): AvatarColor {
  if (!text?.trim()) {
    return AVATAR_COLORS[0] // Default to first color
  }

  // Generate a simple hash from the text
  let hash = 0
  const cleanText = text.trim().toLowerCase()
  
  for (let i = 0; i < cleanText.length; i++) {
    hash = cleanText.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Use absolute value to ensure positive index
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[colorIndex]
}

/**
 * Generate avatar data for consistent display
 * @param params - Avatar generation parameters
 * @returns Object with initials and color
 */
export function generateAvatarData(params: {
  name?: string | null
  email?: string | null
  userId?: string
}) {
  const { name, email, userId } = params
  
  // Use userId for color generation if available for more consistency
  const colorText = userId || name || email || 'default'
  
  return {
    initials: generateInitials(name, email),
    color: generateAvatarColor(colorText),
    displayName: name || email?.split('@')[0] || 'User'
  }
}

/**
 * Validate if a URL is a valid avatar image URL
 * @param url - Image URL to validate
 * @returns Promise that resolves to boolean
 */
export function validateAvatarUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      resolve(false)
    }, 5000)
    
    img.onload = () => {
      clearTimeout(timeout)
      resolve(true)
    }
    
    img.onerror = () => {
      clearTimeout(timeout)
      resolve(false)
    }
    
    img.src = url
  })
}

/**
 * Get file extension from a filename
 * @param filename - Name of the file
 * @returns File extension or empty string
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Validate if file is an acceptable image type
 * @param file - File object to validate
 * @returns Object with validation result and error message
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!acceptedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
    }
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image file must be smaller than 5MB'
    }
  }
  
  return { isValid: true }
}

/**
 * Generate a unique filename for avatar uploads
 * @param userId - User's ID
 * @param originalFilename - Original filename
 * @returns Unique filename for storage
 */
export function generateAvatarFilename(userId: string, originalFilename: string): string {
  const extension = getFileExtension(originalFilename)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  
  return `${userId}-${timestamp}-${random}.${extension}`
}

/**
 * Avatar size configurations
 */
export const AVATAR_SIZES = {
  sm: { size: 'h-8 w-8', text: 'text-sm' },
  md: { size: 'h-10 w-10', text: 'text-base' },
  lg: { size: 'h-12 w-12', text: 'text-lg' },
  xl: { size: 'h-16 w-16', text: 'text-xl' }
} as const

export type AvatarSize = keyof typeof AVATAR_SIZES
