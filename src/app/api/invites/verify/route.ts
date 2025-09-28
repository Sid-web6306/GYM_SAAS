import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'
import { hashToken } from '@/lib/invite-utils'


// GET /api/invites/verify?invite=... - Verify invitation token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('invite')

    if (!token) {
      return NextResponse.json({ 
        error: 'Invite token is required',
        valid: false 
      }, { status: 400 })
    }

    // Use server client - RPC function handles security
    const supabase = await createClient()
    
    logger.info('Verifying invitation token via RPC')
    
    // Hash the token to match stored version
    const hashedToken = hashToken(token)
    
    // Call the secure RPC function for token verification
    const { data: verificationResult, error: rpcError } = await supabase
      .rpc('verify_invitation_by_hash', { hashed_token_param: hashedToken })

    if (rpcError) {
      logger.error('RPC verification error:', { error: rpcError.message })
      return NextResponse.json({ 
        error: 'Internal server error',
        valid: false 
      }, { status: 500 })
    }

    // Cast the result to the expected type
    const result = verificationResult as { valid: boolean; error?: string; [key: string]: unknown } | null

    if (!result?.valid) {
      logger.warn('Invalid invitation token attempted:', { token: token.substring(0, 8) + '...' })
      return NextResponse.json({ 
        error: result?.error || 'Invalid invitation token',
        valid: false 
      }, { status: 404 })
    }

    // Return the verification result directly from RPC
    return NextResponse.json(result)

  } catch (error) {
    logger.error('Invitation verification error:', {error})
    return NextResponse.json({ 
      error: 'Internal server error',
      valid: false 
    }, { status: 500 })
  }
}

// POST /api/invites/verify - Accept invitation (for authenticated users)
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    // Normalize email to lowercase for consistent comparison
    const normalizedEmail = user.email.toLowerCase().trim()

    logger.info('Accepting invitation via RPC', { 
      userId: user.id, 
      email: user.email,
      normalizedEmail 
    })

    // Hash the token to match stored version
    const hashedToken = hashToken(token)

    // Debug: Log the parameters being sent to RPC
    logger.info('RPC parameters:', {
      hashedToken: hashedToken.substring(0, 10) + '...',
      userId: user.id,
      userEmail: normalizedEmail,
      originalEmail: user.email,
      tokenLength: hashedToken.length
    })

    // Call the secure RPC function for invitation acceptance
    const { data: acceptanceResult, error: rpcError } = await supabase
      .rpc('accept_invitation_by_hash', {
        hashed_token_param: hashedToken,
        user_id_param: user.id,
        user_email_param: normalizedEmail
      })

    if (rpcError) {
      logger.error('RPC acceptance error:', { error: rpcError.message })
      return NextResponse.json({ 
        error: 'Internal server error',
        success: false 
      }, { status: 500 })
    }

    // Cast the result to the expected type
    const result = acceptanceResult as { success: boolean; error?: string; [key: string]: unknown } | null

    if (!result?.success) {
      const errorMessage = result?.error || 'Failed to accept invitation'
      const statusCode = errorMessage.includes('different email') ? 400 :
                         errorMessage.includes('already have a role') ? 409 :
                         errorMessage.includes('Invalid') || errorMessage.includes('expired') ? 404 : 400

      logger.warn('Invitation acceptance failed:', { 
        error: errorMessage, 
        userId: user.id,
        email: user.email,
        details: result?.details,
        fullResult: result 
      })

      return NextResponse.json({
        success: false,
        error: errorMessage,
        ...(result?.details && typeof result.details === 'object' ? { details: result.details } : {})
      }, { status: statusCode })
    }

    logger.info('Invitation accepted successfully', { 
      userId: user.id,
      gymId: (result as { assignment?: { gym_id?: string; role?: string } })?.assignment?.gym_id,
      role: (result as { assignment?: { gym_id?: string; role?: string } })?.assignment?.role
    })

    // Return the success result directly from RPC
    return NextResponse.json(result)

  } catch (error) {
    logger.error('Invitation acceptance error:', { error })
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false 
    }, { status: 500 })
  }
}
