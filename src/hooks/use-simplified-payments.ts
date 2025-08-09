import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { toastActions } from '@/stores/toast-store'

// Types for the simplified APIs
export interface PaymentRequest {
  flow: 'embedded' | 'redirect'
  amount?: number
  currency?: string
  planId?: string
  billingCycle?: 'monthly' | 'annual'
  setupFutureUsage?: boolean
  metadata?: Record<string, string>
}

export interface PaymentResponse {
  flow: 'embedded' | 'redirect'
  clientSecret?: string
  paymentIntentId?: string
  customerId?: string
  sessionId?: string
  checkoutUrl?: string
  subscriptionId?: string
  checkout?: {
    key: string
    subscription_id: string
    name: string
    description: string
    image: string
    prefill: {
      name: string
      email: string
    }
    theme: {
      color: string
    }
    modal?: {
      ondismiss?: () => void
    }
  }
}

export interface SubscriptionAction {
  action: 'pause' | 'resume' | 'cancel' | 'change-plan'
  subscriptionId: string
  cancelAtPeriodEnd?: boolean
  newPlanId?: string
  billingCycle?: 'monthly' | 'annual'
  feedback?: {
    reason: string
    feedbackText?: string
    rating?: number
    wouldRecommend?: boolean
  }
}

export interface DocumentRequest {
  type: 'invoice' | 'receipt' | 'statement' | 'contract'
  id: string
}

export interface DocumentListRequest {
  limit?: number
  offset?: number
  type?: 'invoice' | 'receipt' | 'statement' | 'contract' | null
  startDate?: string | null
  endDate?: string | null
  search?: string | null
  tags?: string[] | null
}

export interface DocumentUpdateRequest {
  documentId: string
  title?: string
  description?: string
  tags?: string[]
}

// Hook for managing payment methods
export function usePaymentMethods() {
  const queryClient = useQueryClient()

  // Get payment methods
  const {
    data: paymentMethods = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async (): Promise<unknown[]> => {
      const response = await fetch('/api/payment-methods')
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods')
      }
      const data = await response.json()
      return data.paymentMethods || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Add payment method
  const addPaymentMethod = useMutation({
    mutationFn: async ({ paymentMethodId, setAsDefault = false }: { 
      paymentMethodId: string
      setAsDefault?: boolean 
    }) => {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId, setAsDefault }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add payment method')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toastActions.success('Payment Method Added', 'Your payment method has been saved successfully.')
    },
    onError: (error: Error) => {
      logger.error('Error adding payment method:', {error})
      toastActions.error('Failed to Add Payment Method', error.message)
    },
  })

  // Set default payment method
  const setDefaultPaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update default payment method')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toastActions.success('Default Payment Method Updated', 'Your default payment method has been changed.')
    },
    onError: (error: Error) => {
      logger.error('Error setting default payment method:', {error})
      toastActions.error('Failed to Update Payment Method', error.message)
    },
  })

  // Remove payment method
  const removePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await fetch(`/api/payment-methods?id=${paymentMethodId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove payment method')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toastActions.success('Payment Method Removed', 'Your payment method has been removed.')
    },
    onError: (error: Error) => {
      logger.error('Error removing payment method:', {error})
      toastActions.error('Failed to Remove Payment Method', error.message)
    },
  })

  return {
    paymentMethods,
    isLoading,
    error,
    refetch,
    addPaymentMethod,
    setDefaultPaymentMethod,
    removePaymentMethod,
  }
}

// Hook for simplified payment processing
export function useSimplifiedPayments() {
  // Create payment (intent or checkout session)
  const createPayment = useMutation({
    mutationFn: async (request: PaymentRequest): Promise<PaymentResponse> => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create payment')
      }
      console.log('Payment successful:', response)

      return response.json()
    },
    onError: (error: Error) => {
      logger.error('Error creating payment:', {error})
      toastActions.error('Payment Failed', error.message)
    },
  })

  return {
    createPayment,
  }
}

// Hook for consolidated subscription management
export function useSimplifiedSubscriptions() {
  const queryClient = useQueryClient()

  // Get subscription plans and current subscription
  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['subscriptions-consolidated'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions')
      if (!response.ok) {
        throw new Error('Failed to fetch subscription data')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Get subscription plans only
  const getPlans = useQuery({
    queryKey: ['subscription-plans-simplified'],
    queryFn: async (): Promise<unknown[]> => {
      const response = await fetch('/api/subscriptions?action=plans')
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans')
      }
      const data = await response.json()
      return data.plans || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Get current subscription only
  const getCurrentSubscription = useQuery({
    queryKey: ['current-subscription-simplified'],
    queryFn: async () => {
      const response = await fetch('/api/subscriptions?action=current')
      if (!response.ok) {
        throw new Error('Failed to fetch current subscription')
      }
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Create billing portal session
  const createBillingPortal = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/subscriptions?action=billing-portal')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create billing portal')
      }
      const data = await response.json()
      
      // Redirect to billing portal
      if (data.url) {
        window.location.href = data.url
      }
      
      return data
    },
    onError: (error: Error) => {
      logger.error('Error creating billing portal:', {error})
      toastActions.error('Billing Portal Error', error.message)
    },
  })

  // Subscription actions (pause, resume, cancel, change plan)
  const subscriptionAction = useMutation({
    mutationFn: async (actionRequest: SubscriptionAction) => {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionRequest),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to perform subscription action')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions-consolidated'] })
      queryClient.invalidateQueries({ queryKey: ['current-subscription-simplified'] })
      
      const actionMessages = {
        pause: 'Subscription paused successfully',
        resume: 'Subscription resumed successfully',
        cancel: 'Subscription cancellation scheduled',
        'change-plan': 'Plan change scheduled successfully'
      }
      
      toastActions.success(
        'Subscription Updated', 
        data.message || actionMessages[variables.action] || 'Action completed successfully'
      )
    },
    onError: (error: Error) => {
      logger.error('Error performing subscription action:', {error})
      toastActions.error('Subscription Action Failed', error.message)
    },
  })

  return {
    // Combined data
    subscriptionData,
    plans: subscriptionData ? {
      plans: subscriptionData.plans || [],
      groupedPlans: subscriptionData.groupedPlans || {}
    } : { 
      plans: getPlans.data || [], 
      groupedPlans: {} 
    },
    currentSubscription: subscriptionData?.currentSubscription || getCurrentSubscription.data?.subscription,
    hasAccess: subscriptionData?.hasAccess || getCurrentSubscription.data?.hasAccess || false,
    trial: getCurrentSubscription.data?.trial,
    
    // Loading states
    isLoading: isLoading || getPlans.isLoading || getCurrentSubscription.isLoading,
    error: error || getPlans.error || getCurrentSubscription.error,
    
    // Actions
    refetch,
    createBillingPortal,
    subscriptionAction,
    
    // Individual queries for specific use cases
    getPlans,
    getCurrentSubscription,
  }
}

// Hook for document management with enhanced features
export function useDocuments() {
  const queryClient = useQueryClient()

  // List documents with advanced filtering and pagination
  const listDocuments = useMutation({
    mutationFn: async (params: DocumentListRequest = {}) => {
      const { limit = 20, offset = 0, ...filters } = params
      
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, offset, ...filters }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to list documents')
      }

      return response.json()
    },
    onError: (error: Error) => {
      logger.error('Error listing documents:', { error: error.message })
      toastActions.error('Failed to Load Documents', error.message)
    },
  })

  // Download document
  const downloadDocument = useMutation({
    mutationFn: async ({ type, id }: DocumentRequest) => {
      const response = await fetch(`/api/documents?type=${type}&id=${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to download document')
      }

      const data = await response.json()
      
      // Open download URL in new tab
      if (data.download_url) {
        window.open(data.download_url, '_blank')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      toastActions.success(
        'Document Ready', 
        `Your ${variables.type} is ready for download.`
      )
    },
    onError: (error: Error) => {
      logger.error('Error downloading document:', { error: error.message })
      toastActions.error('Download Failed', error.message)
    },
  })

  // Update document metadata (title, description, tags)
  const updateDocument = useMutation({
    mutationFn: async (params: DocumentUpdateRequest) => {
      const response = await fetch('/api/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update document')
      }

      return response.json()
    },
    onSuccess: () => {
      toastActions.success('Document Updated', 'Document metadata updated successfully')
      // Invalidate documents list to refresh
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: Error) => {
      logger.error('Error updating document:', { error: error.message })
      toastActions.error('Update Failed', error.message)
    },
  })

  // Delete document
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }

      return response.json()
    },
    onSuccess: () => {
      toastActions.success('Document Deleted', 'Document deleted successfully')
      // Invalidate documents list to refresh
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: Error) => {
      logger.error('Error deleting document:', { error: error.message })
      toastActions.error('Delete Failed', error.message)
    },
  })

  // React Query hook for fetching documents list (can be used for real-time updates)
  const useDocumentsList = (params: DocumentListRequest = {}) => {
    return useQuery({
      queryKey: ['documents', params],
      queryFn: () => listDocuments.mutateAsync(params),
      enabled: false, // Manual trigger
    })
  }

  return {
    listDocuments,
    downloadDocument,
    updateDocument,
    deleteDocument,
    useDocumentsList,
  }
}

// Combined hook that provides all simplified payment functionality
export function useSimplifiedPaymentSystem() {
  const paymentMethods = usePaymentMethods()
  const payments = useSimplifiedPayments()
  const subscriptions = useSimplifiedSubscriptions()
  const documents = useDocuments()

  return {
    // Payment methods
    paymentMethods: paymentMethods.paymentMethods,
    addPaymentMethod: paymentMethods.addPaymentMethod,
    setDefaultPaymentMethod: paymentMethods.setDefaultPaymentMethod,
    removePaymentMethod: paymentMethods.removePaymentMethod,
    
    // Payments
    createPayment: payments.createPayment,
    
    // Subscriptions
    plans: subscriptions.plans,
    currentSubscription: subscriptions.currentSubscription,
    hasAccess: subscriptions.hasAccess,
    trial: subscriptions.trial,
    createBillingPortal: subscriptions.createBillingPortal,
    subscriptionAction: subscriptions.subscriptionAction,
    
    // Documents
    listDocuments: documents.listDocuments,
    downloadDocument: documents.downloadDocument,
    
    // Global loading state
    isLoading: paymentMethods.isLoading || subscriptions.isLoading,
    error: subscriptions.error,
  }
} 