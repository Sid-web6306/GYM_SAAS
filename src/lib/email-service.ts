/**
 * Email Service - Handles sending emails via MSG91
 * Clean, minimal implementation with template support
 */

import { type InvitationEmailData } from './email-templates/invitation-email'
import { sendTemplateEmailViaMSG91 } from './msg91'
import { logger } from './logger'
import { serverConfig } from './config'

// Re-export the type for consumers
export type { InvitationEmailData }

/**
 * Email service interface
 */
interface EmailService {
  sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult>
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Development email service - logs emails instead of sending them
 */
class DevEmailService implements EmailService {
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
    console.log('\n📧 === EMAIL (Development Mode) ===')
    console.log('To:', data.recipientEmail)
    console.log('Gym:', data.gymName)
    console.log('Role:', data.role)
    console.log('Inviter:', data.inviterName)
    console.log('Invite URL:', data.inviteUrl)
    console.log('Message:', data.message || 'N/A')
    console.log('===================================\n')
    
    return { 
      success: true, 
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    }
  }
}

/**
 * MSG91 email service implementation
 */
class MSG91EmailService implements EmailService {
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
    try {
      const { msg91InvitationTemplateId, systemFromEmail, msg91EmailDomain, msg91BrandName } = serverConfig
      
      if (!msg91InvitationTemplateId) {
        return { success: false, error: 'MSG91 invitation template ID not configured' }
      }

      const result = await sendTemplateEmailViaMSG91({
        to: [{ email: data.recipientEmail, name: data.recipientName }],
        from: { 
          email: systemFromEmail || 'noreply@yourgym.com', 
          name: msg91BrandName || 'Gym Management' 
        },
        domain: msg91EmailDomain,
        template_id: msg91InvitationTemplateId,
        variables: {
          recipientEmail: data.recipientEmail,
          inviterName: data.inviterName,
          gymName: data.gymName,
          role: data.role,
          inviteUrl: data.inviteUrl,
          expiresAt: data.expiresAt,
          message: data.message || ''
        }
      })

      if (!result.success) {
        logger.error('MSG91 email error:', { error: result.error })
        return { success: false, error: result.error }
      }

      logger.info('Invitation email sent:', {
        to: data.recipientEmail,
        messageId: result.messageId
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      logger.error('Email service error:', { error: String(error) })
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

/**
 * Get the configured email service based on environment
 */
function getEmailService(): EmailService {
  const { msg91ApiKey, msg91InvitationTemplateId } = serverConfig

  // Use dev service in development without API key
  if (process.env.NODE_ENV === 'development' && !msg91ApiKey) {
    console.log('📧 Using development email service')
    return new DevEmailService()
  }

  // Use MSG91 when configured
  if (msg91ApiKey && msg91InvitationTemplateId) {
    console.log('✅ Using MSG91 email service')
    return new MSG91EmailService()
  }

  // Fallback to dev service with warning
  if (msg91ApiKey && !msg91InvitationTemplateId) {
    logger.warn('MSG91_INVITATION_TEMPLATE_ID not configured')
  } else {
    logger.warn('MSG91_API_KEY not configured')
  }
  
  return new DevEmailService()
}

// Singleton instance
let emailServiceInstance: EmailService | null = null

/**
 * Send invitation email - Main entry point
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
  if (!emailServiceInstance) {
    emailServiceInstance = getEmailService()
  }
  
  logger.info('Sending invitation email:', { to: data.recipientEmail, gym: data.gymName })
  return emailServiceInstance.sendInvitationEmail(data)
}

/**
 * Send bulk invitation emails
 */
export async function sendBulkInvitationEmails(invitations: InvitationEmailData[]): Promise<{
  successful: number
  failed: number
  results: Array<{ email: string; success: boolean; error?: string }>
}> {
  const results = await Promise.allSettled(
    invitations.map(async (data) => {
      const result = await sendInvitationEmail(data)
      return { email: data.recipientEmail, ...result }
    })
  )

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length

  return {
    successful,
    failed: results.length - successful,
    results: results.map(r => 
      r.status === 'fulfilled' 
        ? r.value 
        : { email: 'unknown', success: false, error: 'Promise rejected' }
    )
  }
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  const { msg91ApiKey, systemFromEmail, msg91InvitationTemplateId } = serverConfig

  if (!msg91ApiKey) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('MSG91_API_KEY is required for production')
    } else {
      warnings.push('MSG91_API_KEY not set - using development mode')
    }
  }

  if (!msg91InvitationTemplateId) {
    warnings.push('MSG91_INVITATION_TEMPLATE_ID not configured')
  }

  if (!systemFromEmail || systemFromEmail === 'noreply@yourgym.com') {
    warnings.push('SYSTEM_FROM_EMAIL not configured')
  }

  return { valid: errors.length === 0, errors, warnings }
}
