import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { serverConfig } from '@/lib/config'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

// Initialize Stripe
const stripe = serverConfig.stripeSecretKey 
  ? new Stripe(serverConfig.stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    })
  : null

export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's payment methods from database
    const { data: paymentMethods, error: dbError } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: boolean) => { order: (column: string, options: { ascending: boolean }) => Promise<{ data: unknown, error: unknown }> } } } } }).from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (dbError) {
      logger.error('Error fetching payment methods:', { error: dbError, userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
    }

    return NextResponse.json({ paymentMethods: paymentMethods || [] })

  } catch (error) {
    logger.error('Payment methods GET error:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const { paymentMethodId, setAsDefault = false } = await request.json()
    
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    
    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Extract card details if it's a card
    let cardDetails = {}
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      cardDetails = {
        card_brand: paymentMethod.card.brand,
        card_last4: paymentMethod.card.last4,
        card_exp_month: paymentMethod.card.exp_month,
        card_exp_year: paymentMethod.card.exp_year,
      }
    }

    // Save payment method to database
    const { data: savedPaymentMethod, error: saveError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('add_payment_method', {
      p_user_id: user.id,
      p_stripe_payment_method_id: paymentMethod.id,
      p_type: paymentMethod.type,
      p_is_default: setAsDefault,
      ...cardDetails
    })

    if (saveError) {
      logger.error('Error saving payment method:', { error: saveError, userId: user.id, paymentMethodId })
      return NextResponse.json({ error: 'Failed to save payment method' }, { status: 500 })
    }

    // If this is set as default, also need to update Stripe customer's default payment method
    if (setAsDefault) {
      try {
        // Get or create Stripe customer
        const existingCustomers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        })

        let customer: Stripe.Customer
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0]
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email: user.email,
            name: user.user_metadata?.full_name || undefined,
            metadata: {
              userId: user.id,
            },
          })
        }

        // Attach payment method to customer and set as default
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        })

        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        })
      } catch (stripeError) {
        logger.error('Error updating Stripe customer default payment method:', { 
          error: stripeError, 
          userId: user.id, 
          paymentMethodId 
        })
        // Don't fail the request if Stripe update fails, as we've already saved to DB
      }
    }

    logger.info('Payment method added successfully:', {
      userId: user.id,
      paymentMethodId,
      type: paymentMethod.type,
      setAsDefault,
      savedPaymentMethodId: savedPaymentMethod
    })

    return NextResponse.json({ 
      success: true, 
      paymentMethodId: savedPaymentMethod,
      message: 'Payment method added successfully' 
    })

  } catch (error) {
    logger.error('Payment methods POST error:', { error: error instanceof Error ? error.message : String(error) })
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { paymentMethodId, setAsDefault = true } = await request.json()
    
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update default payment method in database
    const { error: updateError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('set_default_payment_method', {
      p_user_id: user.id,
      p_payment_method_id: paymentMethodId
    })

    if (updateError) {
      logger.error('Error updating default payment method:', { 
        error: updateError, 
        userId: user.id, 
        paymentMethodId 
      })
      return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
    }

    // Also update in Stripe if configured
    if (stripe && setAsDefault) {
      try {
        // Get the Stripe payment method ID from our database
        const { data: paymentMethod } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } }).from('payment_methods')
          .select('stripe_payment_method_id')
          .eq('id', paymentMethodId)
          .eq('user_id', user.id)
          .single()

        if ((paymentMethod as Record<string, unknown>)?.stripe_payment_method_id) {
          // Find customer
          const existingCustomers = await stripe.customers.list({
            email: user.email,
            limit: 1,
          })

          if (existingCustomers.data.length > 0) {
            const customer = existingCustomers.data[0]
            
            await stripe.customers.update(customer.id, {
              invoice_settings: {
                default_payment_method: (paymentMethod as Record<string, unknown>).stripe_payment_method_id as string,
              },
            })
          }
        }
      } catch (stripeError) {
        logger.error('Error updating Stripe customer default payment method:', { 
          error: stripeError, 
          userId: user.id, 
          paymentMethodId 
        })
        // Don't fail the request if Stripe update fails
      }
    }

    logger.info('Default payment method updated successfully:', {
      userId: user.id,
      paymentMethodId
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Default payment method updated successfully' 
    })

  } catch (error) {
    logger.error('Payment methods PUT error:',  {error})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentMethodId = searchParams.get('id')
    
    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the payment method details before removal
    const { data: paymentMethod } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: string) => { single: () => Promise<{ data: unknown, error: unknown }> } } } } }).from('payment_methods')
      .select('stripe_payment_method_id, is_default')
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)
      .single()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Don't allow deletion of the default payment method if there are other active methods
    if ((paymentMethod as Record<string, unknown>).is_default) {
      const { data: otherMethods } = await (supabase as unknown as { from: (table: string) => { select: (columns: string) => { eq: (column: string, value: string) => { eq: (column: string, value: boolean) => { neq: (column: string, value: string) => Promise<{ data: unknown, error: unknown }> } } } } }).from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', paymentMethodId)

      if ((otherMethods as unknown[]) && (otherMethods as unknown[]).length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete default payment method. Please set another method as default first.' 
        }, { status: 400 })
      }
    }

    // Remove payment method from database (soft delete)
    const { error: removeError } = await (supabase as unknown as { rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown, error: unknown }> }).rpc('remove_payment_method', {
      p_user_id: user.id,
      p_payment_method_id: paymentMethodId
    })

    if (removeError) {
      logger.error('Error removing payment method:', { 
        error: removeError, 
        userId: user.id, 
        paymentMethodId 
      })
      return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
    }

    // Also detach from Stripe if configured
    if (stripe && (paymentMethod as Record<string, unknown>).stripe_payment_method_id) {
      try {
        await stripe.paymentMethods.detach((paymentMethod as Record<string, unknown>).stripe_payment_method_id as string)
      } catch (stripeError) {
        logger.error('Error detaching payment method from Stripe:', { 
          error: stripeError, 
          userId: user.id, 
          stripePaymentMethodId: (paymentMethod as Record<string, unknown>).stripe_payment_method_id as string
        })
        // Don't fail the request if Stripe detach fails
      }
    }

    logger.info('Payment method removed successfully:', {
      userId: user.id,
      paymentMethodId,
      stripePaymentMethodId: (paymentMethod as Record<string, unknown>).stripe_payment_method_id as string
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Payment method removed successfully' 
    })

  } catch (error) {
    logger.error('Payment methods DELETE error:', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 