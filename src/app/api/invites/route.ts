import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'
import { InvitationService, createInviteSchema } from '@/lib/invitation-service'

// Schema for update operations
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
    const status = (allowedStatuses as readonly string[]).includes(rawStatus) ? rawStatus : 'pending'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve gym ID
    let targetGymId = gym_id ?? undefined
    if (!targetGymId) {
      const { data: profile } = await supabase.from('profiles').select('gym_id').eq('id', user.id).single()
      targetGymId = profile?.gym_id ?? undefined
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, targetGymId, 'staff.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('gym_invitations')
      .select(`
        id, email, role, status, expires_at, accepted_at, metadata, created_at, updated_at,
        invited_by:profiles!gym_invitations_invited_by_fkey(id, full_name, email),
        accepted_by:profiles!gym_invitations_accepted_by_fkey(id, full_name, email)
      `)
      .eq('gym_id', targetGymId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invitations, error: fetchError } = await query

    if (fetchError) {
      logger.error('Error fetching invitations:', { fetchError })
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Get count
    let countQuery = supabase.from('gym_invitations').select('*', { count: 'exact', head: true }).eq('gym_id', targetGymId)
    if (status !== 'all') countQuery = countQuery.eq('status', status)
    const { count } = await countQuery

    return NextResponse.json({
      invitations: invitations || [],
      pagination: { total: count || 0, limit, offset, hasMore: (count || 0) > offset + limit }
    })

  } catch (error) {
    logger.error('Invitations GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invites - Create invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createInviteSchema.parse(body)
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = new InvitationService(supabase, user)
    const result = await service.createInvitation(validatedData)

    if (!result.success) {
      const status = result.error?.includes('permission') ? 403 
        : result.error?.includes('already') ? 409 
        : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({
      success: true,
      warning: result.warning,
      emailSent: result.emailSent,
      invitation: result.invitation
    }, { status: 201 })

  } catch (error) {
    logger.error('Invitations POST error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/invites - Update invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = updateInviteSchema.parse(body)
    
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('gym_invitations')
      .select('gym_id')
      .eq('id', validatedData.invite_id)
      .single()

    if (fetchError || !invitation?.gym_id) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check permissions
    const canUpdate = await checkUserPermission(user.id, invitation.gym_id, 'staff.update')
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.role) updateData.role = validatedData.role
    if (validatedData.expires_at) updateData.expires_at = validatedData.expires_at

    const { data: updated, error: updateError } = await supabase
      .from('gym_invitations')
      .update(updateData)
      .eq('id', validatedData.invite_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, invitation: updated })

  } catch (error) {
    logger.error('Invitations PUT error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/invites - Revoke invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invite_id = searchParams.get('invite_id')

    if (!invite_id) {
      return NextResponse.json({ error: 'invite_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = new InvitationService(supabase, user)
    const result = await service.revokeInvitation(invite_id)

    if (!result.success) {
      const status = result.error?.includes('permission') ? 403 : result.error?.includes('not found') ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ success: true, message: result.message })

  } catch (error) {
    logger.error('Invitations DELETE error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
