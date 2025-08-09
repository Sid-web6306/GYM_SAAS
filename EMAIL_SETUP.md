# 📧 Email Service Configuration Guide

## Resend Setup (Recommended)

### 1. Install Resend Package
```bash
npm install resend
```

### 2. Get Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign up for an account
3. Create an API key in your dashboard
4. Copy the API key (starts with `re_`)

### 3. Configure Environment Variables
Add these to your `.env.local` file:

```env
# Email Configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

### 4. Domain Setup (Production)
For production, you'll need to:
1. Add your domain in Resend dashboard
2. Verify DNS records
3. Update `FROM_EMAIL` to use your verified domain

## Development vs Production

### Development Mode (Current)
- ✅ No API key needed
- ✅ Emails logged to console
- ✅ Safe for testing
- ❌ No real emails sent

### Production Mode (With Resend)
- ✅ Real emails sent
- ✅ Professional delivery
- ✅ Delivery tracking
- ⚠️ Requires API key and domain setup

## Testing Your Setup

### 1. Check Current Service
Look for this log when your app starts:
```bash
✅ Using Resend email service    # ← Resend configured
📧 Using development email service    # ← Dev mode
```

### 2. Send Test Invitation
1. Go to Settings → Team Management
2. Send an invitation
3. Check console logs or your email

### 3. Verify Email Content
Visit `/demo/email-preview` to see how emails will look

## Environment Variables Reference

```env
# Required for Resend
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# Optional: Custom email settings
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Troubleshooting

### "RESEND_API_KEY not found"
- Ensure the API key is in `.env.local`
- Restart your development server
- Check the API key format (should start with `re_`)

### Emails not sending
- Verify API key is valid
- Check FROM_EMAIL domain is verified in Resend
- Review server logs for error messages

### Development Mode Stuck
- Remove `EMAIL_PROVIDER` from env to force dev mode
- Or set `EMAIL_PROVIDER=dev` explicitly

## Migration from Dev to Production

1. ✅ Install resend package
2. ✅ Add environment variables
3. ✅ Verify domain in Resend dashboard
4. ✅ Test with a real invitation
5. ✅ Monitor delivery rates

Your email templates are already production-ready! 🎉
