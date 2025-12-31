/**
 * Invitation Service - Core business logic for gym invitations
 * Single source of truth for invitation operations
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { generateSecureToken, hashToken, generateInviteUrl } from '@/lib/invite-utils'
import { sendInvitationEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/sanitization'
import type { User } from '@supabase/supabase-js'

// ========== VALIDATION SCHEMA ==========

export const createInviteSchema = z.object({
  email: z.string().email('Valid email address is required'),
  role: z.enum(['owner', 'manager', 'staff', 'trainer', 'member']),
  gym_id: z.string().uuid().optional(),
  expires_in_hours: z.number().min(1).max(168).default(72),
  message: z.string().max(500).optional(),
  notify_user: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional()
})

export type CreateInviteInput = z.infer<typeof createInviteSchema>

// ========== RESULT TYPES ==========

export interface InviteResult {
  success: boolean
  error?: string
  warning?: string
  emailSent?: boolean
  invitation?: {
    id: string
    email: string
    role: string
    status: string
    expires_at: string
    created_at: string
    invite_url: string
  }
}

// ========== CORE SERVICE ==========

export class InvitationService {
  constructor(
    private supabase: SupabaseClient,
    private user: User
  ) {}

  /**
   * Create a new invitation
   */
  async createInvitation(input: CreateInviteInput): Promise<InviteResult> {
    try {
      // Rate limiting
      const rateLimitKey = `invite:${this.user.id}`
      if (!rateLimit.check(rateLimitKey, 5, 60 * 1000)) {
        return { success: false, error: 'Too many invitation requests. Please wait.' }
      }

      // Normalize email
      const email = input.email.toLowerCase().trim()

      // Resolve gym ID
      const gymId = await this.resolveGymId(input.gym_id)
      if (!gymId) {
        return { success: false, error: 'No gym association found' }
      }

      // Check permissions
      const canCreate = await checkUserPermission(this.user.id, gymId, 'staff.create')
      if (!canCreate) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Check for existing user with role
      const existingCheck = await this.checkExistingUserRole(email, gymId)
      if (existingCheck.error) {
        return { success: false, error: existingCheck.error }
      }

      // Check for active pending invitation
      const pendingCheck = await this.checkPendingInvitation(email, gymId)
      if (pendingCheck.error) {
        return { success: false, error: pendingCheck.error }
      }

      // Generate token and expiration
      const token = generateSecureToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + input.expires_in_hours)

      // Create invitation
      const { data: invitation, error: createError } = await this.supabase
        .from('gym_invitations')
        .insert({
          gym_id: gymId,
          invited_by: this.user.id,
          email,
          role: input.role,
          token: hashToken(token),
          expires_at: expiresAt.toISOString(),
          status: 'pending',
          metadata: {
            ...input.metadata,
            message: input.message,
            notify_user: input.notify_user,
            invited_by_name: this.user.user_metadata?.full_name || this.user.email
          }
        })
        .select()
        .single()

      if (createError) {
        logger.error('Invitation creation failed:', { error: createError.message })
        if (createError.code === '23505') {
          return { success: false, error: 'An active invitation already exists for this email' }
        }
        return { success: false, error: 'Failed to create invitation' }
      }

      const inviteUrl = generateInviteUrl(token)

      // Send email if requested
      if (input.notify_user) {
        const emailResult = await this.sendInvitationEmail(email, gymId, input.role, input.message, inviteUrl, expiresAt.toISOString())
        
        if (!emailResult.success) {
          return {
            success: true,
            warning: `Invitation created but email failed: ${emailResult.error}`,
            emailSent: false,
            invitation: this.formatInvitation(invitation, inviteUrl)
          }
        }
      }

      return {
        success: true,
        emailSent: input.notify_user,
        invitation: this.formatInvitation(invitation, inviteUrl)
      }

    } catch (error) {
      logger.error('Invitation service error:', { error: String(error) })
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors[0].message }
      }
      return { success: false, error: 'Failed to create invitation' }
    }
  }

  /**
   * Resend an existing invitation
   */
  async resendInvitation(inviteId: string): Promise<InviteResult> {
    try {
      // Get invitation
      const { data: invitation, error: fetchError } = await this.supabase
        .from('gym_invitations')
        .select('id, gym_id, email, role, status, metadata')
        .eq('id', inviteId)
        .single()

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (!invitation.gym_id) {
        return { success: false, error: 'Invalid invitation' }
      }

      // Check permissions
      const canUpdate = await checkUserPermission(this.user.id, invitation.gym_id, 'staff.update')
      if (!canUpdate) {
        return { success: false, error: 'Insufficient permissions' }
      }

      if (invitation.status === 'accepted') {
        return { success: false, error: 'Cannot resend accepted invitation' }
      }

      // Generate new token
      const newToken = generateSecureToken()
      const newExpiresAt = new Date()
      newExpiresAt.setHours(newExpiresAt.getHours() + 72)

      // Update invitation
      const { error: updateError } = await this.supabase
        .from('gym_invitations')
        .update({
          token: hashToken(newToken),
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteId)

      if (updateError) {
        return { success: false, error: 'Failed to update invitation' }
      }

      const inviteUrl = generateInviteUrl(newToken)
      const message = invitation.metadata?.message as string | undefined

      // Send email
      const emailResult = await this.sendInvitationEmail(
        invitation.email,
        invitation.gym_id,
        invitation.role,
        message,
        inviteUrl,
        newExpiresAt.toISOString()
      )

      if (!emailResult.success) {
        return { success: false, error: `Failed to send email: ${emailResult.error}` }
      }

      return {
        success: true,
        emailSent: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: 'pending',
          expires_at: newExpiresAt.toISOString(),
          created_at: '',
          invite_url: inviteUrl
        }
      }
    } catch (error) {
      logger.error('Resend invitation error:', { error: String(error) })
      return { success: false, error: 'Failed to resend invitation' }
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(inviteId: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const { data: invitation, error: fetchError } = await this.supabase
        .from('gym_invitations')
        .select('gym_id, email')
        .eq('id', inviteId)
        .single()

      if (fetchError || !invitation) {
        return { success: false, error: 'Invitation not found' }
      }

      if (!invitation.gym_id) {
        return { success: false, error: 'Invalid invitation' }
      }

      const canDelete = await checkUserPermission(this.user.id, invitation.gym_id, 'staff.delete')
      if (!canDelete) {
        return { success: false, error: 'Insufficient permissions' }
      }

      const { error: revokeError } = await this.supabase
        .from('gym_invitations')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', inviteId)

      if (revokeError) {
        return { success: false, error: 'Failed to revoke invitation' }
      }

      return { success: true, message: `Invitation for ${invitation.email} revoked` }
    } catch (error) {
      logger.error('Revoke invitation error:', { error: String(error) })
      return { success: false, error: 'Failed to revoke invitation' }
    }
  }

  // ========== PRIVATE HELPERS ==========

  private async resolveGymId(providedGymId?: string): Promise<string | null> {
    if (providedGymId) return providedGymId

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('gym_id')
      .eq('id', this.user.id)
      .single()

    return profile?.gym_id ?? null
  }

  private async checkExistingUserRole(email: string, gymId: string): Promise<{ error?: string }> {
    const { data: existingUserId } = await this.supabase.rpc('get_user_id_by_email', { p_email: email })

    if (existingUserId) {
      const { data: existingRole } = await this.supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUserId)
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .single()

      if (existingRole) {
        return { error: 'User already has a role in this gym' }
      }
    }
    return {}
  }

  private async checkPendingInvitation(email: string, gymId: string): Promise<{ error?: string }> {
    // Clean up expired invitations first
    await this.supabase
      .from('gym_invitations')
      .update({ status: 'expired' })
      .eq('gym_id', gymId)
      .eq('email', email)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    const { data: existingInvite } = await this.supabase
      .from('gym_invitations')
      .select('expires_at')
      .eq('gym_id', gymId)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (existingInvite && new Date(existingInvite.expires_at) > new Date()) {
      return { error: 'An active invitation already exists for this email' }
    }
    return {}
  }

  private async sendInvitationEmail(
    email: string,
    gymId: string,
    role: string,
    message: string | undefined,
    inviteUrl: string,
    expiresAt: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const [gymData, inviterProfile] = await Promise.all([
        this.supabase.from('gyms').select('name').eq('id', gymId).single(),
        this.supabase.from('profiles').select('full_name, email').eq('id', this.user.id).single()
      ])

      return await sendInvitationEmail({
        recipientEmail: email,
        inviterName: inviterProfile.data?.full_name || this.user.user_metadata?.full_name || this.user.email || 'Gym Admin',
        inviterEmail: inviterProfile.data?.email ?? this.user.email ?? email,
        gymName: gymData.data?.name || 'Your Gym',
        role,
        message,
        inviteUrl,
        expiresAt
      })
    } catch (error) {
      logger.error('Email sending failed:', { error: String(error) })
      return { success: false, error: String(error) }
    }
  }

  private formatInvitation(invitation: Record<string, unknown>, inviteUrl: string) {
    return {
      id: invitation.id as string,
      email: invitation.email as string,
      role: invitation.role as string,
      status: invitation.status as string,
      expires_at: invitation.expires_at as string,
      created_at: invitation.created_at as string,
      invite_url: inviteUrl
    }
  }
}
