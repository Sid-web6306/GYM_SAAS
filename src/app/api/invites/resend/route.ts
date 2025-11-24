import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'
import { checkUserPermission } from '@/actions/rbac.actions'
import { generateSecureToken, hashToken, calculateExpirationTime, generateInviteUrl } from '@/lib/invite-utils'
import { sendInvitationEmail as sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'

const resendInviteSchema = z.object({
  invite_id: z.string().uuid('Invalid invitation ID')
})

// POST /api/invites/resend - Resend invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validatedData = resendInviteSchema.parse(body)
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      .eq('id', validatedData.invite_id)
      .single()

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check permissions
    if (!invitation.gym_id) {
      return NextResponse.json({ error: 'Invalid invitation - no gym associated' }, { status: 400 })
    }
    
    const canUpdateInvites = await checkUserPermission(user.id, invitation.gym_id, 'staff.update')
    if (!canUpdateInvites) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if invitation can be resent
    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: 'Cannot resend an accepted invitation' }, { status: 400 })
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
      .eq('id', validatedData.invite_id)

    if (updateError) {
      logger.error('Error updating invitation:', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 })
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
        return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 })
      }

      logger.info(`Invitation email resent to ${invitation.email}`, { messageId: emailResult.messageId })
    } catch (emailError) {
      logger.error('Error sending resend invitation email:', { error: String(emailError) })
      return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${invitation.email}`,
      invite_url: generateInviteUrl(newToken)
    })

  } catch (error) {
    logger.error('Invitations resend error:', { error })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

