import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// Validation schemas
const createGymSchema = z.object({
  name: z.string().min(1, 'Gym name is required').max(100, 'Gym name too long'),
})

const updateGymSchema = z.object({
  name: z.string().min(1, 'Gym name is required').max(100, 'Gym name too long').optional(),
})

// Helper to resolve gym_id from user or parameter
async function resolveGymId(request: NextRequest, user: { id: string }): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  const gymId = searchParams.get('gym_id')
  
  if (gymId) return gymId
  
  // Get gym_id from user's profile
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('gym_id')
    .eq('id', user.id)
    .single()
  
  return profile?.gym_id || null
}

// GET /api/gyms - Fetch gym(s)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('id')

    if (gymId) {
      // Fetch specific gym
      const { data: gym, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
        }
        logger.error('Error fetching gym:', { error })
        return NextResponse.json({ error: 'Failed to fetch gym' }, { status: 500 })
      }

      // Check permissions
      const canView = await checkUserPermission(user.id, gymId, 'gym.read')
      if (!canView) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      return NextResponse.json({ gym })
    } else {
      // Fetch user's gym
      const userGymId = await resolveGymId(request, user)
      if (!userGymId) {
        return NextResponse.json({ error: 'No gym association found' }, { status: 400 })
      }

      const { data: gym, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', userGymId)
        .single()

      if (error) {
        logger.error('Error fetching user gym:', { error })
        return NextResponse.json({ error: 'Failed to fetch gym' }, { status: 500 })
      }

      return NextResponse.json({ gym })
    }

  } catch (error) {
    logger.error('Gym GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/gyms - Create new gym
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createGymSchema.parse(body)

    // Check if user has permission to create gyms (admin only)
    const canCreate = await checkUserPermission(user.id, '', 'gym.create')
    if (!canCreate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: gym, error } = await supabase
      .from('gyms')
      .insert({
        name: validatedData.name,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating gym:', { error })
      return NextResponse.json({ error: 'Failed to create gym' }, { status: 500 })
    }

    // Create user role for the creator (owner)
    await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        gym_id: gym.id,
        role_id: 'owner', // Assuming owner role exists
        is_active: true,
        created_at: new Date().toISOString()
      })

    // Update user's profile with gym_id
    await supabase
      .from('profiles')
      .update({ gym_id: gym.id })
      .eq('id', user.id)

    logger.info('Gym created successfully:', { gymId: gym.id, userId: user.id })

    return NextResponse.json({ gym }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    logger.error('Gym POST error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/gyms - Update gym
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const gymId = searchParams.get('id')
    
    if (!gymId) {
      return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateGymSchema.parse(body)

    // Check permissions
    const canUpdate = await checkUserPermission(user.id, gymId, 'gym.update')
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: gym, error } = await supabase
      .from('gyms')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', gymId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Gym not found' }, { status: 404 })
      }
      logger.error('Error updating gym:', { error })
      return NextResponse.json({ error: 'Failed to update gym' }, { status: 500 })
    }

    logger.info('Gym updated successfully:', { gymId, userId: user.id })

    return NextResponse.json({ gym })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    logger.error('Gym PUT error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
