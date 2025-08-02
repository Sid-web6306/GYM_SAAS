'use client'

import React, { useEffect } from 'react'
import { useAuth, useUpdateProfile } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toastActions } from '@/stores/toast-store'

// Form schema
const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export const ProfileTab = () => {
  const { user, profile } = useAuth()
  const updateProfileMutation = useUpdateProfile()

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      email: user?.email || '',
    },
  })

  // Populate form when data is available
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name || '',
        email: user?.email || '',
      })
    }
  }, [profile, user, profileForm])

  // Handle profile update
  const handleProfileUpdate = async (data: ProfileFormData) => {
    if (!user?.id) return

    try {
      await updateProfileMutation.mutateAsync({
        full_name: data.full_name,
      })
      toastActions.success('Profile Updated', 'Your profile has been updated successfully.')
    } catch (error) {
      console.error('Profile update error:', error)
      toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
        <CardDescription>
          Update your personal information and account details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                placeholder="Enter your full name"
                {...profileForm.register('full_name')}
              />
              {profileForm.formState.errors.full_name && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {profileForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                disabled
                {...profileForm.register('email')}
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">Account Status</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Account verified and active
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={updateProfileMutation.isPending}
              className="min-w-[120px]"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 