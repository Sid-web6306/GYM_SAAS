'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { generateSecureToken, hashToken, calculateExpirationTime, generateInviteUrl } from '@/lib/invite-utils'
import { sendInvitationEmail as sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'


// ========== VALIDATION SCHEMAS ==========

const createInviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid('Invalid gym ID').optional(),
  expires_in_hours: z.number().min(1).max(168).default(72), // 1 hour to 7 days
  message: z.string().max(500).optional(),
  notify_user: z.boolean().default(true)
})

// Note: updateInviteSchema can be added later for batch update operations

// ========== INVITATION MANAGEMENT ACTIONS ==========

export interface CreateInviteResult {
  success: boolean
  error?: string
  warning?: string
  emailSent?: boolean
  invitation?: {
    id: string
    email: string
    role: string
    expires_at: string
    invite_url: string
  }
}

export async function createInvitation(formData: FormData): Promise<CreateInviteResult> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate form data
    const validatedData = createInviteSchema.parse({
      email: formData.get('email'),
      role: formData.get('role'),
      gym_id: formData.get('gym_id') || undefined,
      expires_in_hours: parseInt(formData.get('expires_in_hours') as string || '72'),
      message: formData.get('message') || undefined,
      notify_user: formData.get('notify_user') === 'true'
    })

    // Get user's gym_id if not provided
    let targetGymId: string | undefined = validatedData.gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id ?? undefined
    }

    if (!targetGymId) {
      return { success: false, error: 'No gym association found' }
    }

    // Check permissions
    const canCreateInvites = await checkUserPermission(user.id, targetGymId, 'staff.create')
    if (!canCreateInvites) {
      return { success: false, error: 'Insufficient permissions to send invitations' }
    }

    // Check if user already exists
    const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', {
      p_email: validatedData.email
    })

    if (existingUserId) {
      // Check if user already has a role in this gym
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role:roles(name)')
        .eq('user_id', existingUserId)
        .eq('gym_id', targetGymId)
        .eq('is_active', true)
        .single()

      if (existingRole) {
        return { 
          success: false, 
          error: `User already has a role in this gym` 
        }
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('gym_invitations')
      .select('id, expires_at')
      .eq('gym_id', targetGymId)
      .eq('email', validatedData.email)
      .eq('status', 'pending')
      .single()

    if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
      return { 
        success: false, 
        error: 'An active invitation already exists for this email address' 
      }
    }

    // Generate secure token and expiration
    const token = generateSecureToken()
    const expiresAt = calculateExpirationTime(validatedData.expires_in_hours)
    logger.info("RAW TOKEN (sent in email):", {token})
    logger.info("HASH STORED:", {hashtokenvalue: hashToken(token)})

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('gym_invitations')
      .insert({
        gym_id: targetGymId,
        invited_by: user.id,
        email: validatedData.email,
        role: validatedData.role,
        token: hashToken(token),
        expires_at: expiresAt,
        status: 'pending',
        metadata: {
          message: validatedData.message,
          notify_user: validatedData.notify_user,
          invited_by_name: user.user_metadata?.full_name || user.email
        }
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating invitation:', { error: createError.message })
      return { success: false, error: 'Failed to create invitation' }
    }

    // Generate invite URL
    const inviteUrl = generateInviteUrl(token)

    // Send email if requested
    if (validatedData.notify_user) {
      try {
        // Get gym and inviter details for email
        const { data: gymData } = await supabase
          .from('gyms')
          .select('name')
          .eq('id', targetGymId)
          .single()

        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        const emailResult = await sendEmail({
          recipientEmail: validatedData.email,
          inviterName: inviterProfile?.full_name || user.user_metadata?.full_name || user.email || 'Gym Admin',
          inviterEmail: inviterProfile?.email ?? user.email ?? validatedData.email,
          gymName: gymData?.name || 'Your Gym',
          role: validatedData.role,
          message: validatedData.message,
          inviteUrl,
          expiresAt: expiresAt
        })

        if (emailResult.success) {
          logger.info(`Invitation email sent to ${validatedData.email}`, { messageId: emailResult.messageId })
        } else {
          logger.error('Failed to send invitation email:', { error: emailResult.error || 'Unknown error' })
          // Return partial success - invitation created but email failed
          return {
            success: true,
            warning: `Invitation created but email failed to send: ${emailResult.error || 'Unknown error'}`,
            invitation: {
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              expires_at: invitation.expires_at,
              invite_url: inviteUrl
            },
            emailSent: false
          }
        }
      } catch (emailError) {
        logger.error('Failed to send invitation email:', { error: String(emailError) })
        // Return partial success - invitation created but email failed
        return {
          success: true,
          warning: `Invitation created but email failed to send: ${String(emailError)}`,
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at,
            invite_url: inviteUrl
          },
          emailSent: false
        }
      }
    }

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invite_url: inviteUrl
      },
      emailSent: true
    }

  } catch (error) {
    logger.error('Error in createInvitation:', { error: String(error) })
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: 'Failed to create invitation' }
  }
}

export async function revokeInvitation(formData: FormData) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const inviteId = formData.get('invite_id') as string
    
    if (!inviteId) {
      return { success: false, error: 'Invitation ID is required' }
    }

    // Get invitation and check permissions
    const { data: invitation, error: fetchError } = await supabase
      .from('gym_invitations')
      .select('gym_id, status, email')
      .eq('id', inviteId)
      .single()

    if (fetchError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    // Check permissions
    const canDeleteInvites = await checkUserPermission(user.id, invitation.gym_id, 'staff.delete')
    if (!canDeleteInvites) {
      return { success: false, error: 'Insufficient permissions to revoke invitations' }
    }

    // Revoke invitation
    const { error: revokeError } = await supabase
      .from('gym_invitations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', inviteId)

    if (revokeError) {
      logger.error('Error revoking invitation:', { error: revokeError.message })
      return { success: false, error: 'Failed to revoke invitation' }
    }

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      message: `Invitation for ${invitation.email} has been revoked` 
    }

  } catch (error) {
    logger.error('Error in revokeInvitation:', { error: String(error) })
    return { success: false, error: 'Failed to revoke invitation' }
  }
}

export async function resendInvitation(formData: FormData) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const inviteId = formData.get('invite_id') as string
    
    if (!inviteId) {
      return { success: false, error: 'Invitation ID is required' }
    }

    // Get invitation details
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
        metadata
      `)
      .eq('id', inviteId)
      .single()

    if (fetchError || !invitation) {
      return { success: false, error: 'Invitation not found' }
    }

    // Check permissions
    const canUpdateInvites = await checkUserPermission(user.id, invitation.gym_id, 'staff.update')
    if (!canUpdateInvites) {
      return { success: false, error: 'Insufficient permissions to resend invitations' }
    }

    // Check if invitation can be resent
    if (invitation.status === 'accepted') {
      return { success: false, error: 'Cannot resend an accepted invitation' }
    }

    // Fetch gym name for email contents
    const { data: gymData } = await supabase
      .from('gyms')
      .select('name')
      .eq('id', invitation.gym_id)
      .single()

    const gymName = gymData?.name || 'Your Gym'

    // Safely extract message from metadata
    const messageFromMetadata =
      invitation.metadata &&
      typeof invitation.metadata === 'object' &&
      !Array.isArray(invitation.metadata)
        ? (invitation.metadata as { message?: string }).message
        : undefined

    // Generate new token and extend expiration
    const newToken = generateSecureToken()
    const newExpiresAt = calculateExpirationTime(72) // 3 days from now

    // Update invitation with new token and expiration
    const { error: updateError } = await supabase
      .from('gym_invitations')
      .update({
        token: hashToken(newToken),
        expires_at: newExpiresAt,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', inviteId)

    if (updateError) {
      logger.error('Error updating invitation:', { error: updateError.message })
      return { success: false, error: 'Failed to update invitation' }
    }

    // Send new invitation email
    try {
      // Get inviter details for email
        const { data: inviterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

    const emailResult = await sendEmail({
      recipientEmail: invitation.email,
      inviterName: inviterProfile?.full_name || user.user_metadata?.full_name || 'Gym Admin',
      inviterEmail: inviterProfile?.email ?? user.email ?? invitation.email,
      gymName,
      role: invitation.role,
      message: messageFromMetadata,
      inviteUrl: generateInviteUrl(newToken),
      expiresAt: newExpiresAt
    })

      if (!emailResult.success) {
        logger.error('Failed to send resend invitation email:', { error: emailResult.error || 'Unknown error' })
        return { success: false, error: 'Failed to send invitation email' }
      }

      logger.info(`Invitation email resent to ${invitation.email}`, { messageId: emailResult.messageId })
    } catch (emailError) {
      logger.error('Error sending resend invitation email:', { error: String(emailError) })
      return { success: false, error: 'Failed to send invitation email' }
    }

    revalidatePath('/settings')
    revalidatePath('/dashboard')

    return { 
      success: true, 
      message: `Invitation resent to ${invitation.email}`,
      invite_url: generateInviteUrl(newToken)
    }

  } catch (error) {
    logger.error('Error in resendInvitation:', { error: String(error) })
    return { success: false, error: 'Failed to resend invitation' }
  }
}

// ========== DATA FETCHING ACTIONS ==========

export async function getGymInvitations(gym_id?: string) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Authentication required', invitations: [] }
    }

    // Get user's gym_id if not provided
    let targetGymId: string | undefined = gym_id
    if (!targetGymId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gym_id')
        .eq('id', user.id)
        .single()
      
      targetGymId = profile?.gym_id ?? undefined
    }

    if (!targetGymId) {
      return { success: false, error: 'No gym association found', invitations: [] }
    }

    // Check permissions
    const canViewInvites = await checkUserPermission(user.id, targetGymId, 'staff.read')
    if (!canViewInvites) {
      return { success: false, error: 'Insufficient permissions', invitations: [] }
    }

    // Fetch invitations with explicit profile joins to avoid RLS issues
    const { data: invitations, error: fetchError } = await supabase
      .from('gym_invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        accepted_at,
        metadata,
        created_at,
        updated_at,
        accepted_by:profiles!gym_invitations_accepted_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('gym_id', targetGymId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      logger.error('Error fetching invitations:', { error: fetchError.message })
      return { success: false, error: 'Failed to fetch invitations', invitations: [] }
    }
    return {
      success: true,
      invitations: invitations || []
    }

  } catch (error) {
    logger.error('Error in getGymInvitations:', { error: String(error) })
    return { success: false, error: 'Failed to fetch invitations', invitations: [] }
  }
}


