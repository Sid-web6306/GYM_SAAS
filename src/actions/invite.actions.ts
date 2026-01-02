'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { InvitationService, createInviteSchema, type InviteResult } from '@/services/invitation/invitation-service'
import { checkUserPermission } from '@/actions/rbac.actions'
import { logger } from '@/lib/logger'

// Re-export types for consumers
export type { InviteResult as CreateInviteResult }

/**
 * Create invitation - Server Action for form submissions
 */
export async function createInvitation(formData: FormData): Promise<InviteResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Parse form data
    const rawData = {
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      gym_id: (formData.get('gym_id') as string) || undefined,
      expires_in_hours: parseInt(formData.get('expires_in_hours') as string || '72'),
      message: (formData.get('message') as string) || undefined,
      notify_user: formData.get('notify_user') === 'true',
      metadata: formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : undefined
    }

    const validatedData = createInviteSchema.parse(rawData)
    
    const service = new InvitationService(supabase, user)
    const result = await service.createInvitation(validatedData)

    if (result.success) {
      revalidatePath('/settings')
      revalidatePath('/dashboard')
    }

    return result
  } catch (error) {
    logger.error('createInvitation action error:', { error: String(error) })
    return { success: false, error: 'Failed to create invitation' }
  }
}

/**
 * Revoke invitation - Server Action
 */
export async function revokeInvitation(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const inviteId = formData.get('invite_id') as string
    if (!inviteId) {
      return { success: false, error: 'Invitation ID is required' }
    }

    const service = new InvitationService(supabase, user)
    const result = await service.revokeInvitation(inviteId)

    if (result.success) {
      revalidatePath('/settings')
      revalidatePath('/dashboard')
    }

    return result
  } catch (error) {
    logger.error('revokeInvitation action error:', { error: String(error) })
    return { success: false, error: 'Failed to revoke invitation' }
  }
}

/**
 * Resend invitation - Server Action
 */
export async function resendInvitation(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const inviteId = formData.get('invite_id') as string
    if (!inviteId) {
      return { success: false, error: 'Invitation ID is required' }
    }

    const service = new InvitationService(supabase, user)
    const result = await service.resendInvitation(inviteId)

    if (result.success) {
      revalidatePath('/settings')
      revalidatePath('/dashboard')
    }

    return {
      success: result.success,
      error: result.error,
      message: result.success ? `Invitation resent successfully` : undefined,
      invite_url: result.invitation?.invite_url
    }
  } catch (error) {
    logger.error('resendInvitation action error:', { error: String(error) })
    return { success: false, error: 'Failed to resend invitation' }
  }
}

/**
 * Get gym invitations - Server Action for data fetching
 */
export async function getGymInvitations(gym_id?: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required', invitations: [] }
    }

    // Resolve gym ID
    let targetGymId = gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase.from('profiles').select('gym_id').eq('id', user.id).single()
      targetGymId = profile?.gym_id ?? undefined
    }

    if (!targetGymId) {
      return { success: false, error: 'No gym association found', invitations: [] }
    }

    // Check permissions
    const canView = await checkUserPermission(user.id, targetGymId, 'staff.read')
    if (!canView) {
      return { success: false, error: 'Insufficient permissions', invitations: [] }
    }

    // Fetch invitations
    const { data: invitations, error: fetchError } = await supabase
      .from('gym_invitations')
      .select(`
        id, email, role, status, expires_at, accepted_at, metadata, created_at, updated_at,
        accepted_by:profiles!gym_invitations_accepted_by_fkey(id, full_name, email)
      `)
      .eq('gym_id', targetGymId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error('Error fetching invitations:', { error: fetchError.message })
      return { success: false, error: 'Failed to fetch invitations', invitations: [] }
    }

    return { success: true, invitations: invitations || [] }
  } catch (error) {
    logger.error('getGymInvitations action error:', { error: String(error) })
    return { success: false, error: 'Failed to fetch invitations', invitations: [] }
  }
}
