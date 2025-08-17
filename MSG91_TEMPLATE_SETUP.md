# 📧 MSG91 Email Template Setup Guide

## 🎯 Overview

MSG91 requires **email templates** to be created in their dashboard before you can send emails. You cannot send direct HTML content via their API - everything must go through approved templates.

## 🚀 Quick Setup Steps

### **Step 1: Create Email Template in MSG91 Dashboard**

1. **Login to MSG91**: [control.msg91.com](https://control.msg91.com/)

2. **Navigate to Email Templates**:
   - Go to **Email** → **Templates**
   - Click **"+ Add Template"**

3. **Choose Template Creation Method**:
   - **HTML & Text Editor** (recommended for our rich design)
   - Or **Drag and Drop Builder** for visual editing

### **Step 2: Create Invitation Template**

**Template Name**: `gym_invitation_template`

**Subject**: `You're invited to join {{gymName}} as {{role}}`

**Sender Name**: `Virtuefit` ⚠️ **IMPORTANT**: Must match your registered brand name exactly

**HTML Content** (copy this):
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join {{gymName}}</title>
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
        .role-badge {
            display: inline-block;
            background-color: #3B82F6;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: capitalize;
            margin: 8px 0;
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
        }
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            .header, .content, .footer {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎯 You're Invited!</h1>
            <p>Join {{gymName}} and become part of the team</p>
        </div>

        <!-- Content -->
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 24px;">Hi there,</p>
            
            <p>Great news! <strong>{{inviterName}}</strong> has invited you to join <strong>{{gymName}}</strong> as a team member.</p>

            <!-- Invitation Card -->
            <div class="invitation-card">
                <div class="gym-info">
                    <div class="gym-icon">🏋️</div>
                    <div>
                        <h2 style="margin: 0; font-size: 20px;">{{gymName}}</h2>
                        <p style="margin: 4px 0 0 0; color: #6b7280;">Gym Management Platform</p>
                    </div>
                </div>
                
                <div>
                    <strong>Your Role:</strong>
                    <div class="role-badge">{{role}}</div>
                </div>

                {{#if message}}
                <div style="background: white; border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 16px 0; font-style: italic; color: #4b5563;">
                    <strong>Personal message from {{inviterName}}:</strong><br>
                    "{{message}}"
                </div>
                {{/if}}
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{inviteUrl}}" class="cta-button">
                    ✅ Accept Invitation & Join Team
                </a>
            </div>

            <!-- Expiration Notice -->
            <p style="font-size: 14px; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin: 20px 0;">
                ⏰ <strong>Important:</strong> This invitation expires on {{expiresAt}}
            </p>

            <!-- Manual Link -->
            <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:<br>
                <a href="{{inviteUrl}}" style="color: #3B82F6; word-break: break-all;">{{inviteUrl}}</a>
            </p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Virtuefit - Gym Management Platform</strong></p>
            <p>This email was sent to {{recipientEmail}}.</p>
        </div>
    </div>
</body>
</html>
```

**Text Version**:
```
You're invited to join {{gymName}}!

Hi there,

{{inviterName}} has invited you to join {{gymName}} as {{role}}.

{{#if message}}
Personal message: "{{message}}"
{{/if}}

Accept your invitation: {{inviteUrl}}

This invitation expires on {{expiresAt}}.

---
Virtuefit - Gym Management Platform
```

### **Step 3: Template Variables**

MSG91 uses **{{variableName}}** syntax. Our template includes:
- `{{gymName}}` - Name of the gym
- `{{inviterName}}` - Person who sent invitation
- `{{role}}` - Role being offered (member, staff, trainer, etc.)
- `{{inviteUrl}}` - Secure invitation link
- `{{recipientEmail}}` - Recipient's email
- `{{expiresAt}}` - When the invitation expires
- `{{message}}` - Optional personal message from inviter

**Important for Conditional Messages:**
MSG91 requires special variable handling for conditional content. Our system automatically provides:
- `{{{#if message}}}` - Conditional logic for showing message
- `{{message}}` - The actual message content
- `{{{/if}}}` - End conditional logic

These variables are automatically set based on whether a personal message is included in the invitation.

### **Step 4: Submit for Approval**

1. **Review your template**
2. **Click "Submit for Approval"**
3. **Wait 10-30 minutes** for MSG91 to approve
4. **Note the Template ID** once approved

### **Step 5: Configure Your Application**

Add to your `.env.local`:
```bash
# MSG91 Configuration
MSG91_API_KEY=your_api_key_here
MSG91_INVITATION_TEMPLATE_ID=your_template_id_here
MSG91_BRAND_NAME=Virtuefit  # Must match your registered brand in MSG91
MSG91_EMAIL_DOMAIN=yourdomain.com  # Optional
SYSTEM_FROM_EMAIL=noreply@yourdomain.com
```

## 🔧 **Test Your Setup**

### **Step 6: Test Template Configuration**

1. **Restart your development server**:
```bash
npm run dev
```

2. **Check the logs** - you should see:
```
✅ Using MSG91 email service with templates
```

3. **Create a test invitation**:
   - Go to your dashboard
   - Create an invitation
   - Check for success/error messages

### **Step 7: Monitor Template Sending**

**Success Flow**:
```
✅ Template email sent successfully via MSG91
📧 Recipient gets invitation with your custom template
```

**Common Issues**:
```
❌ "Template validation error" → Template not approved yet
❌ "Template ID not found" → Wrong template ID in .env.local
❌ "Variables missing" → Template variables don't match
```

## 🛠️ **Template Variable Mapping**

Our system automatically extracts these variables from your invitation data:

| Variable | Source | Example |
|----------|--------|---------|
| `{{gymName}}` | Gym name from database | "FitZone Gym" |
| `{{inviterName}}` | User who sent invitation | "John Doe" |
| `{{role}}` | Role being assigned | "staff", "member", "trainer" |
| `{{inviteUrl}}` | Secure invitation link | "https://yourapp.com/onboarding?invite=abc123" |
| `{{recipientEmail}}` | Email being invited | "user@example.com" |
| `{{expiresAt}}` | Invitation expiration date | "December 25, 2024" |
| `{{message}}` | Optional personal message | "Welcome to our team!" |

### **Conditional Message Variables**

For MSG91's conditional logic system, these special variables are automatically generated:

| Variable | Purpose | Value |
|----------|---------|-------|
| `{{{#if message}}}` | Start conditional block | "true" if message exists, "false" otherwise |
| `{{message}}` | Message content | The actual personal message text |
| `{{{/if}}}` | End conditional block | "true" if message exists, "false" otherwise |

**Technical Implementation:**
```javascript
// Our system automatically sends these variables to MSG91
const variables = {
  gymName: "FitZone Gym",
  inviterName: "John Doe",
  role: "staff",
  "#if message": hasMessage ? "true" : "false",
  "message": personalMessage || "",
  "/if": hasMessage ? "true" : "false",
  inviteUrl: "https://...",
  expiresAt: "December 25, 2024",
  recipientEmail: "user@example.com"
}
```

## 🎯 **Alternative: Development Mode**

If you don't want to set up templates immediately, the system will **automatically fall back** to development mode:

```bash
# Remove these lines from .env.local to use development mode:
# MSG91_API_KEY=...
# MSG91_INVITATION_TEMPLATE_ID=...
```

You'll see:
```
📧 Using development email service (emails logged to console)
```

This lets you test invitation flow without MSG91 templates.

## 🚀 **Production Checklist**

- ✅ MSG91 account created and verified
- ✅ Brand name "Virtuefit" registered in MSG91
- ✅ Domain verified in MSG91 (for SYSTEM_FROM_EMAIL)
- ✅ Email template created with sender name "Virtuefit"
- ✅ Template approved by MSG91
- ✅ Template ID added to .env.local
- ✅ MSG91_BRAND_NAME=Virtuefit configured
- ✅ API key configured with email permissions
- ✅ IP restrictions removed or properly configured
- ✅ Test invitation sent successfully

## 🆘 **Troubleshooting**

**"Template validation error"**:
- Template not approved yet (wait 10-30 minutes)
- Template ID is wrong
- Template has syntax errors

**"Brand name mismatch" / 422 Validation Error**:
- Sender name in template must match `MSG91_BRAND_NAME` exactly
- Currently configured as "Virtuefit" - update if different
- Check your MSG91 registered brand name

**"Variables missing"**:
- Template uses variables not in our mapping
- Check template variable names match exactly
- Ensure all required variables are included: `{{gymName}}`, `{{inviterName}}`, `{{role}}`, `{{inviteUrl}}`, `{{expiresAt}}`

**"Domain error"**:
- Domain not verified in MSG91
- Remove MSG91_EMAIL_DOMAIN from .env.local temporarily

**Still having issues?**:
- Check MSG91 dashboard for email logs
- Contact MSG91 support: support@msg91.com
- Use development mode temporarily while debugging

---

## 🎉 **You're All Set!**

Once configured, your Virtuefit invitation emails will:
- ✅ Use professional MSG91 delivery with "Virtuefit" branding
- ✅ Show your custom template design
- ✅ Include all dynamic invitation data (gym name, role, expiration, etc.)
- ✅ Have excellent deliverability rates
- ✅ Match your registered brand identity

Your gym invitation system is now enterprise-ready! 🚀
