import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// Validation schema for bulk member creation
const bulkCreateMemberSchema = z.object({
  gym_id: z.string().uuid(),
  members: z.array(z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email().nullable().optional(),
    phone_number: z.string().nullable().optional(),
    status: z.enum(['active', 'inactive', 'pending']).default('active'),
    join_date: z.string().optional()
  })).min(1, 'At least one member is required')
})

// POST /api/members/bulk - Bulk create members
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = bulkCreateMemberSchema.parse(body)

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

    // Prepare all members for insertion
    const insertData = validatedData.members.map(data => ({
      gym_id: validatedData.gym_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || null,
      phone_number: data.phone_number || null,
      status: data.status || 'active',
      join_date: data.join_date || new Date().toISOString()
    }))

    // Attempt bulk insert
    const { data: createdMembers, error: bulkError } = await supabase
      .from('members')
      .insert(insertData)
      .select('id, email, first_name, last_name')

    if (bulkError) {
      // If bulk insert fails, try individual inserts to identify which ones failed
      logger.warn('Bulk insert failed, falling back to individual inserts:', { error: bulkError.message })
      
      const success: Array<{ id: string; email: string | null; first_name: string; last_name: string }> = []
      const failed: Array<{ data: typeof insertData[0]; error: string }> = []

      for (const memberData of insertData) {
        try {
          const { data: createdMember, error: insertError } = await supabase
            .from('members')
            .insert(memberData)
            .select('id, email, first_name, last_name')
            .single()

          if (insertError) {
            failed.push({ data: memberData, error: insertError.message })
          } else if (createdMember) {
            success.push({
              id: createdMember.id,
              email: createdMember.email,
              first_name: createdMember.first_name || '',
              last_name: createdMember.last_name || ''
            })
          }
        } catch (err) {
          failed.push({ 
            data: memberData, 
            error: err instanceof Error ? err.message : 'Unknown error' 
          })
        }
      }

      logger.info('Bulk create fallback completed:', { 
        successCount: success.length, 
        failedCount: failed.length 
      })

      return NextResponse.json({
        success: success,
        failed: failed,
        summary: {
          total_requested: validatedData.members.length,
          success_count: success.length,
          failed_count: failed.length
        }
      }, { status: failed.length > 0 ? 207 : 201 }) // 207 Multi-Status if some failed
    }

    // Map database response to expected type
    const mappedMembers = (createdMembers || []).map(m => ({
      id: m.id,
      email: m.email,
      first_name: m.first_name || '',
      last_name: m.last_name || ''
    }))

    return NextResponse.json({
      success: mappedMembers,
      failed: [],
      summary: {
        total_requested: validatedData.members.length,
        success_count: mappedMembers.length,
        failed_count: 0
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Bulk members POST error:', { error })
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
