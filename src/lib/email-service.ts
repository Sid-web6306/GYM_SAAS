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
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Development email service - logs emails instead of sending them
 */
export class DevEmailService implements EmailService {
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('\n📧 === EMAIL SENT (Development Mode) ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Preview:', options.preview || 'N/A');
    console.log('\n--- TEXT VERSION ---');
    console.log(options.text);
    console.log('\n--- HTML VERSION ---');
    console.log(options.html);
    console.log('=====================================\n');
    
    return { 
      success: true, 
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
    };
  }
}

/**
 * Resend email service implementation
 */
import { Resend } from 'resend';
import { logger } from './logger';

export class ResendEmailService implements EmailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromAddress = process.env.FROM_EMAIL || options.from || 'noreply@yourgym.com'
      const result = await this.resend.emails.send({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        // Prefer a verified from; if the inviter is different, set replyTo for better deliverability
        replyTo: options.from && options.from !== fromAddress ? options.from : undefined,
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('Resend email error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
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
  const emailProvider = process.env.EMAIL_PROVIDER;

  switch (emailProvider) {
    case 'resend':
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.warn('RESEND_API_KEY not found, using dev service');
        return new DevEmailService();
      }
      console.log('✅ Using Resend email service');
      return new ResendEmailService(resendApiKey);
    
    case 'sendgrid':
      // return new SendGridEmailService(process.env.SENDGRID_API_KEY!);
      console.warn('SendGrid email service not configured, using dev service');
      return new DevEmailService();
    
    default:
      console.log('📧 Using development email service (emails logged to console)');
      return new DevEmailService();
  }
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailService = getEmailService();
  
  const subject = generateInvitationSubject(data.gymName, data.role);
  const preview = generateInvitationPreview(data.inviterName, data.gymName);
  const html = generateInvitationEmailHTML(data);
  const text = generateInvitationEmailText(data);
  logger.info('Sending invitation email to:', { recipientEmail: data });

  return emailService.sendEmail({
    from: data.inviterEmail,
    to: data.recipientEmail,
    subject,
    html,
    text,
    preview
  });
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
  
  const emailProvider = process.env.EMAIL_PROVIDER;
  const fromEmail = process.env.FROM_EMAIL;
  
  // Check email provider configuration
  if (!emailProvider) {
    warnings.push('EMAIL_PROVIDER not set - using development mode (emails logged to console)');
  } else if (emailProvider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      errors.push('RESEND_API_KEY environment variable required when EMAIL_PROVIDER=resend');
    } else if (!apiKey.startsWith('re_')) {
      warnings.push('RESEND_API_KEY should start with "re_" - please verify your API key');
    }
  } else if (emailProvider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      errors.push('SENDGRID_API_KEY environment variable required when EMAIL_PROVIDER=sendgrid');
    }
  } else {
    warnings.push(`Unknown EMAIL_PROVIDER "${emailProvider}" - falling back to development mode`);
  }
  
  // Check FROM_EMAIL configuration
  if (!fromEmail) {
    if (emailProvider && emailProvider !== 'dev') {
      errors.push('FROM_EMAIL environment variable required for production email sending');
    } else {
      warnings.push('FROM_EMAIL not set - using default for development');
    }
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      errors.push('FROM_EMAIL must be a valid email address');
    }
    
    // Check for common development domains
    if (fromEmail.includes('example.com') || fromEmail.includes('test.com')) {
      warnings.push('FROM_EMAIL appears to use a test domain - update for production');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
