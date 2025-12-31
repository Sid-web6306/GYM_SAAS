import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// POST /api/invites/cleanup - Mark expired invitations
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the RPC function to mark expired invitations
    const { error } = await supabase.rpc('mark_expired_invitations')

    if (error) {
      logger.error('Failed to cleanup invitations:', { error })
      return NextResponse.json({ error: 'Failed to cleanup invitations' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Expired invitations marked' })

  } catch (error) {
    logger.error('Invitation cleanup error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
