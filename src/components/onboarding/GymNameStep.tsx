'use client'

import * as React from 'react'
import { Building2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GymNameStepProps {
  onNext: (gymName: string) => void
  onBack?: () => void
  initialValue?: string
  isLoading?: boolean
}

export function GymNameStep({ onNext, onBack, initialValue = '', isLoading = false }: GymNameStepProps) {
  const [gymName, setGymName] = React.useState(initialValue)
  const [gymNameError, setGymNameError] = React.useState('')
  const [touched, setTouched] = React.useState(false)

  // Real-time validation
  const validateGymName = (value: string) => {
    if (!value.trim()) {
      return 'Gym name is required'
    }
    if (value.trim().length < 2) {
      return 'Gym name must be at least 2 characters'
    }
    if (value.trim().length > 50) {
      return 'Gym name must be less than 50 characters'
    }
    return ''
  }

  // Handle gym name changes with validation
  const handleGymNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGymName(value)
    
    if (touched) {
      setGymNameError(validateGymName(value))
    }
  }

  // Handle blur to show validation
  const handleGymNameBlur = () => {
    setTouched(true)
    setGymNameError(validateGymName(gymName))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const error = validateGymName(gymName)
    if (error) {
      setGymNameError(error)
      setTouched(true)
      return
    }

    onNext(gymName.trim())
  }

  const isValid = gymName.trim().length >= 2 && gymName.trim().length <= 50

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Building2 className="w-8 h-8 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Gym SaaS!</h2>
          <p className="text-gray-600 mt-2">
            Let&apos;s start by setting up your gym profile
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Name Your Gym</CardTitle>
          <CardDescription>
            Choose a name that represents your fitness business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gymName" className="text-base font-medium">
                Gym Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="gymName"
                name="gymName"
                type="text"
                placeholder="e.g., FitZone Gym, PowerHouse Fitness"
                value={gymName}
                onChange={handleGymNameChange}
                onBlur={handleGymNameBlur}
                className={`text-base transition-colors ${
                  gymNameError && touched 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : isValid && touched 
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                      : ''
                }`}
                required
                autoFocus
              />
              
              {/* Validation feedback */}
              {touched && (
                <div className="flex items-center gap-2 mt-2">
                  {gymNameError ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">{gymNameError}</span>
                    </>
                  ) : isValid ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Looks good!</span>
                    </>
                  ) : null}
                </div>
              )}
              
              {/* Character counter */}
              <div className="text-right">
                <span className={`text-xs ${
                  gymName.length > 45 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {gymName.length}/50 characters
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                type="submit" 
                size="lg"
                className="w-full transition-all duration-200" 
                disabled={!isValid || isLoading}
              >
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Setting up your gym...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </div>
              </Button>
              
              {/* Back Button - only show if onBack is provided */}
              {onBack && (
                <Button 
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onBack}
                  className="w-full"
                >
                  Back
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Help text */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-500">
          You can always change your gym name later in settings
        </p>
        <p className="text-xs text-blue-600">
          🎉 Your 14-day free trial starts when you complete setup!
        </p>
      </div>
    </div>
  )
}

