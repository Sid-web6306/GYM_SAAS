'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Edit, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { EnhancedMemberFormFields, type EnhancedMemberFormData } from './EnhancedMemberFormFields'
import { MemberService } from '@/services/member.service'
import { toastActions } from '@/stores/toast-store'
import { type Member } from '@/types/member.types'
import { logger } from '@/lib/logger'

// Enhanced validation schema
const enhancedMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
  enable_portal_access: z.boolean().optional().default(false),
  send_welcome_message: z.boolean().optional().default(false),
  custom_message: z.string().max(500, 'Message too long').optional()
})

interface EnhancedMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  gymId: string
  member?: Member
  onSuccess?: (member: Member) => void
}

export function EnhancedMemberDialog({
  open,
  onOpenChange,
  mode,
  gymId,
  member,
  onSuccess
}: EnhancedMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'member' | 'portal' | 'success'>('member')
  const [createdMember, setCreatedMember] = useState<Member | null>(null)

  const isEdit = mode === 'edit'
  const Icon = isEdit ? Edit : UserPlus
  const title = isEdit ? 'Edit Member' : 'Add New Member'
  const description = isEdit 
    ? 'Update member information. Changes will be saved immediately.'
    : 'Add a new member using our two-phase approach: create member record first, then optionally enable portal access.'

  const form = useForm<EnhancedMemberFormData>({
    resolver: zodResolver(enhancedMemberSchema),
    defaultValues: {
      first_name: member?.first_name || '',
      last_name: member?.last_name || '',
      email: member?.email || '',
      phone_number: member?.phone_number || '',
      status: (member?.status as 'active' | 'inactive' | 'pending') || 'active',
      enable_portal_access: false,
      send_welcome_message: false,
      custom_message: ''
    }
  })

  const watchEmail = form.watch('email')
  const watchEnablePortal = form.watch('enable_portal_access')

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      form.reset()
      setStep('member')
      setCreatedMember(null)
    }
  }, [open, form])

  const handleSubmit = async (data: EnhancedMemberFormData) => {
    setIsSubmitting(true)
    
    try {
      if (isEdit && member) {
        // Edit mode: update existing member
        const updatedMember = await MemberService.updateMember(member.id, {
          gym_id: gymId,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone_number: data.phone_number || null,
          status: data.status
        })

        toastActions.success('Member Updated', `${updatedMember.first_name} ${updatedMember.last_name} has been updated successfully.`)
        onSuccess?.(updatedMember)
        onOpenChange(false)
      } else {
        // Add mode: create new member (Phase 1)
        const newMember = await MemberService.createMember({
          gym_id: gymId,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email || null,
          phone_number: data.phone_number || null,
          status: data.status
        })

        setCreatedMember(newMember)

        // Phase 2: Portal access (if requested and email provided)
        logger.debug('🔍 EnhancedMemberDialog - Portal access check:', {
          enable_portal_access: data.enable_portal_access,
          email: data.email,
          condition_result: data.enable_portal_access && data.email
        })
        
        if (data.enable_portal_access && data.email) {
          logger.debug('🚀 Calling MemberService.enablePortalAccess with:', {
            memberId: newMember.id,
            message: data.custom_message,
            send_welcome_message: data.send_welcome_message
          })
          try {
            const portalResult = await MemberService.enablePortalAccess(newMember.id, {
              message: data.custom_message,
              expires_in_hours: 72,
              send_welcome_message: data.send_welcome_message
            })

            if (portalResult.success) {
              toastActions.success(
                'Member Created & Invited', 
                `${newMember.first_name} ${newMember.last_name} has been added and invited to the portal.`
              )
            } else {
              toastActions.warning(
                'Member Created, Portal Invitation Failed', 
                `${newMember.first_name} ${newMember.last_name} was created but portal invitation failed: ${portalResult.error}`
              )
            }
          } catch (portalError) {
            logger.error('Portal invitation error:', {portalError})
            toastActions.warning(
              'Member Created, Portal Invitation Failed', 
              `${newMember.first_name} ${newMember.last_name} was created but portal invitation encountered an error.`
            )
          }
        } else {
          toastActions.success(
            'Member Created', 
            `${newMember.first_name} ${newMember.last_name} has been added successfully.`
          )
        }

        setStep('success')
        onSuccess?.(newMember)
      }
    } catch (error) {
      logger.error('Member operation error:', {error})
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toastActions.error(
        isEdit ? 'Update Failed' : 'Creation Failed', 
        `Failed to ${isEdit ? 'update' : 'create'} member: ${errorMessage}`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (step === 'success') {
      onOpenChange(false)
    } else {
      onOpenChange(false)
    }
  }

  const renderSuccessStep = () => (
    <div className="text-center space-y-4 py-6">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Member Created Successfully!</h3>
        <p className="text-muted-foreground">
          {createdMember?.first_name} {createdMember?.last_name} has been added to your gym.
        </p>
      </div>

      {watchEnablePortal && watchEmail && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-left">
              <h4 className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">
                Portal Invitation Sent
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                An invitation email has been sent to {watchEmail}. The member can accept the invitation to access the portal.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 pt-4">
        <Button onClick={handleClose}>
          Done
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            form.reset()
            setStep('member')
            setCreatedMember(null)
          }}
        >
          Add Another Member
        </Button>
      </div>
    </div>
  )

  if (step === 'success') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          {renderSuccessStep()}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            {isEdit && member && (
              <span className="text-muted-foreground">- {member.first_name} {member.last_name}</span>
            )}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <EnhancedMemberFormFields 
              control={form.control} 
              showDescriptions={!isEdit}
              showPortalOptions={!isEdit}
              isEdit={isEdit}
            />

            {/* Email requirement warning for portal access */}
            {!isEdit && watchEnablePortal && !watchEmail && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-yellow-900 dark:text-yellow-100">
                      Email Required for Portal Access
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Please provide an email address to enable portal access for this member.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEdit ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEdit ? 'Update Member' : 'Create Member'}
                    {!isEdit && watchEnablePortal && watchEmail && ' & Send Invitation'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
