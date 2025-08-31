'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Mail, Send, AlertCircle, UserCheck } from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInvitations } from '@/hooks/use-invitations'
import { useRBAC } from '@/hooks/use-rbac'
import { toastActions } from '@/stores/toast-store'
import { type Member } from '@/types/member.types'
import { InviteCreationErrorBoundary } from '@/components/invites/InvitationErrorBoundary'

const memberPortalInviteSchema = z.object({
  message: z.string().max(500).optional()
})

type MemberPortalInviteFormData = z.infer<typeof memberPortalInviteSchema>

interface MemberPortalInviteProps {
  member: Member
  onSuccess?: () => void
}

export const MemberPortalInvite: React.FC<MemberPortalInviteProps> = ({
  member,
  onSuccess
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const rbac = useRBAC()
  const { createInvitation } = useInvitations()

  const form = useForm<MemberPortalInviteFormData>({
    resolver: zodResolver(memberPortalInviteSchema),
    defaultValues: {
      message: ''
    }
  })

  const canInvite = rbac?.can('staff.create') || false

  // Don't show invite option if member already has portal access
  if (member.user_id) {
    return null
  }

  // Don't show if member doesn't have email
  if (!member.email) {
    return (
      <DropdownMenuItem disabled className="text-gray-400">
        <Mail className="h-4 w-4 mr-2" />
        Invite to Portal (Email Required)
      </DropdownMenuItem>
    )
  }

  const handleSubmit: SubmitHandler<MemberPortalInviteFormData> = async (data) => {
    setIsSubmitting(true)
    try {
      const result = await createInvitation({
        email: member.email!,
        role: 'member',
        expires_in_hours: 72, // 3 days
        message: data.message,
        notify_user: true,
        metadata: {
          member_id: member.id,
          member_name: `${member.first_name} ${member.last_name}`.trim(),
          portal_invitation: true
        }
      })

      if (result.success) {
        if (result.warning) {
          // Partial success - invitation created but email failed
          toastActions.error('Email Failed', result.warning)
          // Show the invitation URL for manual sharing
          if (result.invitation?.invite_url) {
            setTimeout(() => {
              toastActions.info('Manual Share', `Copy this link to share manually: ${result.invitation!.invite_url}`)
            }, 3000)
          }
        } else {
          // Full success - invitation created and email sent
          toastActions.success(
            'Portal Invitation Sent', 
            `Portal invitation sent to ${member.first_name} ${member.last_name} at ${member.email}`
          )
        }
        form.reset()
        setIsOpen(false)
        onSuccess?.()
      } else {
        toastActions.error('Failed to Send Portal Invitation', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error sending member portal invitation:', error)
      toastActions.error('Error', 'Failed to send portal invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canInvite) {
    return (
      <DropdownMenuItem disabled className="text-gray-400">
        <Mail className="h-4 w-4 mr-2" />
        Invite to Portal (Staff Only)
      </DropdownMenuItem>
    )
  }

  return (
    <InviteCreationErrorBoundary>
      <DropdownMenuItem onClick={() => setIsOpen(true)}>
        <Mail className="h-4 w-4 mr-2" />
        Invite to Portal
      </DropdownMenuItem>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Invite Member to Portal
            </DialogTitle>
            <DialogDescription>
              Send {member.first_name} {member.last_name} an invitation to access the member portal 
              for self-service check-in/out at <span className="font-medium">{member.email}</span>.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Input
                id="message"
                placeholder="Welcome to our member portal! You can now..."
                {...form.register('message')}
              />
              {form.formState.errors.message && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.message.message}
                </p>
              )}
            </div>

            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Portal Access Includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Self-service check-in and check-out</li>
                <li>• View personal attendance history</li>
                <li>• Update profile information</li>
                <li>• Mobile-friendly PWA experience</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </InviteCreationErrorBoundary>
  )
}
