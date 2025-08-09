// src/lib/email-templates/invitation-email.ts

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  gymName: string;
  role: string;
  message?: string;
  inviteUrl: string;
  expiresAt: string;
  inviterEmail: string;
}

export function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const {
    recipientEmail,
    recipientName,
    inviterName,
    gymName,
    role,
    message,
    inviteUrl,
    expiresAt
  } = data;

  const greeting = recipientName ? `Hi ${recipientName}` : `Hi there`;
  const expireDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      owner: '#8B5CF6',
      manager: '#3B82F6',
      staff: '#10B981',
      trainer: '#F59E0B',
      member: '#6B7280'
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  const roleColor = getRoleBadgeColor(role);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join ${gymName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 8px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .invitation-card {
            background: #f8fafc;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
        }
        .gym-info {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }
        .gym-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3B82F6, #10B981);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
            margin-right: 16px;
        }
        .gym-details h2 {
            margin: 0;
            font-size: 20px;
            color: #1f2937;
        }
        .gym-details p {
            margin: 4px 0 0 0;
            color: #6b7280;
        }
        .role-badge {
            display: inline-block;
            background-color: ${roleColor};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: capitalize;
            margin: 8px 0;
        }
        .message-box {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            font-style: italic;
            color: #4b5563;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3B82F6, #10B981);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-1px);
        }
        .details-section {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 4px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #374151;
        }
        .detail-value {
            color: #6b7280;
        }
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .footer p {
            margin: 8px 0;
        }
        .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 12px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .gym-info {
                flex-direction: column;
                text-align: center;
            }
            .gym-icon {
                margin: 0 0 12px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎯 You're Invited!</h1>
            <p>Join ${gymName} and become part of the team</p>
        </div>

        <!-- Content -->
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 24px;">${greeting},</p>
            
            <p>Great news! <strong>${inviterName}</strong> has invited you to join <strong>${gymName}</strong> as a team member.</p>

            <!-- Invitation Card -->
            <div class="invitation-card">
                <div class="gym-info">
                    <div class="gym-icon">🏋️</div>
                    <div class="gym-details">
                        <h2>${gymName}</h2>
                        <p>Gym Management Platform</p>
                    </div>
                </div>
                
                <div>
                    <strong>Your Role:</strong>
                    <div class="role-badge">${role}</div>
                </div>

                ${message ? `
                <div class="message-box">
                    <strong>Personal message from ${inviterName}:</strong><br>
                    "${message}"
                </div>
                ` : ''}
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${inviteUrl}" class="cta-button">
                    ✅ Accept Invitation & Join Team
                </a>
            </div>

            <!-- Details Section -->
            <div class="details-section">
                <h3 style="margin-top: 0; color: #1f2937;">Invitation Details</h3>
                <div class="detail-item">
                    <span class="detail-label">Gym:</span>
                    <span class="detail-value">${gymName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Role:</span>
                    <span class="detail-value" style="text-transform: capitalize;">${role}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Invited by:</span>
                    <span class="detail-value">${inviterName}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${recipientEmail}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Expires:</span>
                    <span class="detail-value">${expireDate}</span>
                </div>
            </div>

            <!-- Security Note -->
            <div class="security-note">
                <strong>🔒 Security Note:</strong> This invitation is personal and expires on ${expireDate}. 
                If you didn't expect this invitation, you can safely ignore this email.
            </div>

            <!-- Manual Link -->
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #3B82F6; word-break: break-all;">${inviteUrl}</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Gym Management Platform</strong></p>
            <p>Empowering fitness businesses with modern management tools</p>
            <p style="margin-top: 16px;">
                This email was sent to ${recipientEmail}. 
                If you have questions, contact ${inviterName} at ${gymName}.
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

export function generateInvitationEmailText(data: InvitationEmailData): string {
  const {
    recipientEmail,
    recipientName,
    inviterName,
    gymName,
    role,
    message,
    inviteUrl,
    expiresAt
  } = data;

  const greeting = recipientName ? `Hi ${recipientName}` : `Hi there`;
  const expireDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
🎯 YOU'RE INVITED TO JOIN ${gymName.toUpperCase()}!

${greeting},

Great news! ${inviterName} has invited you to join ${gymName} as a team member.

INVITATION DETAILS:
==================
Gym: ${gymName}
Role: ${role}
Invited by: ${inviterName}
Email: ${recipientEmail}
Expires: ${expireDate}

${message ? `
PERSONAL MESSAGE FROM ${inviterName.toUpperCase()}:
${message}
` : ''}

ACCEPT YOUR INVITATION:
======================
Click this link to accept your invitation and join the team:
${inviteUrl}

WHAT HAPPENS NEXT:
==================
1. Click the link above
2. Create your account (or sign in if you already have one)
3. Complete your profile setup
4. Start managing ${gymName} with your new role!

SECURITY NOTE:
==============
This invitation is personal and expires on ${expireDate}. 
If you didn't expect this invitation, you can safely ignore this email.

---
Gym Management Platform
Empowering fitness businesses with modern management tools

This email was sent to ${recipientEmail}.
If you have questions, contact ${inviterName} at ${gymName}.
  `.trim();
}

// Email subject line generator
export function generateInvitationSubject(gymName: string, role: string): string {
  return `🎯 You're invited to join ${gymName} as ${role}`;
}

// Preview text for email clients
export function generateInvitationPreview(inviterName: string, gymName: string): string {
  return `${inviterName} has invited you to join ${gymName}. Accept your invitation to start managing the gym today!`;
}
