'use client'

import { useState } from 'react'
import { 
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicButton,
  DynamicBadge,
  DynamicSeparator,
  DynamicCrown,
  DynamicCreditCard,
  DynamicCheckCircle,
  DynamicUsers,
  DynamicSettings,
  DynamicX
} from '@/lib/dynamic-imports'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  useTrialInfo,
  hasActiveSubscription,
  getSubscriptionStatusText,
  getSubscriptionStatusColor,
  formatCurrency
} from '@/hooks/use-trial'
import { useSimplifiedPaymentSystem } from '@/hooks/use-simplified-payments'
import { TrialStatus } from './TrialStatus'
import { SubscriptionFeedbackForm } from './SubscriptionFeedbackForm'
import { ExpiredSubscriptionModal } from './ExpiredSubscriptionModal'
import { toastActions } from '@/stores/toast-store'
import { BillingGuard, AccessDenied } from '@/components/rbac/rbac-guards'

// Helper functions
const formatPrice = (amount: number) => formatCurrency(amount)
const formatSubscriptionDate = (dateString: string) => new Date(dateString).toLocaleDateString()

export function SubscriptionManagement() {
  return (
    <BillingGuard action="read" fallback={
      <div className="p-8">
        <AccessDenied 
          message="Subscription management is only available to staff members and above. Contact your gym manager for billing and subscription changes." 
        />
      </div>
    }>
      <SubscriptionManagementContent />
    </BillingGuard>
  )
}

function SubscriptionManagementContent() {
  const { isLoading: trialLoading } = useTrialInfo()
  const { currentSubscription: subscriptionInfo, plans, subscriptionAction, createBillingPortal, isLoading } = useSimplifiedPaymentSystem()

  const plansLoading = isLoading
  const subscriptionLoading = isLoading

  // State for feedback flow
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [showExpiredModal, setShowExpiredModal] = useState(false)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  
  const handleCancelSubscription = async () => {
    if (!subscriptionInfo?.id) return
    
    // Show feedback dialog first
    setShowFeedbackDialog(true)
  }

  const handleFeedbackSubmit = async (data: {
    reason: string
    feedbackText?: string
    rating?: number
    wouldRecommend?: boolean
  }) => {
    if (!subscriptionInfo?.id) return
    
    setIsSubmittingFeedback(true)
    try {
      // Cancel subscription with feedback
      await subscriptionAction.mutateAsync({
        action: 'cancel',
        subscriptionId: subscriptionInfo.id,
        cancelAtPeriodEnd: true,
        feedback: data
      })
      
      setShowFeedbackDialog(false)
      toastActions.success('Subscription canceled successfully', '')
      
      // Show expired modal after a short delay
      setTimeout(() => {
        setShowExpiredModal(true)
      }, 1000)
      
    } catch (error) {
      toastActions.error('Failed to cancel subscription', error instanceof Error ? error.message : 'Please try again or contact support')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  const handleFeedbackSkip = async () => {
    if (!subscriptionInfo?.id) return
    
    try {
      // Cancel subscription without feedback
      await subscriptionAction.mutateAsync({
        action: 'cancel',
        subscriptionId: subscriptionInfo.id,
        cancelAtPeriodEnd: true
      })
      
      setShowFeedbackDialog(false)
      toastActions.success('Subscription canceled successfully', '')
      
      // Show expired modal after a short delay
      setTimeout(() => {
        setShowExpiredModal(true)
      }, 1000)
    } catch (error) {
      toastActions.error('Failed to cancel subscription', error instanceof Error ? error.message : 'Please try again or contact support')
    }
  }

  const handleUpdateSubscription = () => {
    setShowExpiredModal(false)
    window.location.href = '/upgrade'
  }

  const handleUpgradeClick = () => {
    window.location.href = '/upgrade'
  }

  const handleCancelAccount = () => {
    setShowExpiredModal(false)
    // Handle account cancellation
    toastActions.info('Account cancellation will be processed', '')
  }
  
  if (trialLoading || subscriptionLoading || plansLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-48 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  const hasSubscription = hasActiveSubscription(subscriptionInfo || null)
  const currentPlan = subscriptionInfo?.plan || plans?.plans?.find((plan: {id: string}) => plan.id === subscriptionInfo?.subscription_plan_id)

  const renderPlanCard = (plan: {id: string, name: string, price_monthly_inr: number, price_annual_inr: number, features?: string[], member_limit?: number}) => (
    <DynamicCard key={plan.id} className={`relative ${currentPlan?.id === plan.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
      {currentPlan?.id === plan.id && (
        <DynamicBadge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
          Current Plan
        </DynamicBadge>
      )}
      <DynamicCardHeader>
        <DynamicCardTitle className="flex items-center gap-2">
          {plan.name === 'Professional' && <DynamicCrown className="h-5 w-5 text-amber-500" />}
          {plan.name}
        </DynamicCardTitle>
        <DynamicCardDescription>
          {formatPrice(plan.price_monthly_inr)}/month or {formatPrice(plan.price_annual_inr)}/year
        </DynamicCardDescription>
      </DynamicCardHeader>
      <DynamicCardContent>
        <div className="space-y-3">
          {plan.features && plan.features.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Features:</h4>
              <ul className="space-y-1">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <DynamicCheckCircle className="h-4 w-4 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plan.member_limit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DynamicUsers className="h-4 w-4" />
              Up to {plan.member_limit} members
            </div>
          )}
        </div>
      </DynamicCardContent>
    </DynamicCard>
  )

  return (
    <div className="space-y-6">
      {/* Trial Status */}
      <TrialStatus variant="card" showUpgradeButton={true} />
      
      {/* Current Subscription */}
      {hasSubscription && subscriptionInfo && (
        <DynamicCard>
          <DynamicCardHeader>
            <DynamicCardTitle className="flex items-center gap-2">
              <DynamicCreditCard className="h-5 w-5" />
              Current Subscription
            </DynamicCardTitle>
            <DynamicCardDescription>
              Manage your active subscription
            </DynamicCardDescription>
          </DynamicCardHeader>
          <DynamicCardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Plan</p>
                <p className="text-lg">{currentPlan?.name || 'Unknown Plan'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <DynamicBadge 
                  className={`${
                    getSubscriptionStatusColor(subscriptionInfo.status) === 'green' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' :
                    getSubscriptionStatusColor(subscriptionInfo.status) === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {getSubscriptionStatusText(subscriptionInfo.status)}
                </DynamicBadge>
              </div>
              <div>
                <p className="text-sm font-medium">Billing Cycle</p>
                <p className="text-lg capitalize">{subscriptionInfo.billing_cycle}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-lg">{formatPrice(subscriptionInfo.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Period</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionInfo.current_period_start && formatSubscriptionDate(subscriptionInfo.current_period_start)} - {subscriptionInfo.current_period_end && formatSubscriptionDate(subscriptionInfo.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Next Billing</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionInfo.current_period_end && formatSubscriptionDate(subscriptionInfo.current_period_end)}
                </p>
              </div>
            </div>

            <DynamicSeparator />

            {subscriptionInfo.status === 'active' && (
              <div className="space-y-3">
                {/* Primary Actions */}
                <div className="flex gap-3">
                  <DynamicButton 
                    variant="default" 
                    size="sm"
                    onClick={handleUpgradeClick}
                    disabled={subscriptionAction.isPending}
                    className="flex-1"
                  >
                    <DynamicCrown className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </DynamicButton>
                  
                  <BillingGuard action="update" fallback={
                    <DynamicButton 
                      variant="destructive" 
                      size="sm"
                      disabled
                      className="flex-1"
                      title="Subscription cancellation requires billing management privileges"
                    >
                      <DynamicX className="h-4 w-4 mr-2" />
                      Cancel Subscription (Staff Only)
                    </DynamicButton>
                  }>
                    <DynamicButton 
                      variant="destructive" 
                      size="sm"
                      onClick={handleCancelSubscription}
                      disabled={subscriptionAction.isPending}
                      className="flex-1"
                    >
                      <DynamicX className="h-4 w-4 mr-2" />
                      Cancel Subscription
                    </DynamicButton>
                  </BillingGuard>
                </div>

                {/* Secondary Action */}
                <div className="text-center">
                  <BillingGuard action="update" fallback={
                    <DynamicButton 
                      variant="ghost" 
                      size="sm"
                      disabled
                      className="text-muted-foreground"
                      title="Payment method management requires billing privileges"
                    >
                      <DynamicSettings className="h-4 w-4 mr-2" />
                      Manage Payment Methods (Staff Only)
                    </DynamicButton>
                  }>
                    <DynamicButton 
                      variant="ghost" 
                      size="sm"
                      onClick={() => createBillingPortal.mutate()}
                      disabled={createBillingPortal.isPending}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <DynamicSettings className="h-4 w-4 mr-2" />
                      {createBillingPortal.isPending ? 'Loading...' : 'Manage Payment Methods'}
                    </DynamicButton>
                  </BillingGuard>
                </div>
              </div>
            )}
          </DynamicCardContent>
        </DynamicCard>
      )}

      {/* Available Plans - Only show if no active subscription */}
      {!hasSubscription && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans?.plans?.map(renderPlanCard)}
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <DynamicSettings className="h-5 w-5" />
              Subscription Feedback
            </DialogTitle>
            <DialogDescription>
              We&apos;re sorry to see you go. Your feedback helps us improve our service for everyone.
            </DialogDescription>
          </DialogHeader>
          
          <SubscriptionFeedbackForm
            onSubmit={handleFeedbackSubmit}
          />
          
          <DialogFooter className="gap-3 pt-6">
            <DynamicButton
              type="button"
              variant="outline"
              onClick={handleFeedbackSkip}
              disabled={isSubmittingFeedback}
            >
              Skip
            </DynamicButton>
            <DynamicButton
              type="submit"
              form="feedback-form"
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </DynamicButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expired Subscription Modal */}
      <ExpiredSubscriptionModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        onCancelSubscription={handleCancelAccount}
        onUpdateSubscription={handleUpdateSubscription}
        plans={plans?.plans || []}
        isLoading={subscriptionAction.isPending}
      />
    </div>
  )
} 