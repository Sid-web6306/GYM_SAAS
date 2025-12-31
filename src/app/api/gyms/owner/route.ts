import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// GET /api/gyms/owner - Get gym owner information
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('gym_id')

    if (!gymId) {
      return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 })
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, gymId, 'gym.read')
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error } = await supabase
      .rpc('get_gym_owner_info', { gym_uuid: gymId })
    
    if (error) {
      // Handle access denied (user not in gym) - return null
      if (error.message?.includes('Access denied')) {
        logger.info('Gym owner fetch: Access denied - user not member of gym')
        return NextResponse.json({ owner: null })
      }
      
      logger.error('Gym owner fetch error:', { error })
      return NextResponse.json({ error: 'Failed to fetch owner info' }, { status: 500 })
    }
    
    // RPC returns array with different field names, map to expected format
    if (data && data.length > 0) {
      const owner = data[0]
      const mappedOwner = {
        id: owner.owner_id,
        full_name: owner.owner_full_name,
        email: owner.owner_email
      }
      return NextResponse.json({ owner: mappedOwner })
    }
    
    return NextResponse.json({ owner: null })

  } catch (error) {
    logger.error('Gym owner GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
