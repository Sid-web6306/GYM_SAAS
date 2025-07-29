'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useUpdateGym, useGymData } from '@/hooks/use-gym-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Save,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toastActions } from '@/stores/toast-store'

// Form schema
const gymSchema = z.object({
  name: z.string().min(2, 'Gym name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
})

type GymFormData = z.infer<typeof gymSchema>

export const GymTab = () => {
  const { profile, hasGym } = useAuth()
  const updateGymMutation = useUpdateGym()
  
  // Get gym data for populating the form
  const { data: gymData, isLoading: gymLoading } = useGymData(profile?.gym_id || null)

  // Gym form
  const gymForm = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
    defaultValues: {
      name: '',
    },
  })

  // Populate form when gym data is available
  useEffect(() => {
    if (gymData) {
      gymForm.reset({
        name: gymData.name || '',
      })
    }
  }, [gymData, gymForm])

  // Handle gym update
  const handleGymUpdate = async (data: GymFormData) => {
    if (!profile?.gym_id) return

    try {
      await updateGymMutation.mutateAsync({
        gymId: profile.gym_id,
        updates: {
          name: data.name,
        },
      })
      toastActions.success('Gym Updated', 'Your gym information has been updated successfully.')
    } catch (error) {
      console.error('Gym update error:', error)
      toastActions.error('Update Failed', 'Failed to update gym information. Please try again.')
    }
  }

  return (
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
  )
} 