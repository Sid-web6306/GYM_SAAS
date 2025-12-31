import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// Validation schemas
const createMemberSchema = z.object({
  gym_id: z.string().uuid(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  join_date: z.string().optional()
})

const updateMemberSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone_number: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  join_date: z.string().optional()
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

// GET /api/members - List members or get single member by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')
    const gymId = searchParams.get('gym_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

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

    // Single member lookup
    if (memberId) {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .eq('gym_id', targetGymId)
        .single()

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }
        logger.error('Error fetching member:', { memberError })
        return NextResponse.json({ error: 'Failed to fetch member' }, { status: 500 })
      }

      return NextResponse.json({ member })
    }

    // List members with optional filters
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .eq('gym_id', targetGymId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: members, error: membersError, count } = await query

    if (membersError) {
      logger.error('Error fetching members:', { membersError })
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    return NextResponse.json({
      members: members || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Members GET error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createMemberSchema.parse(body)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const canCreate = await checkUserPermission(user.id, validatedData.gym_id, 'members.create')
    if (!canCreate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create member
    const { data: member, error: createError } = await supabase
      .from('members')
      .insert({
        gym_id: validatedData.gym_id,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
        email: validatedData.email || null,
        phone_number: validatedData.phone_number || null,
        status: validatedData.status,
        join_date: validatedData.join_date || new Date().toISOString()
      })
      .select('*')
      .single()

    if (createError) {
      logger.error('Error creating member:', { createError })
      return NextResponse.json({ error: `Failed to create member: ${createError.message}` }, { status: 500 })
    }

    return NextResponse.json({ member }, { status: 201 })

  } catch (error) {
    logger.error('Members POST error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/members - Update a member
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateMemberSchema.parse(body)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member to verify gym ownership
    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('gym_id')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check permissions
    const canUpdate = await checkUserPermission(user.id, existingMember.gym_id, 'members.update')
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update member
    const { data: member, error: updateError } = await supabase
      .from('members')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select('*')
      .single()

    if (updateError) {
      logger.error('Error updating member:', { updateError })
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ member })

  } catch (error) {
    logger.error('Members PUT error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/members - Soft delete a member (mark as inactive)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member to verify gym ownership
    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('gym_id')
      .eq('id', memberId)
      .single()

    if (fetchError || !existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check permissions
    const canDelete = await checkUserPermission(user.id, existingMember.gym_id, 'members.delete')
    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete (mark as inactive)
    const { error: deleteError } = await supabase
      .from('members')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)

    if (deleteError) {
      logger.error('Error deleting member:', { deleteError })
      return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Member deleted successfully' })

  } catch (error) {
    logger.error('Members DELETE error:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
