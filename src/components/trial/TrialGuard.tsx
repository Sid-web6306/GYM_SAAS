'use client'

import { ReactNode } from 'react'
import { 
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicButton,
  DynamicCrown,
  DynamicUsers,
  DynamicLock,
  DynamicAlertTriangle,
  DynamicArrowRight,
  DynamicZap,
  DynamicLink
} from '@/lib/dynamic-imports'
import { 
  useTrialInfo,
  hasActiveSubscription, 
  isTrialActive 
} from '@/hooks/use-trial'
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments'

interface TrialGuardProps {
  children: ReactNode
  feature: string
  description?: string
  requiredPlan?: 'Professional' | 'Enterprise'
  memberLimit?: number
  fallback?: ReactNode
  showUpgrade?: boolean
}

export function TrialGuard({
  children,
  feature,
  description,
  requiredPlan,
  memberLimit,
  fallback,
  showUpgrade = true
}: TrialGuardProps) {
  const { data: trialInfo, isLoading: trialLoading } = useTrialInfo()
  const { currentSubscription: subscriptionInfo, hasAccess, isLoading } = useSimplifiedPaymentSystem()
  const subscriptionLoading = isLoading
  const accessLoading = isLoading

  if (trialLoading || subscriptionLoading || accessLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (!trialInfo) {
    return (
      <DynamicCard className="border-red-200 bg-red-50">
        <DynamicCardContent className="p-6">
          <div className="flex items-center gap-3">
            <DynamicAlertTriangle className="h-6 w-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Unable to verify access</p>
              <p className="text-sm text-red-600">Please refresh the page or contact support.</p>
            </div>
          </div>
        </DynamicCardContent>
      </DynamicCard>
    )
  }

  const hasSubscription = hasActiveSubscription(subscriptionInfo || null)
  const trialActive = isTrialActive(trialInfo)

  // Check access based on subscription status and trial
  const hasFeatureAccess = hasAccess && (hasSubscription || trialActive)

  // If user has access, render children
  if (hasFeatureAccess) {
    return <>{children}</>
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default blocked access UI
  const getBlockedReason = () => {
    if (!trialActive && !hasSubscription) {
      return {
        title: 'Trial Expired',
        description: 'Your free trial has ended. Upgrade to continue using this feature.',
        icon: DynamicAlertTriangle,
        color: 'red',
        urgency: 'high'
      }
    }
    
    if (requiredPlan && !hasSubscription) {
      return {
        title: `${requiredPlan} Plan Required`,
        description: `This feature is only available on the ${requiredPlan} plan or higher.`,
        icon: DynamicCrown,
        color: 'purple',
        urgency: 'medium'
      }
    }

    if (memberLimit && trialActive) {
      return {
        title: 'Member Limit Reached',
        description: `Free trial is limited to ${memberLimit} members. Upgrade to add more.`,
        icon: DynamicUsers,
        color: 'orange',
        urgency: 'medium'
      }
    }

    return {
      title: 'Premium Feature',
      description: 'This feature requires an active subscription.',
      icon: DynamicLock,
      color: 'gray',
      urgency: 'low'
    }
  }

  const blockInfo = getBlockedReason()
  const Icon = blockInfo.icon

  return (
    <DynamicCard className={`
      ${blockInfo.color === 'red' ? 'border-red-200 bg-red-50' : ''}
      ${blockInfo.color === 'purple' ? 'border-purple-200 bg-purple-50' : ''}
      ${blockInfo.color === 'orange' ? 'border-orange-200 bg-orange-50' : ''}
      ${blockInfo.color === 'gray' ? 'border-gray-200 bg-gray-50' : ''}
    `}>
      <DynamicCardHeader className="text-center">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          blockInfo.color === 'red' ? 'bg-red-100' : 
          blockInfo.color === 'purple' ? 'bg-purple-100' : 
          blockInfo.color === 'orange' ? 'bg-orange-100' : 
          'bg-gray-100'
        }`}>
          <Icon className={`w-6 h-6 ${
            blockInfo.color === 'red' ? 'text-red-600' : 
            blockInfo.color === 'purple' ? 'text-purple-600' : 
            blockInfo.color === 'orange' ? 'text-orange-600' : 
            'text-gray-600'
          }`} />
        </div>
        <DynamicCardTitle className={`${
          blockInfo.color === 'red' ? 'text-red-900' : 
          blockInfo.color === 'purple' ? 'text-purple-900' : 
          blockInfo.color === 'orange' ? 'text-orange-900' : 
          'text-gray-900'
        }`}>
          {blockInfo.title}
        </DynamicCardTitle>
        <DynamicCardDescription className={`${
          blockInfo.color === 'red' ? 'text-red-700' : 
          blockInfo.color === 'purple' ? 'text-purple-700' : 
          blockInfo.color === 'orange' ? 'text-orange-700' : 
          'text-gray-700'
        }`}>
          {description || blockInfo.description}
        </DynamicCardDescription>
      </DynamicCardHeader>
      <DynamicCardContent className="text-center space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">&ldquo;{feature}&rdquo; Feature</h4>
          <p className="text-sm text-muted-foreground">
            Unlock this feature and many more with a subscription plan.
          </p>
        </div>

        {showUpgrade && (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <DynamicLink href="/upgrade">
              <DynamicButton 
                className={`gap-2 ${
                  blockInfo.urgency === 'high' ? 'bg-red-600 hover:bg-red-700' : 
                  blockInfo.urgency === 'medium' ? 'bg-purple-600 hover:bg-purple-700' : 
                  'bg-primary hover:bg-primary/90'
                }`}
              >
                <DynamicCrown className="w-4 h-4" />
                {blockInfo.urgency === 'high' ? 'Renew Subscription' : 'Upgrade Now'}
                <DynamicArrowRight className="w-4 h-4" />
              </DynamicButton>
            </DynamicLink>
            <DynamicLink href="/settings?tab=subscription">
              <DynamicButton variant="outline" size="sm">
                <DynamicZap className="w-4 h-4 mr-2" />
                View Plans
              </DynamicButton>
            </DynamicLink>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {hasSubscription ? (
              'Feature not included in current plan'
            ) : trialActive ? (
              `${trialInfo.days_remaining} days left in trial`
            ) : (
              'Start your subscription to access all features'
            )}
          </p>
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )
} 