'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Camera, Upload, X, Loader2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/ui/user-avatar'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'
import { toastActions } from '@/stores/toast-store'
import { validateImageFile, generateAvatarFilename, type AvatarSize } from '@/lib/avatar-utils'
import { useUpdateProfile } from '@/hooks/use-auth'
import { ImageEditor } from '@/components/ui/image-editor'
import { logger } from '@/lib/logger'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userId: string
  name?: string | null
  email?: string | null
  size?: AvatarSize
  className?: string
}

export function AvatarUpload({
  currentAvatarUrl,
  userId,
  name,
  email,
  size = 'xl',
  className
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const updateProfileMutation = useUpdateProfile()

  // Helper function to extract file path from storage URL
  const extractPathFromStorageUrl = (url: string): string | null => {
    try {
      // Supabase storage URLs have format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlParts = url.split('/storage/v1/object/public/user-uploads/')
      if (urlParts.length === 2) {
        return decodeURIComponent(urlParts[1])
      }
      return null
    } catch (error) {
      console.error('Failed to extract path from storage URL:', error)
      return null
    }
  }

  // Helper function to safely delete old avatar from storage
  const deleteOldAvatar = async (avatarUrl: string | null): Promise<void> => {
    if (!avatarUrl) return

    try {
      const filePath = extractPathFromStorageUrl(avatarUrl)
      if (!filePath) {
        logger.warn('Could not extract file path from avatar URL:', {avatarUrl})
        return
      }

      const { error } = await supabase.storage
        .from('user-uploads')
        .remove([filePath])

      if (error) {
        logger.warn('Failed to delete old avatar file:', {error: error.message})
        // Don't throw - cleanup failure shouldn't break the main flow
      } else {
        console.log('Successfully deleted old avatar:', filePath)
      }
    } catch (error) {
      logger.warn('Error during avatar cleanup:', {error})
      // Don't throw - cleanup failure shouldn't break the main flow
    }
  }

  // Cleanup URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      if (originalUrl) {
        URL.revokeObjectURL(originalUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file using utility function
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toastActions.error('Invalid File', validation.error || 'Please select a valid image file.')
      return
    }

    // Store original file and create URL for editor
    setOriginalFile(file)
    const url = URL.createObjectURL(file)
    setOriginalUrl(url)
    setIsEditorOpen(true)

    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      // 🧹 Clean up old avatar before uploading new one
      if (currentAvatarUrl) {
        await deleteOldAvatar(currentAvatarUrl)
      }

      // Generate unique filename and user-specific path
      const fileName = generateAvatarFilename(userId, file.name)
      const filePath = `${userId}/avatars/${fileName}`

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        console.error('Upload error:', error)
        
        // Provide specific error messages based on error type
        if (error.message?.includes('bucket') || error.message?.includes('not found')) {
          toastActions.error('Storage Not Configured', 'Avatar upload is not set up yet. Please contact your administrator.')
        } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
          toastActions.error('Permission Denied', 'You do not have permission to upload files. Please ensure you are logged in.')
        } else if (error.message?.includes('size') || error.message?.includes('too large')) {
          toastActions.error('File Too Large', 'Please select a smaller image file (max 5MB).')
        } else {
          toastActions.error('Upload Failed', `Failed to upload avatar: ${error.message}`)
        }
        
        setPreviewUrl(null)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath)

      // Update profile using optimized mutation (avoids unnecessary refetch)
      try {
        await updateProfileMutation.mutateAsync({ 
          avatar_url: publicUrl, 
          updated_at: new Date().toISOString() 
        })
        
        setPreviewUrl(null)
      } catch (updateError) {
        console.error('Profile update error:', updateError)
        toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
        
        // Clean up uploaded file
        await supabase.storage.from('user-uploads').remove([filePath])
        setPreviewUrl(null)
        return
      }

    } catch (error) {
      console.error('Avatar upload error:', error)
      toastActions.error('Upload Failed', 'An unexpected error occurred. Please try again.')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    try {
      setUploading(true)

      // 🧹 Delete avatar file from storage
      if (currentAvatarUrl) {
        await deleteOldAvatar(currentAvatarUrl)
      }

      // Update profile using optimized mutation (avoids unnecessary refetch)
      await updateProfileMutation.mutateAsync({ 
        avatar_url: null, 
        updated_at: new Date().toISOString() 
      })

    } catch (error) {
      console.error('Remove avatar error:', error)
      toastActions.error('Update Failed', 'Failed to remove avatar. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleEditorClose = () => {
    setIsEditorOpen(false)
    // Clean up object URL to prevent memory leaks
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl)
      setOriginalUrl(null)
    }
    setOriginalFile(null)
  }

  const handleEditorSave = (processedFile: File) => {
    setIsEditorOpen(false)
    // Clean up object URL
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl)
      setOriginalUrl(null)
    }
    setOriginalFile(null)
    
    // Create preview of processed file
    const previewUrl = URL.createObjectURL(processedFile)
    setPreviewUrl(previewUrl)
    
    // Upload the processed file
    uploadAvatar(processedFile)
  }

  const displayAvatarUrl = previewUrl || currentAvatarUrl
  const isLoading = uploading || updateProfileMutation.isPending

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      {/* Avatar Display */}
      <div className="relative group" style={{ padding: '2px' }}>
        {/* Custom border using box-shadow to stay contained */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'hsl(var(--border))',
            padding: '2px'
          }}
        >
          <div 
            className="w-full h-full rounded-full"
            style={{ background: 'hsl(var(--background))' }}
          />
        </div>
        <UserAvatar
          src={displayAvatarUrl}
          name={name}
          email={email}
          size={size}
          className="relative z-10 !ring-0 !ring-offset-0 !outline-0 !border-0 !shadow-none"
        />
        
        {/* Upload Overlay */}
        <div 
          className={cn(
            'absolute flex items-center justify-center rounded-full transition-opacity z-20',
            'bg-black/50 opacity-0 group-hover:opacity-100',
            isLoading && 'opacity-100'
          )}
          style={{ 
            top: '2px', 
            left: '2px', 
            right: '2px', 
            bottom: '2px' 
          }}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>

        {/* Click overlay */}
        <button
          onClick={triggerFileInput}
          disabled={isLoading}
          className="absolute rounded-full cursor-pointer z-30"
          style={{ 
            top: '2px', 
            left: '2px', 
            right: '2px', 
            bottom: '2px',
            outline: 'none',
            border: 'none',
            boxShadow: 'none'
          }}
          aria-label="Change profile picture"
          onFocus={(e) => {
            e.target.style.boxShadow = 'inset 0 0 0 2px hsl(var(--primary))';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={triggerFileInput}
          disabled={isLoading}
          size="sm"
          variant="outline"
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentAvatarUrl ? 'Change Photo' : 'Upload Photo'}
        </Button>

        {displayAvatarUrl && (
          <Button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        )}

        {currentAvatarUrl && (
          <Button
            type="button"
            onClick={removeAvatar}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isLoading}
      />

      {/* Upload guidelines */}
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        JPG, PNG or GIF. Max size 5MB. Recommended: Square image, at least 200x200px.
      </p>

      {/* Image Editor Modal */}
      {isEditorOpen && originalFile && originalUrl && (
        <ImageEditor
          isOpen={isEditorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          originalFile={originalFile}
          originalUrl={originalUrl}
        />
      )}

      {/* Avatar Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avatar Preview</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 p-4">
            {displayAvatarUrl ? (
              <div className="relative">
                <Image
                  src={displayAvatarUrl}
                  alt="Avatar preview"
                  width={256}
                  height={256}
                  className="w-64 h-64 rounded-full object-cover border-2 border-border"
                />
              </div>
            ) : (
              <div className="w-64 h-64 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <UserAvatar
                  src={null}
                  name={name}
                  email={email}
                  size="xl"
                  className="w-32 h-32 text-4xl"
                />
              </div>
            )}
            <div className="text-center">
              <p className="font-medium">{name}</p>
              {email && <p className="text-sm text-muted-foreground">{email}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
