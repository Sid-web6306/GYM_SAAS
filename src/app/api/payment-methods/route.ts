/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getRazorpay } from '@/lib/razorpay'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const razorpay = getRazorpay()
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's payment methods from database
    const { data: paymentMethods, error: dbError } = await supabase
      .from('payment_methods')
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
    const razorpay = getRazorpay()
    if (!razorpay) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 })
    }

    const { 
      paymentMethodToken, 
      setAsDefault = false,
      cardDetails // For Razorpay, card details come from frontend
    } = await request.json()
    
    // Validate card details structure if provided
    if (cardDetails) {
      const requiredFields = ['type', 'last4'];
      const missingFields = requiredFields.filter(field => !cardDetails[field]);
      if (missingFields.length > 0) {
        return NextResponse.json({ 
          error: `Missing required card details: ${missingFields.join(', ')}` 
        }, { status: 400 })
      }
      
      // Validate card expiry if provided
      if (cardDetails.exp_month || cardDetails.exp_year) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        if (cardDetails.exp_year < currentYear || 
            (cardDetails.exp_year === currentYear && cardDetails.exp_month < currentMonth)) {
          return NextResponse.json({ 
            error: 'Card has expired' 
          }, { status: 400 })
        }
      }
    }
    
    if (!paymentMethodToken) {
      return NextResponse.json({ error: 'Payment method token is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For Razorpay, payment methods are typically handled differently
    // We'll store the token and card details directly in our database
    // Note: Razorpay doesn't have the same payment method concept as Stripe
    
    try {
      // Create or get Razorpay customer first
      const customerData = {
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
        email: user.email || '',
        contact: cardDetails?.phone || '',
        notes: {
          userId: user.id,
        }
      }

      // Try to find existing customer
      let customer;
      try {
        // Search for customer by email - Razorpay supports email-based search
        const customers = await razorpay.customers.all()
        customer = customers.items.find((c: any) => 
          c.email?.toLowerCase() === user.email?.toLowerCase()
        )
      } catch (searchError) {
        logger.error('Failed to search for existing customer:', { 
          error: searchError,
          email: user.email 
        })
        // Continue to create new customer
      }
      
      if (!customer) {
        try {
          customer = await razorpay.customers.create(customerData)
        } catch (createError) {
          logger.error('Failed to create Razorpay customer:', { 
            error: createError,
            userId: user.id 
          })
          throw createError;
        }
      }
      // Save payment method to database
      const { data: savedPaymentMethod, error: saveError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          razorpay_payment_method_id: paymentMethodToken,
          type: cardDetails?.type || 'card',
          card_brand: cardDetails?.brand || null,
          card_last4: cardDetails?.last4 || null,
          card_exp_month: cardDetails?.exp_month || null,
          card_exp_year: cardDetails?.exp_year || null,
          is_default: setAsDefault,
          is_active: true,
          metadata: {
            razorpay_customer_id: customer.id,
            // Only store non-sensitive card metadata
            card_network: cardDetails?.network,
            card_type:    cardDetails?.type,
            // Avoid storing full card details
          }
        })
        .select()
        .single()

      if (saveError) {
        logger.error('Error saving payment method:', { error: saveError, userId: user.id, paymentMethodToken })
        return NextResponse.json({ error: 'Failed to save payment method' }, { status: 500 })
      }

      // If this is set as default, update other payment methods
      if (setAsDefault) {
        const { error: updateError } = await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', savedPaymentMethod.id)

        if (updateError) {
          logger.error('Error updating other payment methods default status:', { error: updateError })
        }
      }

      logger.info('Payment method added successfully:', {
        userId: user.id,
        paymentMethodToken,
        type: cardDetails?.type || 'card',
        setAsDefault,
        savedPaymentMethodId: savedPaymentMethod.id
      })

      return NextResponse.json({ 
        success: true, 
        paymentMethodId: savedPaymentMethod.id,
        message: 'Payment method added successfully' 
      })

    } catch (razorpayError) {
      logger.error('Error with Razorpay payment method:', { 
        error: razorpayError instanceof Error ? razorpayError.message : String(razorpayError),
        userId: user.id, 
        paymentMethodToken 
      })
      return NextResponse.json({ error: 'Failed to process payment method' }, { status: 500 })
    }

  } catch (error) {
    logger.error('Payment methods POST error:', { error: error instanceof Error ? error.message : String(error) })
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

    // Use atomic RPC function to set default payment method
    if (setAsDefault) {
      const { error: rpcError } = await supabase.rpc('set_default_payment_method', {
        p_user_id: user.id,
        p_payment_method_id: paymentMethodId
      })

      if (rpcError) {
        logger.error('Error setting default payment method:', { 
          error: rpcError, 
          userId: user.id, 
          paymentMethodId 
        })
        return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
      }
    } else {
      // If not setting as default, just update the specified payment method
      const { error: updateError } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('id', paymentMethodId)
        .eq('user_id', user.id)

      if (updateError) {
        logger.error('Error updating payment method:', { 
          error: updateError, 
          userId: user.id, 
          paymentMethodId 
        })
        return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
      }
    }

    logger.info('Default payment method updated successfully:', {
      userId: user.id,
      paymentMethodId,
      setAsDefault
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Default payment method updated successfully' 
    })

  } catch (error) {
    logger.error('Payment methods PUT error:', { error: error instanceof Error ? error.message : String(error) })
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
    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('razorpay_payment_method_id, is_default')
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)
      .single()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Don't allow deletion of the default payment method if there are other active methods
    if (paymentMethod.is_default) {
      const { data: otherMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('id', paymentMethodId)

      if (otherMethods && otherMethods.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete default payment method. Please set another method as default first.' 
        }, { status: 400 })
      }
    }

    // Remove payment method from database (soft delete)
    const { error: removeError } = await supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', paymentMethodId)
      .eq('user_id', user.id)

    if (removeError) {
      logger.error('Error removing payment method:', { 
        error: removeError, 
        userId: user.id, 
        paymentMethodId 
      })
      return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
    }

    logger.info('Payment method removed successfully:', {
      userId: user.id,
      paymentMethodId,
      razorpayPaymentMethodId: paymentMethod.razorpay_payment_method_id
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