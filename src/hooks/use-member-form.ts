import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { type MemberStatus } from '@/types/member.types'

// Form schema
const memberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone_number: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']),
})

export type MemberFormData = z.infer<typeof memberSchema>

interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  status: string | null
}

const defaultValues: MemberFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  status: 'active',
}

export function useMemberForm(selectedMember?: Member | null) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues,
  })

  // Update form when selected member changes (for edit mode)
  useEffect(() => {
    if (selectedMember) {
      form.reset({
        first_name: selectedMember.first_name || '',
        last_name: selectedMember.last_name || '',
        email: selectedMember.email || '',
        phone_number: selectedMember.phone_number || '',
        status: (selectedMember.status as MemberStatus) || 'active',
      })
    } else {
      form.reset(defaultValues)
    }
  }, [selectedMember, form])

  const resetForm = () => form.reset(defaultValues)

  return {
    form,
    resetForm,
    schema: memberSchema
  }
} 