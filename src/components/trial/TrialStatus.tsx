'use client'

import { 
  DynamicCard,
  DynamicCardContent,
  DynamicButton,
  DynamicBadge,
  DynamicTimer,
  DynamicCrown,
  DynamicAlertTriangle,
  DynamicCheckCircle,
  DynamicArrowRight,
  DynamicLink
} from '@/lib/dynamic-imports'
import { 
  useTrialInfo,
  isTrialExpiringSoon, 
  isTrialActive, 
  hasActiveSubscription,
  getSubscriptionStatusText,
  getSubscriptionStatusColor
} from '@/hooks/use-trial'
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments'

interface TrialStatusProps {
  variant?: 'card' | 'banner' | 'badge' | 'compact'
  showUpgradeButton?: boolean
  className?: string
}

export function TrialStatus({ 
  variant = 'card', 
  showUpgradeButton = true,
  className = '' 
}: TrialStatusProps) {
  const { data: trialInfo, isLoading: trialLoading } = useTrialInfo()
  const { currentSubscription: subscriptionInfo, isLoading: subscriptionLoading } = useSimplifiedPaymentSystem()

  if (trialLoading || subscriptionLoading || !trialInfo) {
    return null
  }

  const isExpiringSoon = isTrialExpiringSoon(trialInfo)
  const isActive = isTrialActive(trialInfo)
  const hasSubscription = hasActiveSubscription(subscriptionInfo || null)

  // Show subscription status if user has active subscription
  if (hasSubscription && subscriptionInfo) {
    if (variant === 'badge') {
      const statusColor = getSubscriptionStatusColor(subscriptionInfo.status)
      return (
        <DynamicBadge 
          variant="outline" 
          className={`
            ${statusColor === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : ''}
            ${statusColor === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : ''}
            ${statusColor === 'red' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}
            ${statusColor === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' : ''}
            ${statusColor === 'gray' ? 'bg-muted text-muted-foreground border-border' : ''}
            ${className}
          `}
        >
          <DynamicCheckCircle className="w-3 h-3 mr-1" />
          {getSubscriptionStatusText(subscriptionInfo.status)}
        </DynamicBadge>
      )
    }
    return null
  }

  const getStatusColor = () => {
    if (!isActive) return 'red'
    if (isExpiringSoon) return 'orange'
    return 'blue'
  }

  const getStatusIcon = () => {
    if (!isActive) return DynamicAlertTriangle
    if (isExpiringSoon) return DynamicTimer
    return DynamicTimer
  }

  const getStatusText = () => {
    if (!isActive) return 'Trial Expired'
    if (isExpiringSoon) return `${trialInfo.days_remaining} days left`
    return `${trialInfo.days_remaining} days remaining`
  }

  const color = getStatusColor()
  const Icon = getStatusIcon()
  const statusText = getStatusText()

  if (variant === 'badge') {
    return (
      <DynamicBadge 
        variant="outline" 
        className={`
          ${color === 'red' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}
          ${color === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' : ''}
          ${color === 'blue' ? 'bg-primary/10 text-primary border-primary/20' : ''}
          ${className}
        `}
      >
        <Icon className="w-3 h-3 mr-1" />
        {statusText}
      </DynamicBadge>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Icon className={`w-4 h-4 ${
          color === 'red' ? 'text-red-500' : 
          color === 'orange' ? 'text-orange-500' : 
          'text-primary'
        }`} />
        <span className={`text-sm font-medium ${
          color === 'red' ? 'text-red-700 dark:text-red-400' : 
          color === 'orange' ? 'text-orange-700 dark:text-orange-400' : 
          'text-primary'
        }`}>
          {statusText}
        </span>
        {showUpgradeButton && (
          <DynamicLink href="/upgrade">
            <DynamicButton size="sm" variant="outline" className="h-6 text-xs">
              Upgrade
            </DynamicButton>
          </DynamicLink>
        )}
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={`
        ${color === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : ''}
        ${color === 'orange' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' : ''}
        ${color === 'blue' ? 'bg-primary/5 border-primary/20' : ''}
        border rounded-lg p-4 ${className}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${
              color === 'red' ? 'text-red-500' : 
              color === 'orange' ? 'text-orange-500' : 
              'text-primary'
            }`} />
            <div>
              <p className={`font-medium ${
                color === 'red' ? 'text-red-800 dark:text-red-300' : 
                color === 'orange' ? 'text-orange-800 dark:text-orange-300' : 
                'text-primary'
              }`}>
                {!isActive ? 'Your trial has expired' : 
                 isExpiringSoon ? 'Trial expiring soon' : 
                 'Free trial active'}
              </p>
              <p className={`text-sm ${
                color === 'red' ? 'text-red-600 dark:text-red-400' : 
                color === 'orange' ? 'text-orange-600 dark:text-orange-400' : 
                'text-primary/80'
              }`}>
                {!isActive ? 'Upgrade now to continue using all features' :
                 `${statusText} in your free trial`}
              </p>
            </div>
          </div>
          {showUpgradeButton && (
            <DynamicLink href="/upgrade">
              <DynamicButton 
                variant={!isActive ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
              >
                <DynamicCrown className="w-4 h-4" />
                Upgrade Now
                <DynamicArrowRight className="w-4 h-4" />
              </DynamicButton>
            </DynamicLink>
          )}
        </div>
      </div>
    )
  }

  // Default card variant
  return (
    <DynamicCard className={`
      ${color === 'red' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : ''}
      ${color === 'orange' ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20' : ''}
      ${color === 'blue' ? 'border-primary/20 bg-primary/5' : ''}
      ${className}
    `}>
      <DynamicCardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              color === 'red' ? 'bg-red-100 dark:bg-red-800/50' : 
              color === 'orange' ? 'bg-orange-100 dark:bg-orange-800/50' : 
              'bg-primary/10'
            }`}>
              <Icon className={`w-4 h-4 ${
                color === 'red' ? 'text-red-600 dark:text-red-400' : 
                color === 'orange' ? 'text-orange-600 dark:text-orange-400' : 
                'text-primary'
              }`} />
            </div>
            <div>
              <h3 className={`font-semibold ${
                color === 'red' ? 'text-red-900 dark:text-red-200' : 
                color === 'orange' ? 'text-orange-900 dark:text-orange-200' : 
                'text-primary'
              }`}>
                {!isActive ? 'Trial Expired' : 
                 isExpiringSoon ? 'Trial Expiring Soon' : 
                 'Free Trial Active'}
              </h3>
              <p className={`text-sm ${
                color === 'red' ? 'text-red-700 dark:text-red-300' : 
                color === 'orange' ? 'text-orange-700 dark:text-orange-300' : 
                'text-primary/80'
              }`}>
                {!isActive ? 'Upgrade to continue using all features' :
                 `${statusText} to explore all features`}
              </p>
            </div>
          </div>
          {showUpgradeButton && (
            <DynamicLink href="/upgrade">
              <DynamicButton 
                variant={!isActive ? 'default' : 'outline'}
                size="sm"
                className={`gap-2 ${
                  color === 'red' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' : 
                  color === 'orange' ? 'border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white dark:border-orange-400 dark:text-orange-400' : 
                  'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                }`}
              >
                <DynamicCrown className="w-4 h-4" />
                Upgrade Now
              </DynamicButton>
            </DynamicLink>
          )}
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )
} 