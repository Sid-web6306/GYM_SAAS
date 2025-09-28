/**
 * Hook for bulk member operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MemberService, type BulkInviteOptions } from '@/services/member.service'
import { membersKeys } from './use-members-data'
import { memberAnalyticsKeys } from './use-member-analytics'
import { toastActions } from '@/stores/toast-store'
import { logger } from '@/lib/logger'

/**
 * Hook for bulk portal invitations
 */
export function useBulkPortalInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ gymId, options }: { gymId: string; options: BulkInviteOptions }) => {
      return MemberService.bulkInviteToPortal(gymId, options)
    },
    onSuccess: (result, variables) => {
      const { gymId } = variables

      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: membersKeys.lists() 
      })
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.eligible(gymId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.stats(gymId) 
      })

      // Show success/warning based on results
      if (result.success && result.data) {
        const { success_count, failed_count } = result.data.summary
        
        if (failed_count === 0) {
          toastActions.success(
            'Bulk Invitations Sent',
            `Successfully sent ${success_count} portal invitations.`
          )
        } else {
          toastActions.warning(
            'Partial Success',
            `Sent ${success_count} invitations successfully. ${failed_count} failed.`
          )
        }
      }
    },
    onError: (error) => {
      logger.error('Bulk portal invite error:', {error})
      toastActions.error(
        'Bulk Invite Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    }
  })
}

/**
 * Hook for bulk member status updates
 */
export function useBulkMemberStatusUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      memberIds, 
      status 
    }: { 
      memberIds: string[]
      status: 'active' | 'inactive' | 'pending'
    }) => {
      // Update each member's status
      const results = await Promise.allSettled(
        memberIds.map(id => 
          MemberService.updateMember(id, { status })
        )
      )

      // Process results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return {
        successful,
        failed,
        total: memberIds.length,
        results
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate member lists
      queryClient.invalidateQueries({ 
        queryKey: membersKeys.lists() 
      })

      const { successful, failed, total } = result
      const { status } = variables

      if (failed === 0) {
        toastActions.success(
          'Status Updated',
          `Successfully updated ${successful} member${successful === 1 ? '' : 's'} to ${status}.`
        )
      } else {
        toastActions.warning(
          'Partial Success',
          `Updated ${successful} of ${total} members. ${failed} failed.`
        )
      }
    },
    onError: (error) => {
      logger.error('Bulk status update error:', {error})
      toastActions.error(
        'Bulk Update Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    }
  })
}

/**
 * Hook for bulk member deletion (soft delete)
 */
export function useBulkMemberDelete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberIds }: { memberIds: string[] }) => {
      // Soft delete each member
      const results = await Promise.allSettled(
        memberIds.map(id => MemberService.deleteMember(id))
      )

      // Process results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return {
        successful,
        failed,
        total: memberIds.length,
        results
      }
    },
    onSuccess: (result) => {
      // Invalidate member lists and analytics
      queryClient.invalidateQueries({ 
        queryKey: membersKeys.lists() 
      })
      queryClient.invalidateQueries({ 
        queryKey: memberAnalyticsKeys.all 
      })

      const { successful, failed, total } = result

      if (failed === 0) {
        toastActions.success(
          'Members Deleted',
          `Successfully deleted ${successful} member${successful === 1 ? '' : 's'}.`
        )
      } else {
        toastActions.warning(
          'Partial Success',
          `Deleted ${successful} of ${total} members. ${failed} failed.`
        )
      }
    },
    onError: (error) => {
      logger.error('Bulk delete error:', {error})
      toastActions.error(
        'Bulk Delete Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      )
    }
  })
}

/**
 * Utility hook for bulk operation state management
 */
export function useBulkOperationState() {
  const bulkInvite = useBulkPortalInvite()
  const bulkStatusUpdate = useBulkMemberStatusUpdate()
  const bulkDelete = useBulkMemberDelete()

  const isAnyOperationLoading = 
    bulkInvite.isPending || 
    bulkStatusUpdate.isPending || 
    bulkDelete.isPending

  const resetAllOperations = () => {
    bulkInvite.reset()
    bulkStatusUpdate.reset()
    bulkDelete.reset()
  }

  return {
    bulkInvite,
    bulkStatusUpdate,
    bulkDelete,
    isAnyOperationLoading,
    resetAllOperations
  }
}
