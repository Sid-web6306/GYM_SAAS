import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, reason, feedbackText, rating, wouldRecommend } = await request.json()
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate required fields
    if (!subscriptionId || !reason) {
      return NextResponse.json({ error: 'Subscription ID and reason are required' }, { status: 400 })
    }

    // Verify subscription belongs to user
    const { data: subscription } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } }).from('subscriptions')
      .select('id')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Check if feedback already exists for this subscription
    const { data: existingFeedback } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } }).from('feedback')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .single()

    if (existingFeedback) {
      return NextResponse.json({ error: 'Feedback already submitted for this subscription' }, { status: 409 })
    }

    // Insert feedback
    const { error: insertError } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<{ error: unknown }> } }).from('feedback')
      .insert({
        subscription_id: subscriptionId,
        user_id: user.id,
        reason,
        feedback_text: feedbackText || null,
        rating: rating || null,
        would_recommend: wouldRecommend || null
      })

    if (insertError) {
      logger.error('Error inserting feedback:', { insertError })
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    logger.info('Feedback submitted successfully:', {
      userId: user.id,
      subscriptionId,
      reason,
      rating,
      wouldRecommend
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Feedback submitted successfully' 
    })

  } catch (error) {
    logger.error('Feedback submission error:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 