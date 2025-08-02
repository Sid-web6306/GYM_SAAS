'use client'

import { 
  DynamicButton,
  DynamicCard,
  DynamicCardContent,
  DynamicCardDescription,
  DynamicCardHeader,
  DynamicCardTitle,
  DynamicBadge,
  DynamicCrown,
  DynamicCheckCircle,
  DynamicUsers,
  DynamicCreditCard
} from '@/lib/dynamic-imports'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency } from '@/hooks/use-trial'

interface ExpiredSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onCancelSubscription: () => void
  onUpdateSubscription: () => void
  plans?: Array<{
    id: string
    name: string
    price_monthly_inr: number
    price_annual_inr: number
    features?: string[]
    member_limit?: number
  }>
  isLoading?: boolean
}

export function ExpiredSubscriptionModal({
  isOpen,
  onClose,
  onCancelSubscription,
  onUpdateSubscription,
  plans = [],
  isLoading = false
}: ExpiredSubscriptionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DynamicCreditCard className="h-5 w-5 text-red-500" />
            Subscription Expired
          </DialogTitle>
          <DialogDescription>
            Your subscription has expired. You can either cancel your account or update to a new plan to continue using our services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <DynamicCard className="border-red-200 bg-red-50">
            <DynamicCardHeader>
              <DynamicCardTitle className="text-red-800">Access Restricted</DynamicCardTitle>
              <DynamicCardDescription className="text-red-600">
                Your subscription has expired and you no longer have access to premium features.
              </DynamicCardDescription>
            </DynamicCardHeader>
            <DynamicCardContent>
              <div className="flex items-center gap-2">
                <DynamicBadge variant="destructive">Expired</DynamicBadge>
                <span className="text-sm text-red-600">
                  You can still view your data but cannot add new members or access premium features.
                </span>
              </div>
            </DynamicCardContent>
          </DynamicCard>

          {/* Available Plans */}
          {plans.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {plans.map((plan) => (
                  <DynamicCard key={plan.id} className="relative">
                    <DynamicCardHeader>
                      <DynamicCardTitle className="flex items-center gap-2">
                        {plan.name === 'Professional' && <DynamicCrown className="h-5 w-5 text-yellow-500" />}
                        {plan.name}
                      </DynamicCardTitle>
                      <DynamicCardDescription>
                        {formatCurrency(plan.price_monthly_inr)}/month or {formatCurrency(plan.price_annual_inr)}/year
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
                                  <DynamicCheckCircle className="h-4 w-4 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {plan.member_limit && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DynamicUsers className="h-4 w-4" />
                            Up to {plan.member_limit} members
                          </div>
                        )}
                      </div>
                    </DynamicCardContent>
                  </DynamicCard>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DynamicButton
            variant="outline"
            onClick={onCancelSubscription}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel Account
          </DynamicButton>
          <DynamicButton
            onClick={onUpdateSubscription}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Update Subscription
          </DynamicButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 