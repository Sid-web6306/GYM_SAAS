'use client'

import { useState } from 'react'
import { 
  DynamicLabel,
  DynamicRadioGroup,
  DynamicRadioGroupItem,
  DynamicTextarea,
  DynamicStar
} from '@/lib/dynamic-imports'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form'

const feedbackSchema = z.object({
  reason: z.enum([
    'too_expensive', 
    'not_using', 
    'missing_features', 
    'switching_platform', 
    'technical_issues', 
    'customer_service', 
    'other'
  ], {
    required_error: 'Please select a reason for cancellation'
  }),
  feedbackText: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  wouldRecommend: z.boolean().optional()
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

interface SubscriptionFeedbackFormProps {
  onSubmit: (data: FeedbackFormData) => Promise<void>
}

const cancellationReasons = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using', label: 'Not using it enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'switching_platform', label: 'Switching to another platform' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'customer_service', label: 'Poor customer service' },
  { value: 'other', label: 'Other' }
]

export function SubscriptionFeedbackForm({ onSubmit }: SubscriptionFeedbackFormProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      reason: undefined,
      feedbackText: '',
      rating: 0,
      wouldRecommend: undefined
    }
  })

  const handleSubmit = async (data: FeedbackFormData) => {
    await onSubmit({
      ...data,
      rating: rating || undefined
    })
  }

  return (
    <Form {...form}>
      <form id="feedback-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Reason for cancellation */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm leading-none font-medium">
                Why are you canceling your subscription?
              </FormLabel>
              <FormControl>
                <DynamicRadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="space-y-2"
                >
                  {cancellationReasons.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2">
                      <DynamicRadioGroupItem value={reason.value} id={reason.value} />
                      <DynamicLabel htmlFor={reason.value} className="text-sm cursor-pointer">
                        {reason.label}
                      </DynamicLabel>
                    </div>
                  ))}
                </DynamicRadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional feedback */}
        <FormField
          control={form.control}
          name="feedbackText"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm leading-none font-medium">
                Additional feedback (optional)
              </FormLabel>
              <FormControl>
                <DynamicTextarea
                  placeholder="Tell us more about your experience..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rating */}
        <div className="space-y-2">
          <DynamicLabel className="text-sm leading-none font-medium">
            How would you rate your overall experience?
          </DynamicLabel>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-colors"
              >
                <DynamicStar
                  className={`h-5 w-5 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {rating === 0 && 'Click to rate'}
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Would recommend */}
        <div className="space-y-2">
          <DynamicLabel className="text-sm leading-none font-medium">
            Would you recommend us to others?
          </DynamicLabel>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="recommend-yes"
                name="wouldRecommend"
                value="true"
                onChange={(e) => form.setValue('wouldRecommend', e.target.value === 'true')}
                className="h-4 w-4"
              />
              <DynamicLabel htmlFor="recommend-yes" className="text-sm cursor-pointer">
                Yes
              </DynamicLabel>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="recommend-no"
                name="wouldRecommend"
                value="false"
                onChange={(e) => form.setValue('wouldRecommend', e.target.value === 'true')}
                className="h-4 w-4"
              />
              <DynamicLabel htmlFor="recommend-no" className="text-sm cursor-pointer">
                No
              </DynamicLabel>
            </div>
          </div>
        </div>

        </form>
      </Form>
  )
} 