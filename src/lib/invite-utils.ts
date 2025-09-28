import crypto from 'crypto'

/**
 * Generate a cryptographically secure token for invitations
 * @param length - Length of the token in bytes (default: 32)
 * @returns Base64 URL-safe encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '') // URL-safe base64 encoding
}

/**
 * Hash a token for secure storage in database
 * We store hashed tokens in the database for security
 * @param token - Raw token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

/**
 * Verify a token against its hash
 * @param token - Raw token to verify
 * @param hash - Stored hash to compare against
 * @returns True if token matches hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hash, 'hex')
  )
}

/**
 * Generate an invitation URL
 * @param token - Raw token (not hashed)
 * @param baseUrl - Base URL of the application
 * @returns Complete invitation URL
 */
export function generateInviteUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  // Avoid accidental double slashes when base ends with '/'
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${normalizedBase}/onboarding?invite=${token}`
}

/**
 * Extract token from invitation URL
 * @param url - Full invitation URL
 * @returns Token if found, null otherwise
 */
export function extractTokenFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('invite')
  } catch {
    return null
  }
}

/**
 * Check if a token has expired based on creation time and duration
 * @param createdAt - When the token was created
 * @param expiresAt - When the token expires
 * @returns True if token has expired
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expiry < new Date()
}

/**
 * Calculate expiration time
 * @param hoursFromNow - Hours from now when token should expire
 * @returns ISO string of expiration time
 */
export function calculateExpirationTime(hoursFromNow: number): string {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + hoursFromNow)
  return expiry.toISOString()
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize role for database storage
 * @param role - Role string to sanitize
 * @returns Sanitized role or null if invalid
 */
export function sanitizeRole(role: string): string | null {
  const validRoles = ['owner', 'manager', 'staff', 'trainer', 'member']
  const sanitized = role.toLowerCase().trim()
  return validRoles.includes(sanitized) ? sanitized : null
}

/**
 * Generate a human-readable invitation summary
 * @param invitation - Invitation object
 * @returns Formatted summary string
 */
export function formatInvitationSummary(invitation: {
  email: string
  role: string
  gym_name?: string
  invited_by?: string
  expires_at: string
}): string {
  const expiry = new Date(invitation.expires_at)
  const timeLeft = expiry.getTime() - Date.now()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  
  return `${invitation.email} invited as ${invitation.role}${
    invitation.gym_name ? ` to ${invitation.gym_name}` : ''
  }${invitation.invited_by ? ` by ${invitation.invited_by}` : ''} (expires in ${hoursLeft}h)`
}

/**
 * Generate email subject for invitation
 * @param gymName - Name of the gym
 * @param role - Role being offered
 * @returns Email subject string
 */
export function generateInvitationSubject(gymName: string, role: string): string {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1)
  return `You're invited to join ${gymName} as ${roleDisplay}`
}

/**
 * Generate email content for invitation
 * @param params - Invitation parameters
 * @returns HTML email content
 */
export function generateInvitationEmailContent({
  gymName,
  role,
  invitedBy,
  inviteUrl,
  expiresAt,
  customMessage
}: {
  gymName: string
  role: string
  invitedBy: string
  inviteUrl: string
  expiresAt: string
  customMessage?: string
}): string {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1)
  const expiry = new Date(expiresAt)
  const expiryFormatted = expiry.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to Join ${gymName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🏋️ You're Invited!</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Join ${gymName} as ${roleDisplay}</p>
      </div>

      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0 0 15px 0; font-size: 16px;">Hi there! 👋</p>
        <p style="margin: 0 0 15px 0;">
          <strong>${invitedBy}</strong> has invited you to join <strong>${gymName}</strong> with the role of <strong>${roleDisplay}</strong>.
        </p>
        
        ${customMessage ? `
          <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0;">
            <p style="margin: 0; font-style: italic;">"${customMessage}"</p>
          </div>
        ` : ''}
        
        <p style="margin: 15px 0 0 0;">
          Click the button below to accept this invitation and get started:
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; 
                  text-decoration: none; 
                  padding: 15px 30px; 
                  border-radius: 8px; 
                  font-weight: bold; 
                  font-size: 16px; 
                  display: inline-block;
                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
          Accept Invitation
        </a>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          ⏰ <strong>Important:</strong> This invitation expires on ${expiryFormatted}
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">

      <div style="font-size: 14px; color: #6c757d; text-align: center;">
        <p>If you can't click the button above, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
          ${inviteUrl}
        </p>
        <p style="margin-top: 20px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>

    </body>
    </html>
  `
}

// Export type definitions for better TypeScript support
export interface InvitationData {
  id: string
  email: string
  role: string
  gym_id: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: string
  created_at: string
  token?: string // Only present when creating new invitations
}

export interface InvitationEmailParams {
  recipientEmail: string
  gymName: string
  role: string
  invitedBy: string
  inviteUrl: string
  expiresAt: string
  customMessage?: string
}
