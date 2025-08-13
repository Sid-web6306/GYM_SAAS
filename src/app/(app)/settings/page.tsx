'use client'

import React, { useState, useEffect, useTransition, useDeferredValue } from 'react'
import { useAuth, useUpdateProfile } from '@/hooks/use-auth'
import { useUpdateGym, useGymData, useGymOwner } from '@/hooks/use-gym-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Building2, 
  Lock, 
  Mail, 
  Save,
  AlertCircle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  Palette,
  CreditCard,
  Crown
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toastActions } from '@/stores/toast-store'
import { changePassword } from '@/actions/auth.actions'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleContextIndicator } from '@/components/layout/RoleContextIndicator'
import { GymSettingsGuard, BillingGuard, AccessDenied } from '@/components/rbac/rbac-guards'
// Form schemas
const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
})

const gymSchema = z.object({
  name: z.string().min(2, 'Gym name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type GymFormData = z.infer<typeof gymSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

const SettingsPage = () => {
  const { user, profile, hasGym } = useAuth()
  const updateProfileMutation = useUpdateProfile()
  const updateGymMutation = useUpdateGym()
  
  // Get gym data for populating the form
  const { data: gymData, isLoading: gymLoading } = useGymData(profile?.gym_id || null)
  
  // Get gym owner information (only if user is not the owner)
  const { data: gymOwner } = useGymOwner(profile?.gym_id || null)
  
  const [selectedTab, setSelectedTab] = useState<'profile' | 'gym' | 'subscription' | 'appearance' | 'security'>('profile')
  const [, startTransition] = useTransition()
  const deferredTab = useDeferredValue(selectedTab)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Detect if user is using social authentication
  const authProvider = user?.app_metadata?.provider
  const isSocialAuth = authProvider && authProvider !== 'email'
  const providerName = authProvider === 'google' ? 'Google' : authProvider === 'facebook' ? 'Facebook' : authProvider

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
        email: user?.email || '',
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

  // Password form (only for email auth users)
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

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
      console.error('Gym update error:', error)
      toastActions.error('Update Failed', 'Failed to update gym information. Please try again.')
    }
  }

  // Handle password change (only for email auth users)
  const handlePasswordChange = async (data: PasswordFormData) => {
    try {
      const formData = new FormData()
      formData.append('currentPassword', data.currentPassword)
      formData.append('newPassword', data.newPassword)
      
      const result = await changePassword(null, formData)
      
      if (result.error) {
        toastActions.error('Password Change Failed', result.error)
      } else if (result.success) {
        toastActions.success('Password Changed', result.success)
        passwordForm.reset()
      }
    } catch (error) {
      console.error('Password change error:', error)
      toastActions.error('Update Failed', 'Failed to change password. Please try again.')
    }
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'gym' as const, label: 'Gym Settings', icon: Building2, guard: 'gym' },
    { id: 'subscription' as const, label: 'Subscription', icon: CreditCard, guard: 'billing' },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'security' as const, label: 'Security', icon: Lock },
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

                  {/* Role & Gym Context Section */}
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
                          <span className="text-sm text-muted-foreground">
                            Access Level: {profile?.default_role ? 
                              (profile.default_role === 'owner' ? '100' :
                               profile.default_role === 'manager' ? '75' :
                               profile.default_role === 'trainer' ? '60' :
                               profile.default_role === 'staff' ? '50' : '25') : 'N/A'}
                          </span>
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
          )}

          {deferredTab === 'gym' && (
            <GymSettingsGuard action="update" fallback={
              <div className="p-8">
                <AccessDenied 
                  message="Gym settings can only be modified by managers and gym owners. Contact your gym owner if you need to make changes." 
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
                  {hasGym ? (
                  <form onSubmit={gymForm.handleSubmit(handleGymUpdate)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="gym_name">Gym Name</Label>
                      <Input
                        id="gym_name"
                        placeholder="Enter your gym name"
                        disabled={gymLoading}
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
                  message="Subscription details are only available to staff members and above. Contact your gym manager for access." 
                />
              </div>
            }>
              <LazySubscriptionTab />
            </BillingGuard>
          )}

          {deferredTab === 'appearance' && (
            <LazyAppearanceTab />
          )}

          {deferredTab === 'security' && (
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Lock className="h-5 w-5" />
                 Security Settings
               </CardTitle>
               <CardDescription>
                 Manage your account security and authentication
               </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
               {/* Authentication Method Info */}
               <div className="space-y-4">
                 <h3 className="font-medium">Authentication Method</h3>
                 <div className="p-4 bg-muted/50 rounded-lg">
                   <div className="flex items-center gap-2 text-sm">
                     {isSocialAuth ? (
                       <>
                         <CheckCircle className="h-4 w-4 text-green-600" />
                         <span>You&apos;re signed in with <strong>{providerName}</strong></span>
                       </>
                     ) : (
                       <>
                         <CheckCircle className="h-4 w-4 text-green-600" />
                         <span>You&apos;re signed in with <strong>Email & Password</strong></span>
                       </>
                     )}
                   </div>
                   {isSocialAuth && (
                     <p className="text-sm text-muted-foreground mt-2">
                       Your account is secured by {providerName} authentication. No additional password setup is needed.
                     </p>
                   )}
                 </div>
               </div>

               <Separator />

               {/* Password Management - Only for email auth users */}
               {!isSocialAuth && (
                 <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-6">
                   <div className="space-y-4">
                     <h3 className="font-medium">Change Password</h3>
                     <p className="text-sm text-muted-foreground">
                       Update your current password for enhanced security.
                     </p>
                   </div>

                   <div className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="currentPassword">Current Password</Label>
                       <div className="relative">
                         <Input
                           id="currentPassword"
                           type={showCurrentPassword ? "text" : "password"}
                           placeholder="Enter your current password"
                           {...passwordForm.register('currentPassword')}
                         />
                         <button
                           type="button"
                           onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                         >
                           {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                         </button>
                       </div>
                       {passwordForm.formState.errors.currentPassword && (
                         <p className="text-sm text-destructive flex items-center gap-1">
                           <AlertCircle className="h-4 w-4" />
                           {passwordForm.formState.errors.currentPassword.message}
                         </p>
                       )}
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="newPassword">New Password</Label>
                       <div className="relative">
                         <Input
                           id="newPassword"
                           type={showNewPassword ? "text" : "password"}
                           placeholder="Enter your new password"
                           {...passwordForm.register('newPassword')}
                         />
                         <button
                           type="button"
                           onClick={() => setShowNewPassword(!showNewPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                         >
                           {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                         </button>
                       </div>
                       {passwordForm.formState.errors.newPassword && (
                         <p className="text-sm text-destructive flex items-center gap-1">
                           <AlertCircle className="h-4 w-4" />
                           {passwordForm.formState.errors.newPassword.message}
                         </p>
                       )}
                     </div>

                     <div className="space-y-2">
                       <Label htmlFor="confirmPassword">Confirm New Password</Label>
                       <div className="relative">
                         <Input
                           id="confirmPassword"
                           type={showConfirmPassword ? "text" : "password"}
                           placeholder="Confirm your new password"
                           {...passwordForm.register('confirmPassword')}
                         />
                         <button
                           type="button"
                           onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                         >
                           {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                         </button>
                       </div>
                       {passwordForm.formState.errors.confirmPassword && (
                         <p className="text-sm text-destructive flex items-center gap-1">
                           <AlertCircle className="h-4 w-4" />
                           {passwordForm.formState.errors.confirmPassword.message}
                         </p>
                       )}
                     </div>
                   </div>

                   <div className="flex justify-end">
                     <Button 
                       type="submit" 
                       className="min-w-[140px]"
                     >
                       <Lock className="h-4 w-4 mr-2" />
                       Change Password
                     </Button>
                   </div>
                 </form>
               )}

               <Separator />

               <div className="space-y-4">
                 <h3 className="font-medium">Account Security</h3>
                 <div className="grid gap-4 md:grid-cols-2">
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <Mail className="h-4 w-4 text-muted-foreground" />
                       <span className="text-sm font-medium">Email Verification</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <CheckCircle className="h-4 w-4 text-green-600" />
                       Email verified
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="flex items-center gap-2">
                       <Lock className="h-4 w-4 text-muted-foreground" />
                       <span className="text-sm font-medium">Authentication Status</span>
                     </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <CheckCircle className="h-4 w-4 text-green-600" />
                       {isSocialAuth ? `${providerName} authentication active` : 'Password protected'}
                     </div>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         )}
       </div>
     </div>
   </div>
 )
}

export default SettingsPage 

// Lazy-loaded heavy tabs for better responsiveness
const LazyAppearanceTab = dynamic(
  () => import('@/components/settings/AppearanceTab').then((m) => m.AppearanceTab),
  { ssr: false, loading: () => <div className="p-8 text-muted-foreground">Loading appearance settings...</div> }
)

const LazySubscriptionTab = dynamic(
  () => import('@/components/settings/SubscriptionTab').then((m) => m.SubscriptionTab),
  { ssr: false, loading: () => <div className="p-8 text-muted-foreground">Loading subscription details...</div> }
)