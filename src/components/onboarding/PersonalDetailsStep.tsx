'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface PersonalDetailsStepProps {
  initialValue?: string
  onNext: (fullName: string) => void
  onBack?: () => void
  userEmail?: string
  userPhone?: string
}

const PersonalDetailsSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
})

type PersonalDetailsFormData = z.infer<typeof PersonalDetailsSchema>

export function PersonalDetailsStep({ 
  initialValue = '', 
  onNext,
  onBack,
  userEmail,
  userPhone
}: PersonalDetailsStepProps) {
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PersonalDetailsFormData>({
    resolver: zodResolver(PersonalDetailsSchema),
    defaultValues: {
      fullName: initialValue
    }
  })

  // Reset form when initialValue changes (e.g., when going back)
  useEffect(() => {
    form.reset({ fullName: initialValue })
  }, [initialValue, form])

  const handleSubmit = async (data: PersonalDetailsFormData) => {
    setIsSubmitting(true)
    
    // Small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 300))
    
    onNext(data.fullName.trim())
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center space-y-2 pb-4">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Welcome! 👋</h3>
        <p className="text-gray-600">Let&apos;s start by getting to know you better</p>
      </div>

      {/* Contact Info Display */}
      {(userEmail || userPhone) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900">Signed up with:</p>
          {userEmail && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <span className="font-mono bg-white px-2 py-1 rounded border border-blue-200">
                {userEmail}
              </span>
            </div>
          )}
          {userPhone && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <span className="font-mono bg-white px-2 py-1 rounded border border-blue-200">
                {userPhone}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Full Name Input */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-base font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          What&apos;s your full name? *
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          {...form.register('fullName')}
          disabled={isSubmitting}
          autoFocus
          className="text-lg py-6"
        />
        {form.formState.errors.fullName && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            {form.formState.errors.fullName.message}
          </p>
        )}
        <p className="text-sm text-gray-500">
          This will be displayed on your profile and visible to your team
        </p>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full py-6 text-base font-semibold"
        disabled={isSubmitting || !form.formState.isValid}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
            Saving...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      {/* Back Button - only show if onBack is provided */}
      {onBack && (
        <Button 
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full py-6 text-base font-semibold"
        >
          Back
        </Button>
      )}

      {/* Help Text */}
      <p className="text-center text-sm text-gray-500">
        Step 1 of 2 • Personal Information
      </p>
    </form>
  )
}

