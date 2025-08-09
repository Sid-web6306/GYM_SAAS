'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Send, AlertCircle } from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useInvitations } from '@/hooks/use-invitations'
import { useRBAC } from '@/hooks/use-rbac'
import { toastActions } from '@/stores/toast-store'
import { type GymRole, ROLE_LEVELS } from '@/types/rbac.types'

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  expires_in_hours: z.number().min(1).max(168),
  message: z.string().max(500).optional()
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

export const InviteButton: React.FC<InviteButtonProps> = ({
  variant = 'default',
  size = 'default',
  className,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const rbac = useRBAC()
  const { createInvitation } = useInvitations()

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
      expires_in_hours: 72,
      message: ''
    }
  })

  const canInvite = rbac?.can('staff.create') || false

  const canInviteRole = (role: GymRole): boolean => {
    if (!rbac) return false
    const userLevel = rbac.role_level
    const targetLevel = ROLE_LEVELS[role]
    return userLevel > targetLevel
  }

  const handleSubmit: SubmitHandler<InviteFormData> = async (data) => {
    try {
      const result = await createInvitation({
        email: data.email,
        role: data.role,
        expires_in_hours: data.expires_in_hours,
        message: data.message,
        notify_user: true
      })

      if (result.success) {
        toastActions.success('Invitation Sent', `Invitation sent to ${data.email}`)
        form.reset()
        setIsOpen(false)
      } else {
        toastActions.error('Failed to Send Invitation', result.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      toastActions.error('Error', 'Failed to send invitation')
    }
  }

  if (!canInvite) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <UserPlus className="h-4 w-4 mr-2" />
          {children || 'Invite Member'}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your gym with a specific role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(value: GymRole) => form.setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {(['member', 'staff', 'trainer', 'manager', 'owner'] as GymRole[])
                  .filter(role => canInviteRole(role))
                  .map(role => (
                    <SelectItem key={role} value={role}>
                      <span className="capitalize">{role}</span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {form.formState.errors.role && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_in_hours">Expires In</Label>
            <Select
              value={String(form.watch('expires_in_hours'))}
              onValueChange={(value) => form.setValue('expires_in_hours', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">2 days</SelectItem>
                <SelectItem value="72">3 days</SelectItem>
                <SelectItem value="168">1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Input
              id="message"
              placeholder="Add a personal note..."
              {...form.register('message')}
            />
            <p className="text-sm text-muted-foreground">
              This message will be included in the invitation email.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
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
  )
}
