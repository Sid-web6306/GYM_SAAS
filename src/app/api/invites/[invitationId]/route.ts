import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// GET /api/invites/[invitationId] - Get single invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch invitation with details
    const { data: invitation, error: fetchError } = await supabase
      .from('gym_invitations')
      .select(`
        id,
        gym_id,
        email,
        role,
        status,
        token,
        expires_at,
        accepted_at,
        metadata,
        created_at,
        updated_at,
        accepted_by:profiles!gym_invitations_accepted_by_fkey(
          id,
          full_name,
          email
        ),
        gym:gyms(
          id,
          name
        )
      `)
      .eq('id', invitationId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
      }
      logger.error('Error fetching invitation:', { fetchError })
      return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 })
    }

    // Check permissions - user must have access to the gym
    if (!invitation.gym_id) {
      return NextResponse.json({ error: 'Invalid invitation data' }, { status: 400 })
    }
    const canView = await checkUserPermission(user.id, invitation.gym_id, 'staff.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.json({ invitation })

  } catch (error) {
    logger.error('Invitation GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
