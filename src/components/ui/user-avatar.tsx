'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateAvatarData, AVATAR_SIZES, type AvatarSize } from '@/lib/avatar-utils'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  email?: string | null
  userId?: string
  size?: AvatarSize
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({ 
  src, 
  name, 
  email,
  userId,
  size = 'md', 
  className,
  fallbackClassName 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const avatarData = generateAvatarData({ name, email, userId })
  const sizeClasses = AVATAR_SIZES[size]
  
  // Reset error state when src changes
  useEffect(() => {
    if (src) {
      setImageError(false)
      setImageLoading(true)
    }
  }, [src])
  
  // Show image if src exists and no error occurred
  const showImage = src && !imageError
  
  const handleImageLoad = () => {
    setImageLoading(false)
  }
  
  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  return (
    <div 
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden',
        '!ring-0 !ring-offset-0 !outline-0 !border-0 !shadow-none', // Force no rings or borders
        sizeClasses.size,
        className
      )}
      style={{
        boxShadow: 'none !important',
        outline: 'none !important',
        border: 'none !important'
      }}
    >
      {showImage ? (
        <>
          {imageLoading && (
            <div className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full',
              avatarData.color,
              'text-white font-medium',
              sizeClasses.text
            )}>
              {avatarData.initials}
            </div>
          )}
          <Image
            src={src}
            alt={avatarData.displayName + ' avatar'}
            fill
            className="object-cover rounded-full"
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ boxShadow: 'none', outline: 'none', border: 'none' }}
          />
        </>
      ) : (
        <div className={cn(
          'flex items-center justify-center h-full w-full text-white font-medium rounded-full',
          avatarData.color,
          sizeClasses.text,
          fallbackClassName
        )}>
          {name || email ? avatarData.initials : <User className="h-1/2 w-1/2" />}
        </div>
      )}
    </div>
  )
}
