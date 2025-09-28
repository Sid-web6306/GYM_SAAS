import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'
import { generateSecureToken, hashToken } from '@/lib/invite-utils'
import { rateLimit } from '@/lib/sanitization'
import type { GymRole } from '@/types/rbac.types'

// Validation schemas
const createInviteSchema = z.object({
  email: z.string().email('Valid email address is required'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid().optional(),
  expires_in_hours: z.number().min(1).max(168).default(72), // 1 hour to 7 days, default 3 days
  message: z.string().max(500).optional(),
  notify_user: z.boolean().default(true)
})

const updateInviteSchema = z.object({
  invite_id: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional(),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']).optional(),
  expires_at: z.string().datetime().optional()
})

// GET /api/invites - Get gym invitations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gym_id = searchParams.get('gym_id')
    const rawStatus = searchParams.get('status') || 'pending'
    const allowedStatuses = ['pending', 'accepted', 'expired', 'revoked', 'all'] as const
    type AllowedStatus = typeof allowedStatuses[number]
    const status: AllowedStatus = (allowedStatuses as readonly string[]).includes(rawStatus)
      ? (rawStatus as AllowedStatus)
      : 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's gym_id if not provided
    let targetGymId: string | undefined = gym_id ?? undefined
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id ?? undefined
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
    }

    // Check if user has permission to view invitations
    const canViewInvites = await checkUserPermission(user.id, targetGymId, 'staff.read')
    if (!canViewInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('gym_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        accepted_at,
        metadata,
        created_at,
        updated_at,
        invited_by:profiles!gym_invitations_invited_by_fkey(
          id,
          full_name,
          email
        ),
        accepted_by:profiles!gym_invitations_accepted_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('gym_id', targetGymId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invitations, error: fetchError } = await query

    if (fetchError) {
      logger.error('Error fetching invitations:', {fetchError})
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('gym_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', targetGymId)
    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }
    const { count, error: countError } = await countQuery

    if (countError) {
      logger.error('Error counting invitations:', {countError})
    }

    return NextResponse.json({
      invitations: invitations || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Invitations GET error:', {error})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invites - Create invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = createInviteSchema.parse(body)
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting (5 invitations per minute per user)
    const rateLimitKey = `invite_create:${user.id}`
    if (!rateLimit.check(rateLimitKey, 5, 60 * 1000)) {
      logger.warn('Rate limit exceeded for invitation creation', { userId: user.id })
      return NextResponse.json({ 
        error: 'Too many invitation requests. Please wait before sending more invitations.',
        code: 'RATE_LIMIT_EXCEEDED' 
      }, { status: 429 })
    }

    // Get user's gym_id if not provided
    let targetGymId = validatedData.gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id ?? ''
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
    }

    // Check if user has permission to create invitations
    const canCreateInvites = await checkUserPermission(user.id, targetGymId, 'staff.create')
    if (!canCreateInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.rpc('get_user_id_by_email', {
      p_email: validatedData.email
    })

    if (existingUser) {
      // Check if user already has a role in this gym
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', existingUser)
        .eq('gym_id', targetGymId)
        .eq('is_active', true)
        .single()

      if (existingRole) {
        return NextResponse.json({ 
          error: 'User already has a role in this gym',
          details: { current_role: existingRole.role }
        }, { status: 409 })
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('gym_invitations')
      .select('id, status, expires_at')
      .eq('gym_id', targetGymId)
      .eq('email', validatedData.email)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      // Check if existing invite is still valid
      if (new Date(existingInvite.expires_at) > new Date()) {
        return NextResponse.json({ 
          error: 'Active invitation already exists for this email',
          details: { 
            invite_id: existingInvite.id,
            expires_at: existingInvite.expires_at
          }
        }, { status: 409 })
      }
    }

    // Generate secure token
    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + validatedData.expires_in_hours)

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('gym_invitations')
      .insert({
        gym_id: targetGymId,
        invited_by: user.id,
        email: validatedData.email,
        role: validatedData.role,
        token: hashToken(token), // Store hashed version
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        metadata: {
          message: validatedData.message,
          notify_user: validatedData.notify_user,
          invited_by_name: user.user_metadata?.full_name || user.email
        }
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating invitation:', {createError})
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }

    // Send invitation email if notify_user is true
    if (validatedData.notify_user) {
      try {
        await sendInvitationEmail({
          email: validatedData.email,
          token: token, // Send raw token in email
          role: validatedData.role,
          gym_id: targetGymId,
          invited_by: user.user_metadata?.full_name || user.email || 'Gym Admin',
          message: validatedData.message,
          expires_at: expiresAt
        })
      } catch (emailError) {
        logger.error('Error sending invitation email:', {emailError})
        // Don't fail the invitation creation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
        invite_link: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?invite=${token}`
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Invitations POST error:', {error})
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/invites - Update invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateInviteSchema.parse(body)
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation and check permissions
    const { data: invitation, error: fetchError } = await supabase
      .from('gym_invitations')
      .select('gym_id, status, email, role')
      .eq('id', validatedData.invite_id)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user has permission to update invitations
    if (!invitation.gym_id) {
      return NextResponse.json({ error: 'Invalid invitation - no gym associated' }, { status: 400 })
    }
    
    const canUpdateInvites = await checkUserPermission(user.id, invitation.gym_id, 'staff.update')
    if (!canUpdateInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.role) updateData.role = validatedData.role
    if (validatedData.expires_at) updateData.expires_at = validatedData.expires_at

    // Update invitation
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('gym_invitations')
      .update(updateData)
      .eq('id', validatedData.invite_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating invitation:', {updateError})
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation
    })

  } catch (error) {
    logger.error('Invitations PUT error:', {error})
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/invites - Delete/revoke invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invite_id = searchParams.get('invite_id')

    if (!invite_id) {
      return NextResponse.json({ error: 'invite_id is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation and check permissions
    const { data: invitation, error: fetchError } = await supabase
      .from('gym_invitations')
      .select('gym_id, status')
      .eq('id', invite_id)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if user has permission to delete invitations
    if (!invitation.gym_id) {
      return NextResponse.json({ error: 'Invalid invitation - no gym associated' }, { status: 400 })
    }
    
    const canDeleteInvites = await checkUserPermission(user.id, invitation.gym_id, 'staff.delete')
    if (!canDeleteInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Revoke invitation (don't actually delete for audit trail)
    const { error: revokeError } = await supabase
      .from('gym_invitations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', invite_id)

    if (revokeError) {
      logger.error('Error revoking invitation:', {revokeError})
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    })

  } catch (error) {
    logger.error('Invitations DELETE error:', {error})
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to send invitation email
async function sendInvitationEmail({
  email,
  token,
  role,
  gym_id,
  invited_by,
  message,
  expires_at
}: {
  email: string
  token: string
  role: GymRole
  gym_id: string
  invited_by: string
  message?: string
  expires_at: Date
}) {
  // Get gym information
  const supabase = await createClient()
  const { data: gym } = await supabase
    .from('gyms')
    .select('name')
    .eq('id', gym_id)
    .single()

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?invite=${token}`
  
  // TODO: Implement email sending logic here
  // You can use Supabase's built-in email or a service like Resend, SendGrid, etc.
  
  logger.info('Invitation email would be sent:', {
    to: email,
    role,
    gym_name: gym?.name,
    message,
    invited_by,
    invite_url: inviteUrl,
    expires_at: expires_at.toISOString()
  })

  // For now, just log the invitation details
  // In production, replace this with actual email sending logic
}
