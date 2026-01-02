'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { Users, Send, Loader2, CheckCircle, Search, UserCheck } from 'lucide-react'
import { PortalService, type EligibleMember, type BulkInviteResult } from '@/services/members/portal.service'
import { toastActions } from '@/stores/toast-store'

const bulkInviteSchema = z.object({
  message: z.string().max(500, 'Message too long').optional(),
  expires_in_hours: z.number().min(1, 'Must be at least 1 hour').max(168, 'Cannot exceed 7 days'),
  search_query: z.string().optional()
})

type BulkInviteFormData = z.infer<typeof bulkInviteSchema>

interface BulkPortalInviteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gymId: string
  onSuccess?: () => void
}

export function BulkPortalInvite({
  open,
  onOpenChange,
  gymId,
  onSuccess
}: BulkPortalInviteProps) {
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<EligibleMember[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BulkInviteResult | null>(null)

  const form = useForm<BulkInviteFormData>({
    resolver: zodResolver(bulkInviteSchema),
    defaultValues: {
      message: '',
      expires_in_hours: 72,
      search_query: ''
    }
  })

  const searchQuery = form.watch('search_query')

  // Define loadEligibleMembers callback first
  const loadEligibleMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const members = await PortalService.getEligibleMembers(gymId, 100, 0)
      setEligibleMembers(members)
      setFilteredMembers(members)
    } catch (error) {
      logger.error('Error loading eligible members:', {error})
      toastActions.error('Loading Failed', 'Failed to load eligible members')
    } finally {
      setIsLoading(false)
    }
  }, [gymId])

  // Load eligible members when dialog opens
  useEffect(() => {
    if (open && gymId) {
      loadEligibleMembers()
    }
  }, [open, gymId, loadEligibleMembers])

  // Filter members based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredMembers(eligibleMembers)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = eligibleMembers.filter(member =>
        member.first_name.toLowerCase().includes(query) ||
        member.last_name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      )
      setFilteredMembers(filtered)
    }
  }, [searchQuery, eligibleMembers])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMemberIds([])
      setResult(null)
      form.reset()
    }
  }, [open, form])

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(prev => [...prev, memberId])
    } else {
      setSelectedMemberIds(prev => prev.filter(id => id !== memberId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(filteredMembers.map(m => m.member_id))
    } else {
      setSelectedMemberIds([])
    }
  }

  const handleSubmit = async (data: BulkInviteFormData) => {
    if (selectedMemberIds.length === 0) {
      toastActions.error('No Selection', 'Please select at least one member to invite')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await PortalService.bulkInviteToPortal(gymId, {
        member_ids: selectedMemberIds,
        message: data.message,
        expires_in_hours: data.expires_in_hours
      })

      setResult(result)

      if (result.success && result.data) {
        const { success_count, failed_count } = result.data.summary
        
        if (failed_count === 0) {
          toastActions.success(
            'Invitations Sent',
            `Successfully sent ${success_count} portal invitations.`
          )
        } else {
          toastActions.warning(
            'Partial Success',
            `Sent ${success_count} invitations, ${failed_count} failed.`
          )
        }
        
        onSuccess?.()
      } else {
        toastActions.error('Bulk Invite Failed', result.error || 'Unknown error')
      }
    } catch (error) {
      logger.error('Bulk invite error:', {error})
      toastActions.error('Bulk Invite Failed', 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = selectedMemberIds.length
  const isAllSelected = selectedCount === filteredMembers.length && filteredMembers.length > 0

  if (result) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Bulk Invitation Results
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {result.success && result.data && (
              <>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {result.data.summary.success_count}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Sent</div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                      {result.data.summary.failed_count}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Failed</div>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {result.data.summary.total_requested}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
                  </div>
                </div>

                {result.data.failed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-700 dark:text-red-300">Failed Invitations:</h4>
                    <ScrollArea className="max-h-32">
                      {result.data.failed.map((failure, index) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950 rounded mb-2">
                          <span className="font-medium">{failure.name}</span> ({failure.email}): {failure.error}
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Portal Invitations
          </DialogTitle>
          <DialogDescription>
            Select members to invite to the portal. Only active members with email addresses who don&apos;t already have portal access are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 min-h-0">
          {/* Search and selection controls */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    className="pl-10"
                    {...form.register('search_query')}
                  />
                </div>
              </div>
              <div className="pt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(!isAllSelected)}
                  disabled={filteredMembers.length === 0}
                >
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-sm">
                {selectedCount} member{selectedCount === 1 ? '' : 's'} selected
              </Badge>
            )}
          </div>

          {/* Member selection list */}
          <div className="border rounded-lg flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading members...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <UserCheck className="h-8 w-8 mb-2" />
                <p>No eligible members found</p>
                <p className="text-sm">All members either have portal access or no email address</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="p-4 space-y-3">
                  {filteredMembers.map((member) => (
                    <div key={member.member_id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={selectedMemberIds.includes(member.member_id)}
                        onCheckedChange={(checked) => handleMemberToggle(member.member_id, !!checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined: {new Date(member.join_date).toLocaleDateString()}
                          {member.invitation_count && member.invitation_count > 0 && (
                            <span className="ml-2">• {member.invitation_count} previous invitation{member.invitation_count === 1 ? '' : 's'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Invitation options */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="expires_in_hours">Invitation Expires In (Hours)</Label>
              <Input
                id="expires_in_hours"
                type="number"
                min="1"
                max="168"
                {...form.register('expires_in_hours', { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Welcome to our gym portal! You can now check in/out and view your attendance history..."
                className="min-h-[80px]"
                {...form.register('message')}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || selectedCount === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {selectedCount} Invitation{selectedCount === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
