// src/lib/email-service.ts

import { 
  generateInvitationEmailHTML, 
  generateInvitationEmailText, 
  generateInvitationSubject,
  generateInvitationPreview,
  type InvitationEmailData 
} from './email-templates/invitation-email';

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  preview?: string;
}

/**
 * Email service interface - can be implemented with different providers
 */
export interface EmailService {
  // sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendInvitationEmailWithTemplate(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Development email service - logs emails instead of sending them
 */
export class DevEmailService implements EmailService {
  // async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  //   console.log('\n📧 === EMAIL SENT (Development Mode) ===');
  //   console.log('To:', options.to);
  //   console.log('Subject:', options.subject);
  //   console.log('Preview:', options.preview || 'N/A');
  //   console.log('\n--- TEXT VERSION ---');
  //   console.log(options.text);
  //   console.log('\n--- HTML VERSION ---');
  //   console.log(options.html);
  //   console.log('=====================================\n');
    
  //   return { 
  //     success: true, 
  //     messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
  //   };
  // }
  async sendInvitationEmailWithTemplate(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('\n📧 === EMAIL SENT (Development Mode) ===');
    console.log('To:', data.recipientEmail);
    console.log('Gym:', data.gymName);
    console.log('Role:', data.role);
    console.log('Inviter:', data.inviterName);
    console.log('Message:', data.message || 'N/A');
    console.log('=====================================\n');
    
    return { 
      success: true, 
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
  }
}

/**
 * MSG91 email service implementation
 */
import { sendTemplateEmailViaMSG91 } from './msg91';
import { logger } from './logger';
import { serverConfig } from './config';

export class MSG91EmailService implements EmailService {
  // async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  //   try {
  //     const fromAddress = serverConfig.systemFromEmail || 'noreply@yourgym.com'
      
  //     const result = await sendEmailViaMSG91({
  //       to: [options.to],
  //       from: fromAddress,
  //       from_name: serverConfig.msg91BrandName, // Use registered brand name
  //       reply_to: options.from && options.from !== fromAddress ? options.from : undefined,
  //       subject: options.subject,
  //       html: options.html,
  //       text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML as fallback
  //     });

  //     if (!result.success) {
  //       logger.error('MSG91 email error:', { error: result.error });
  //       return { success: false, error: result.error };
  //     }

  //     logger.info('Email sent successfully via MSG91:', { messageId: result.messageId });
  //     return { success: true, messageId: result.messageId };
  //   } catch (error) {
  //     logger.error('MSG91 email service error:', { error: String(error) });
  //     return { 
  //       success: false, 
  //       error: error instanceof Error ? error.message : 'Unknown error' 
  //     };
  //   }
  // }

  async sendInvitationEmailWithTemplate(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromAddress = serverConfig.systemFromEmail || 'noreply@yourgym.com'
      const { msg91InvitationTemplateId } = serverConfig
      
      if (!msg91InvitationTemplateId) {
        return { success: false, error: 'MSG91 invitation template ID not configured' }
      }

      // Prepare template variables for MSG91
      const templateVariables = {
        recipientEmail: data.recipientEmail,
        inviterName: data.inviterName,
        gymName: data.gymName,
        role: data.role,
        inviteUrl: data.inviteUrl,
        expiresAt: data.expiresAt,
        message: data.message || ''
      }

      const result = await sendTemplateEmailViaMSG91({
        to: [{ email: data.recipientEmail, name: data.recipientName }],
        from: { email: fromAddress, name: serverConfig.msg91BrandName || 'Gym Management' },
        domain: serverConfig.msg91EmailDomain,
        template_id: msg91InvitationTemplateId,
        variables: templateVariables
      })

      if (!result.success) {
        logger.error('MSG91 template email error:', { error: result.error })
        return { success: false, error: result.error }
      }

      logger.info('Template invitation email sent successfully:', {
        recipientEmail: data.recipientEmail,
        template_id: msg91InvitationTemplateId,
        messageId: result.messageId
      })

      return { 
        success: true, 
        messageId: result.messageId 
      }
    } catch (error) {
      logger.error('Error sending template invitation email:', { error: String(error) })
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

/**
 * SendGrid email service implementation
 * Uncomment and configure when ready to use real email sending
 */
/*
import sgMail from '@sendgrid/mail';

export class SendGridEmailService implements EmailService {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const msg = {
        to: options.to,
        from: process.env.FROM_EMAIL || 'noreply@yourgym.com',
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await sgMail.send(msg);
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
*/

/**
 * Get the configured email service
 */
export function getEmailService(): EmailService {
  const { msg91ApiKey, msg91InvitationTemplateId } = serverConfig;
  
  // Check environment - use dev service in development unless explicitly configured
  if (process.env.NODE_ENV === 'development' && !msg91ApiKey) {
    console.log('📧 Using development email service (emails logged to console)');
    return new DevEmailService();
  }

  // Use MSG91 for production or when API key is configured
  if (msg91ApiKey) {
    if (!msg91InvitationTemplateId) {
      console.warn('⚠️  MSG91_INVITATION_TEMPLATE_ID not configured. Create templates in MSG91 dashboard first.');
      console.log('📧 Falling back to development email service');
      return new DevEmailService();
    }
    console.log('✅ Using MSG91 email service with templates');
    return new MSG91EmailService();
  }

  // Fallback to dev service
  console.warn('MSG91_API_KEY not configured, using dev service');
  return new DevEmailService();
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailService = getEmailService();
  const { msg91InvitationTemplateId } = serverConfig;
  
  logger.info('Sending invitation email to:', { recipientEmail: data.recipientEmail });

  // Use template-based sending if MSG91 template is configured and service is MSG91EmailService
  if (msg91InvitationTemplateId && emailService instanceof MSG91EmailService) {
    logger.info('Using MSG91 template for invitation email:', { templateId: msg91InvitationTemplateId });
    return emailService.sendInvitationEmailWithTemplate(data);
  }

  // Fallback to HTML-based email (for dev mode or when template not configured)
  logger.info('Using HTML-based email (no template configured)');
  const subject = generateInvitationSubject(data.gymName, data.role);
  const preview = generateInvitationPreview(data.inviterName, data.gymName);
  const html = generateInvitationEmailHTML(data);
  const text = generateInvitationEmailText(data);

  // For development mode fallback, log the email data
  if (emailService instanceof DevEmailService) {
    console.log('\n📧 === EMAIL FALLBACK (HTML Mode) ===');
    console.log('From:', data.inviterEmail);
    console.log('To:', data.recipientEmail);
    console.log('Subject:', subject);
    console.log('Preview:', preview);
    console.log('\n--- TEXT VERSION ---');
    console.log(text);
    console.log('\n--- HTML VERSION ---');
    console.log(html);
    console.log('=====================================\n');
    
    return { 
      success: true, 
      messageId: `dev-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
  }

  // For production mode, this shouldn't be reached since we should use templates
  throw new Error('HTML-based email sending not supported in production mode. Use template-based sending instead.');
}

/**
 * Send bulk invitation emails
 */
export async function sendBulkInvitationEmails(invitations: InvitationEmailData[]): Promise<{
  successful: number;
  failed: number;
  results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>;
}> {
  const results = await Promise.allSettled(
    invitations.map(async (invitation) => {
      const result = await sendInvitationEmail(invitation);
      return {
        email: invitation.recipientEmail,
        ...result
      };
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.length - successful;

  return {
    successful,
    failed,
    results: results.map(r => 
      r.status === 'fulfilled' 
        ? r.value 
        : { email: 'unknown', success: false, error: 'Promise rejected' }
    )
  };
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const { msg91ApiKey, systemFromEmail } = serverConfig;
  
  // Check MSG91 configuration
  if (!msg91ApiKey) {
    if (process.env.NODE_ENV === 'production') {
      errors.push('MSG91_API_KEY environment variable is required for production');
    } else {
      warnings.push('MSG91_API_KEY not set - using development mode (emails logged to console)');
    }
  }
  
  // Check SYSTEM_FROM_EMAIL configuration
  if (!systemFromEmail || systemFromEmail === 'noreply@yourgym.com') {
    warnings.push('SYSTEM_FROM_EMAIL not configured - using default address');
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(systemFromEmail)) {
      errors.push('SYSTEM_FROM_EMAIL must be a valid email address');
    }
    
    // Check for common development domains
    if (systemFromEmail.includes('example.com') || systemFromEmail.includes('test.com')) {
      warnings.push('SYSTEM_FROM_EMAIL appears to use a test domain - update for production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
