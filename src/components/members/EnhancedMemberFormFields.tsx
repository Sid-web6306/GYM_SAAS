import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Control } from 'react-hook-form'
import { MEMBER_STATUS_OPTIONS, type MemberStatus } from '@/types/member.types'
import { Mail, Smartphone, UserCheck, MessageSquare } from 'lucide-react'

// Enhanced form data interface with portal access options
export interface EnhancedMemberFormData {
  // Phase 1: Core member data (always required)
  first_name: string
  last_name: string
  email?: string
  phone_number?: string
  status: MemberStatus
  
  // Phase 2: Portal access options (optional)
  enable_portal_access?: boolean
  send_welcome_message?: boolean
  custom_message?: string
}

interface EnhancedMemberFormFieldsProps {
  control: Control<EnhancedMemberFormData>
  showDescriptions?: boolean
  showPortalOptions?: boolean
  isEdit?: boolean
}

export function EnhancedMemberFormFields({ 
  control, 
  showDescriptions = true,
  showPortalOptions = true,
  isEdit = false
}: EnhancedMemberFormFieldsProps) {
  return (
    <>
      {/* PHASE 1: Core Member Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">1</span>
          </div>
          <h3 className="text-lg font-semibold">Member Information</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
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
                <FormLabel>Last Name *</FormLabel>
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
              <FormLabel className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" type="email" {...field} />
              </FormControl>
              {showDescriptions && (
                <FormDescription>
                  Optional, but required for portal access and digital communications.
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
              <FormLabel className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Phone Number
              </FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              {showDescriptions && (
                <FormDescription>
                  Optional. Used for emergency contact and SMS notifications.
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
              <FormLabel>Membership Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MEMBER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            option.value === 'active' 
                              ? 'bg-green-500' 
                              : option.value === 'pending'
                              ? 'bg-yellow-500'
                              : 'bg-gray-500'
                          }`}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showDescriptions && (
                <FormDescription>
                  Member can use gym services immediately regardless of status.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* PHASE 2: Portal Access Options (only for new members with email) */}
      {showPortalOptions && !isEdit && (
        <>
          <Separator className="my-6" />
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-green-700 dark:text-green-300">2</span>
              </div>
              <h3 className="text-lg font-semibold">Portal Access (Optional)</h3>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Member Portal Benefits</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Self-service check-in and check-out</li>
                    <li>• View personal attendance history</li>
                    <li>• Update profile information</li>
                    <li>• Mobile-friendly PWA experience</li>
                  </ul>
                </div>
              </div>
            </div>

            <FormField
              control={control}
              name="enable_portal_access"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Enable Portal Access
                    </FormLabel>
                    <FormDescription>
                      Send an invitation for digital portal access. Requires email address.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="send_welcome_message"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Send Welcome Email
                    </FormLabel>
                    <FormDescription>
                      Include a personalized welcome message with the portal invitation.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="custom_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Welcome Message (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Welcome to our gym! We&apos;re excited to have you as part of our community. Your portal access will allow you to..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This message will be included in the portal invitation email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {/* Edit mode notice */}
      {isEdit && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm mb-1 text-blue-900 dark:text-blue-100">
                Portal Access Management
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                To invite this member to the portal, use the &quot;Invite to Portal&quot; action in the member actions menu.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
