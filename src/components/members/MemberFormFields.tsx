import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Control } from 'react-hook-form'
import { MEMBER_STATUS_OPTIONS, type MemberStatus } from '@/types/member.types'

interface MemberFormData {
  first_name: string
  last_name: string
  email?: string
  phone_number?: string
  status: MemberStatus
}

interface MemberFormFieldsProps {
  control: Control<MemberFormData>
  showDescriptions?: boolean
}

export function MemberFormFields({ control, showDescriptions = true }: MemberFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="john.doe@example.com" type="email" {...field} />
            </FormControl>
            {showDescriptions && (
              <FormDescription>
                Optional. Used for notifications and communication.
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="phone_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input placeholder="+1 (555) 123-4567" {...field} />
            </FormControl>
            {showDescriptions && (
              <FormDescription>
                Optional. Used for emergency contact and notifications.
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select member status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {MEMBER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showDescriptions && (
              <FormDescription>
                Initial membership status
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
} 