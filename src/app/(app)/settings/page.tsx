'use client'

import React, { useEffect, useTransition, useDeferredValue } from 'react'
import { useAuth, useUpdateProfile } from '@/hooks/use-auth'
import { EmailUpdateDialog } from '@/components/settings/EmailUpdateDialog'
import { useUpdateGym, useGymData, useGymOwner } from '@/hooks/use-gym-data'
import { logger } from '@/lib/logger'
import { useSettingsStore } from '@/stores/settings-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Building2, 
  Save,
  AlertCircle,
  CheckCircle,
  Settings,
  Palette,
  CreditCard,
  Crown
} from 'lucide-react'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toastActions } from '@/stores/toast-store'

import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleContextIndicator } from '@/components/layout/RoleContextIndicator'
import { GymSettingsGuard, BillingGuard, AccessDenied } from '@/components/rbac/rbac-guards'
import { 
  ProfileSectionSkeleton,
  FormFieldSkeleton 
} from '@/components/ui/skeletons'
// Form schemas
// const phoneE164Regex = /^\+?[1-9]\d{1,14}$/

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
})

const gymSchema = z.object({
  name: z.string().min(2, 'Gym name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
})

type ProfileFormData = z.infer<typeof profileSchema>
type GymFormData = z.infer<typeof gymSchema>
// Password schema removed - using passwordless authentication

const SettingsPage = () => {
  const { user, profile, hasGym } = useAuth()
  const updateProfileMutation = useUpdateProfile()
  const updateGymMutation = useUpdateGym()
  
  // Email update dialog state
  const [isEmailUpdateOpen, setIsEmailUpdateOpen] = React.useState(false)
  
  // Preload heavy tabs for better performance
  useTabPreloading()
  
  // Get gym data for populating the form
  const { data: gymData, isLoading: gymLoading } = useGymData(profile?.gym_id || null)
  
  // Get gym owner information (only if user is not the owner)
  const { data: gymOwner } = useGymOwner(profile?.gym_id || null)
  
  const { selectedTab, setSelectedTab } = useSettingsStore()
  const [, startTransition] = useTransition()
  const deferredTab = useDeferredValue(selectedTab)

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      email: user?.email || '',
    },
  })

  // Gym form
  const gymForm = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
    defaultValues: {
      name: '',
    },
  })

  // Populate forms when data is available
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name || '',
        email: user?.email || ''
      })
    }
  }, [profile, user, profileForm])

  useEffect(() => {
    if (gymData) {
      gymForm.reset({
        name: gymData.name || '',
      })
    }
  }, [gymData, gymForm])

  // Handle profile update
  const handleProfileUpdate = async (data: ProfileFormData) => {
    if (!user?.id) return

    try {
      await updateProfileMutation.mutateAsync({
        full_name: data.full_name,
      })
      toastActions.success('Profile Updated', 'Your profile has been updated successfully.')
    } catch (error) {
      logger.error('Profile update error:', { error })
      toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
    }
  }

  // Handle gym update
  const handleGymUpdate = async (data: GymFormData) => {
    if (!profile?.gym_id) return

    try {
      await updateGymMutation.mutateAsync({
        gymId: profile.gym_id,
        updates: {
          name: data.name,
        }
      })
      toastActions.success('Gym Updated', 'Your gym information has been updated successfully.')
    } catch (error) {
      logger.error('Gym update error:', {error})
      toastActions.error('Update Failed', 'Failed to update gym information. Please try again.')
    }
  }


  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'gym' as const, label: 'Gym Settings', icon: Building2, guard: 'gym' },
    { id: 'subscription' as const, label: 'Subscription', icon: CreditCard, guard: 'billing' },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        showGymContext={true}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-[240px] lg:flex-none">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setSelectedTab(tab.id))}
                onMouseEnter={() => preloadOnHover(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors cursor-pointer w-full lg:w-[220px] ${
                  selectedTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {deferredTab === 'profile' && (
            !user || !profile ? (
              <ProfileSectionSkeleton />
            ) : (
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
                {/* Avatar Upload Section */}
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium mb-4">Profile Picture</h3>
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url}
                    userId={user?.id || ''}
                    name={profile?.full_name}
                    email={user?.email}
                  />
                </div>

                <Separator />

                {/* Role & Gym Context Section - moved to top for better context */}
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Role & Access Information
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Current Role */}
                    <div className="space-y-2">
                      <Label>Current Role</Label>
                      <div className="flex items-center gap-2">
                        <RoleContextIndicator variant="chip" showGym={false} />
                      </div>
                    </div>

                    {/* Current Gym */}
                    <div className="space-y-2">
                      <Label>Current Gym</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {gymData?.name || 'Loading...'}
                          </span>
                        </div>
                        
                        {/* Show gym owner info if user is not the owner */}
                        {gymOwner && !profile?.is_gym_owner && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                            <Crown className="w-4 h-4" />
                            <span className="text-sm">
                              <span className="font-medium">Owner:</span>{' '}
                              {gymOwner.full_name || gymOwner.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Profile form */}
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
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          disabled
                          {...profileForm.register('email')}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEmailUpdateOpen(true)}
                          className="shrink-0"
                        >
                          Update
                        </Button>
                      </div>
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
          )}

          {deferredTab === 'gym' && (
            <GymSettingsGuard action="update" fallback={
              <div className="p-8">
                <AccessDenied 
                  message="Gym settings can only be modified by gym owners. Contact your gym owner if you need to make changes." 
                />
              </div>
            }>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Gym Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your gym information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {gymLoading ? (
                    <div className="space-y-6">
                      <FormFieldSkeleton />
                      <FormFieldSkeleton />
                      <div className="flex justify-end">
                        <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
                      </div>
                    </div>
                  ) : hasGym ? (
                  <form onSubmit={gymForm.handleSubmit(handleGymUpdate)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="gym_name">Gym Name</Label>
                      <Input
                        id="gym_name"
                        placeholder="Enter your gym name"
                        disabled={false}
                        {...gymForm.register('name')}
                      />
                     {gymForm.formState.errors.name && (
                       <p className="text-sm text-destructive flex items-center gap-1">
                         <AlertCircle className="h-4 w-4" />
                         {gymForm.formState.errors.name.message}
                       </p>
                     )}
                     <p className="text-sm text-muted-foreground">
                       This name will be displayed throughout the application
                     </p>
                   </div>

                   <Separator />

                   <div className="flex items-center justify-between">
                     <div className="space-y-1">
                       <h3 className="font-medium">Gym Status</h3>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <CheckCircle className="h-4 w-4 text-green-600" />
                         Gym setup complete
                       </div>
                     </div>
                     <Button 
                       type="submit" 
                       disabled={updateGymMutation.isPending}
                       className="min-w-[120px]"
                     >
                       {updateGymMutation.isPending ? (
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
               ) : (
                 <div className="text-center py-8">
                   <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                   <h3 className="text-lg font-semibold mb-2">No Gym Setup</h3>
                   <p className="text-muted-foreground mb-4">
                     Complete your gym setup to manage gym settings
                   </p>
                   <Button>Complete Gym Setup</Button>
                   </div>
                  )}
                </CardContent>
              </Card>
            </GymSettingsGuard>
          )}

          {/* Team tab removed; moved to main Team page */}

          {deferredTab === 'subscription' && (
            <BillingGuard action="read" fallback={
              <div className="p-8">
                <AccessDenied 
                  message="Subscription details are only available to gym owners. Contact your gym owner for billing and subscription access." 
                />
              </div>
            }>
              <LazySubscriptionTab />
            </BillingGuard>
          )}

          {deferredTab === 'appearance' && (
            <LazyAppearanceTab />
          )}


       </div>
     </div>
     
     {/* Email Update Dialog */}
     <EmailUpdateDialog
       isOpen={isEmailUpdateOpen}
       onClose={() => setIsEmailUpdateOpen(false)}
       currentEmail={user?.email || ''}
       onEmailUpdated={() => {
         // Small delay to ensure the data is updated before resetting the form
         setTimeout(() => {
           profileForm.reset({
             full_name: profile?.full_name || '',
             email: user?.email || ''
           })
         }, 200)
       }}
     />
   </div>
 )
}

// Preload important tabs for faster transitions
const LazyAppearanceTab = dynamic(
  () => import('@/components/settings/AppearanceTab').then((m) => m.AppearanceTab),
  { 
    ssr: false, 
    loading: () => <div className="p-8 text-muted-foreground">Loading appearance settings...</div>
  }
)

const LazySubscriptionTab = dynamic(
  () => import('@/components/settings/SubscriptionTab').then((m) => m.SubscriptionTab),
  { 
    ssr: false, 
    loading: () => <div className="p-8 text-muted-foreground">Loading subscription details...</div>
  }
)

// Preload hook for better tab performance
function useTabPreloading() {
  useEffect(() => {
    // Preload heavy tabs after initial render for faster transitions
    const preloadTimer = setTimeout(() => {
      import('@/components/settings/AppearanceTab').catch(() => {})
      import('@/components/settings/SubscriptionTab').catch(() => {})
    }, 1500) // Delay to not interfere with initial page load

    return () => clearTimeout(preloadTimer)
  }, [])
}

// Hover preloading for instant tab switches
const preloadOnHover = (tabId: string) => {
  if (tabId === 'appearance') {
    import('@/components/settings/AppearanceTab').catch(() => {})
  } else if (tabId === 'subscription') {
    import('@/components/settings/SubscriptionTab').catch(() => {})
  }
}

export default SettingsPage