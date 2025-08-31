import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/members/me - Get own member profile
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    logger.info('Fetching member profile for user', { userId: user.id })

    // Get member profile for authenticated user
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        // No member record found
        return NextResponse.json({ 
          error: 'No member record found for authenticated user' 
        }, { status: 404 })
      }
      
      logger.error('Error fetching member profile:', {memberError})
      return NextResponse.json({ 
        error: 'Failed to fetch member profile' 
      }, { status: 500 })
    }

    // Return member profile
    return NextResponse.json({
      success: true,
      member: member
    })

  } catch (error) {
    logger.error('Error in /api/members/me:', {error})
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
