import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { MemberFormFields } from './MemberFormFields'
import { UseFormReturn } from 'react-hook-form'
import { Edit, UserPlus } from 'lucide-react'
import { type MemberStatus } from '@/types/member.types'

interface MemberFormData {
  first_name: string
  last_name: string
  email?: string
  phone_number?: string
  status: MemberStatus
}

interface MemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  form: UseFormReturn<MemberFormData>
  onSubmit: (data: MemberFormData) => Promise<void>
  isSubmitting: boolean
  memberName?: string
}

export function MemberDialog({
  open,
  onOpenChange,
  mode,
  form,
  onSubmit,
  isSubmitting,
  memberName
}: MemberDialogProps) {
  const isEdit = mode === 'edit'
  const Icon = isEdit ? Edit : UserPlus
  const title = isEdit ? 'Edit Member' : 'Add New Member'
  const description = isEdit 
    ? 'Update member information. Changes will be saved immediately.'
    : 'Add a new member to your gym. All fields except email and phone are required.'
  const submitText = isEdit ? 'Update Member' : 'Add Member'
  const submittingText = isEdit ? 'Updating...' : 'Adding...'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
            {isEdit && memberName && (
              <span className="text-muted-foreground">- {memberName}</span>
            )}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <MemberFormFields 
              control={form.control} 
              showDescriptions={!isEdit}
            />
            
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
                {isSubmitting ? submittingText : submitText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 