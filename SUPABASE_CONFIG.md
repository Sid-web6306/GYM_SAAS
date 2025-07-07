# Supabase Configuration for Email Confirmation

## Issue
Email confirmation links are redirecting to `/` instead of `/auth/callback`.

## Solution Implemented
✅ Added auth code handling to the home page (`/`) to handle the redirect properly.

## Recommended Supabase Configuration

To fix the root cause and ensure proper redirects, update your Supabase project settings:

### 1. Site URL Configuration
In your Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000` (for development)
- **Redirect URLs**: Add these URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/`
  - `https://yourdomain.com/auth/callback` (for production)
  - `https://yourdomain.com/` (for production)

### 2. Email Templates (Optional)
In Authentication → Email Templates → Confirm signup:

Update the confirmation link to explicitly redirect to the callback:
```html
<a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

## Current Implementation
The home page now handles auth codes automatically:

1. ✅ Detects `?code=` parameter in URL
2. ✅ Exchanges code for session using Supabase
3. ✅ Shows success toast message
4. ✅ Redirects to onboarding page
5. ✅ Handles errors gracefully with error messages

## Test the Flow
1. Sign up with email
2. Check confirmation email
3. Click confirmation link
4. Should see "Email Confirmed!" message
5. Redirected to onboarding page