import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'
import { InvitationService, createInviteSchema } from '@/services/invitation/invitation-service'

// Validation schemas
const enablePortalSchema = z.object({
  member_id: z.string().uuid(),
  message: z.string().optional(),
  expires_in_hours: z.number().default(72),
  send_welcome_message: z.boolean().optional()
})

const bulkInviteSchema = z.object({
  gym_id: z.string().uuid(),
  member_ids: z.array(z.string().uuid()).min(1),
  message: z.string().optional(),
  expires_in_hours: z.number().default(72)
})

// Helper to get user's gym_id
async function getUserGymId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('gym_id')
    .eq('id', userId)
    .single()
  
  return profile?.gym_id || null
}

// GET /api/members/portal - Get portal stats, eligible members, or adoption view
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'stats', 'eligible', 'adoption'
    const gymId = searchParams.get('gym_id')
    const periodDays = parseInt(searchParams.get('period_days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve gym ID
    let targetGymId = gymId
    if (!targetGymId) {
      targetGymId = await getUserGymId(supabase, user.id)
    }

    if (!targetGymId) {
      return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, targetGymId, 'members.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    switch (action) {
      case 'stats': {
        const { data, error } = await supabase.rpc('get_member_portal_stats', {
          p_gym_id: targetGymId,
          p_period_days: periodDays
        })

        if (error) {
          logger.error('Failed to fetch portal stats:', { error })
          return NextResponse.json({ error: 'Failed to fetch portal stats' }, { status: 500 })
        }

        return NextResponse.json({ stats: data })
      }

      case 'eligible': {
        const { data, error } = await supabase.rpc('get_members_eligible_for_portal', {
          p_gym_id: targetGymId,
          p_limit: limit,
          p_offset: offset
        })

        if (error) {
          logger.error('Failed to fetch eligible members:', { error })
          return NextResponse.json({ error: 'Failed to fetch eligible members' }, { status: 500 })
        }

        return NextResponse.json({ members: data || [] })
      }

      case 'adoption': {
        const { data, error } = await supabase
          .from('member_portal_adoption')
          .select('*')
          .eq('gym_id', targetGymId)
          .order('member_created_at', { ascending: false })

        if (error) {
          logger.error('Failed to fetch portal adoption view:', { error })
          return NextResponse.json({ error: 'Failed to fetch portal adoption data' }, { status: 500 })
        }

        return NextResponse.json({ adoption: data || [] })
      }

      case 'check': {
        // Check if a specific member has portal access
        const memberId = searchParams.get('member_id')
        if (!memberId) {
          return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
        }

        const { data: member, error } = await supabase
          .from('members')
          .select('user_id')
          .eq('id', memberId)
          .eq('gym_id', targetGymId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
          }
          logger.error('Failed to check portal access:', { error })
          return NextResponse.json({ error: 'Failed to check portal access' }, { status: 500 })
        }

        return NextResponse.json({ hasPortalAccess: member?.user_id != null })
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: stats, eligible, adoption, or check' }, { status: 400 })
    }

  } catch (error) {
    logger.error('Portal GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/members/portal - Enable portal access for a member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle bulk invite action
    if (action === 'bulk-invite') {
      const validatedData = bulkInviteSchema.parse(body)

      // Check permissions
      const canInvite = await checkUserPermission(user.id, validatedData.gym_id, 'members.update')
      if (!canInvite) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { data, error } = await supabase.rpc('bulk_invite_members_to_portal', {
        p_gym_id: validatedData.gym_id,
        p_member_ids: validatedData.member_ids,
        p_message: validatedData.message || undefined,
        p_expires_in_hours: validatedData.expires_in_hours
      })

      if (error) {
        logger.error('Bulk portal invite failed:', { error })
        return NextResponse.json({ error: 'Failed to send bulk invitations' }, { status: 500 })
      }

      return NextResponse.json({ success: true, result: data })
    }

    // Handle single member portal enable
    const validatedData = enablePortalSchema.parse(body)

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', validatedData.member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (!member.email) {
      return NextResponse.json({ error: 'Member must have email for portal access' }, { status: 400 })
    }

    if (member.user_id) {
      return NextResponse.json({ error: 'Member already has portal access' }, { status: 400 })
    }

    // Check permissions
    const canInvite = await checkUserPermission(user.id, member.gym_id, 'members.update')
    if (!canInvite) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create invitation via InvitationService
    const inviteData = createInviteSchema.parse({
      email: member.email,
      role: 'member' as const,
      gym_id: member.gym_id,
      expires_in_hours: validatedData.expires_in_hours,
      message: validatedData.message,
      notify_user: true,
      metadata: {
        member_id: validatedData.member_id,
        member_name: `${member.first_name} ${member.last_name}`.trim(),
        portal_invitation: true,
        custom_message: validatedData.message,
        send_welcome_message: validatedData.send_welcome_message
      }
    })

    const service = new InvitationService(supabase, user)
    const result = await service.createInvitation(inviteData)

    if (!result.success) {
      logger.error('Portal access enablement failed:', { error: result.error })
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to create portal invitation' 
      }, { status: 400 })
    }

    logger.info('Portal access enabled successfully:', { 
      memberId: validatedData.member_id, 
      invitationId: result.invitation?.id 
    })

    return NextResponse.json({
      success: true,
      invitation_id: result.invitation?.id,
      warning: result.warning,
      emailSent: result.emailSent
    }, { status: 201 })

  } catch (error) {
    logger.error('Portal POST error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/members/portal - Track portal activation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, member_id } = body

    if (!user_id || !member_id) {
      return NextResponse.json({ error: 'user_id and member_id are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.rpc('track_member_portal_activation', {
      p_user_id: user_id,
      p_member_id: member_id
    })

    if (error) {
      logger.error('Portal activation tracking failed:', { error })
      return NextResponse.json({ error: 'Failed to track portal activation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Portal PUT error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
