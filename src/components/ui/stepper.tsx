'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full px-4', className)}>
      <ol role="list" className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = currentStep > stepNumber
          const isCurrent = currentStep === stepNumber
          const isUpcoming = currentStep < stepNumber
          const isLastStep = index === steps.length - 1

          return (
            <React.Fragment key={step.id}>
              {/* Step container */}
              <li className="flex flex-col items-center gap-2 flex-shrink-0">
                {/* Step circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isCurrent && 'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/10 scale-110',
                    isUpcoming && 'border-muted-foreground/30 bg-background text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-bold">{stepNumber}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="text-center max-w-[120px]">
                  <div
                    className={cn(
                      'text-sm font-medium transition-colors duration-300 leading-tight',
                      (isCompleted || isCurrent) && 'text-foreground font-semibold',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div 
                      className={cn(
                        'mt-1 text-xs leading-tight hidden sm:block transition-colors duration-300',
                        (isCompleted || isCurrent) && 'text-muted-foreground',
                        isUpcoming && 'text-muted-foreground/60'
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </li>

              {/* Connector line - symmetrically placed between steps */}
              {!isLastStep && (
                <div 
                  className="flex-1 h-[2px] mx-1 relative self-start mt-5"
                  aria-hidden="true"
                >
                  <div 
                    className={cn(
                      'absolute inset-0 transition-all duration-500 ease-out',
                      (isCompleted || (isCurrent && index < currentStep - 1)) 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

// Vertical stepper variant
interface VerticalStepperProps extends StepperProps {
  onStepClick?: (stepNumber: number) => void
  allowClickingCompletedSteps?: boolean
}

export function VerticalStepper({ 
  steps, 
  currentStep, 
  className,
  onStepClick,
  allowClickingCompletedSteps = false
}: VerticalStepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol role="list" className="space-y-8">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = currentStep > stepNumber
          const isCurrent = currentStep === stepNumber
          const isUpcoming = currentStep < stepNumber
          const isLastStep = index === steps.length - 1
          const isClickable = allowClickingCompletedSteps && isCompleted && onStepClick

          return (
            <li key={step.id} className="relative">
              <div 
                className={cn(
                  'group relative flex items-start gap-4',
                  isClickable && 'cursor-pointer hover:opacity-80 transition-opacity'
                )}
                onClick={() => isClickable && onStepClick?.(stepNumber)}
              >
                {/* Connector line (hidden for last step) - centered on step circle */}
                {!isLastStep && (
                  <div 
                    className="absolute left-5 top-10 w-[2px] h-[calc(100%+1rem)]" 
                    aria-hidden="true"
                  >
                    <div 
                      className={cn(
                        'w-full h-full transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      )}
                    />
                  </div>
                )}

                {/* Step circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted && 'border-primary bg-primary text-primary-foreground shadow-sm',
                    isCurrent && 'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/10 scale-110',
                    isUpcoming && 'border-muted-foreground/30 bg-background text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-bold">{stepNumber}</span>
                  )}
                </div>

                {/* Step content */}
                <div className="min-w-0 flex-1 pt-1">
                  <div
                    className={cn(
                      'text-base font-medium transition-colors duration-300',
                      (isCompleted || isCurrent) && 'text-foreground font-semibold',
                      isUpcoming && 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div 
                      className={cn(
                        'mt-1 text-sm transition-colors duration-300',
                        (isCompleted || isCurrent) && 'text-muted-foreground',
                        isUpcoming && 'text-muted-foreground/60'
                      )}
                    >
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

