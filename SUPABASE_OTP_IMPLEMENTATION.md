# Supabase Native OTP Implementation Guide

## Overview

Supabase provides built-in OTP authentication for both email and phone numbers, which can significantly simplify your implementation compared to using MSG91. This guide compares both approaches and shows how to implement using Supabase's native OTP system.

## Comparison: Supabase OTP vs MSG91 OTP

### Supabase Native OTP

**Pros:**
- ✅ Built into Supabase Auth - no additional integration
- ✅ Automatic session management
- ✅ Works with RLS out of the box
- ✅ No custom OTP generation/verification code
- ✅ Integrated rate limiting
- ✅ Built-in security features
- ✅ Simpler implementation (70% less code)
- ✅ One vendor to manage

**Cons:**
- ❌ Less control over OTP format/length
- ❌ Limited SMS providers (Twilio, MessageBird, Textlocal, Vonage)
- ❌ Can't customize SMS templates as freely
- ❌ Phone auth requires SMS provider setup
- ❌ Less flexibility for custom flows

### MSG91 Custom Implementation

**Pros:**
- ✅ Full control over OTP flow
- ✅ Custom OTP length/format
- ✅ WhatsApp support built-in
- ✅ More SMS provider options
- ✅ Better for Indian market (MSG91 specializes in India)
- ✅ Can implement custom rate limiting
- ✅ More detailed analytics

**Cons:**
- ❌ Complex implementation
- ❌ Need to manage OTP storage/verification
- ❌ Custom session management required
- ❌ More code to maintain
- ❌ Security implementation responsibility

## Implementation Using Supabase Native OTP

### 1. Configuration

```typescript
// No additional configuration needed for email OTP
// For phone OTP, configure SMS provider in Supabase Dashboard:
// Project Settings → Auth → Phone Auth → Choose Provider (Twilio, etc.)
```

### 2. Database Schema (Simplified)

```sql
-- Much simpler - Supabase handles OTP storage
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  phone TEXT,
  full_name TEXT,
  
  -- Track what's verified (Supabase tracks this in auth.users too)
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Progressive profile tracking
  verification_state TEXT DEFAULT 'unverified',
  initial_auth_method TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- That's it! No OTP tables needed
```

### 3. Email OTP Implementation

```typescript
// src/actions/auth.actions.ts

// Email Signup with OTP (Passwordless)
export async function signupWithEmailOTP(email: string) {
  const supabase = await createClient()
  
  try {
    // Send OTP to email
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This creates a new user if they don't exist
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          initial_auth_method: 'email_otp'
        }
      }
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return {
      success: true,
      message: 'Check your email for the verification code'
    }
  } catch (error) {
    return { success: false, error: 'Failed to send OTP' }
  }
}

// Verify Email OTP
export async function verifyEmailOTP(email: string, token: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // User is now logged in with session
    // Update profile to track verification
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          email_verified: true,
          verification_state: 'email_only'
        })
    }
    
    return {
      success: true,
      user: data.user,
      session: data.session,
      nextStep: 'add_phone'
    }
  } catch (error) {
    return { success: false, error: 'Verification failed' }
  }
}
```

### 4. Phone OTP Implementation

```typescript
// Phone Signup with OTP
export async function signupWithPhoneOTP(phone: string) {
  const supabase = await createClient()
  
  try {
    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone)
    
    // Send OTP to phone
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        shouldCreateUser: true,
        data: {
          initial_auth_method: 'phone_otp'
        }
      }
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return {
      success: true,
      message: 'Check your SMS for the verification code'
    }
  } catch (error) {
    return { success: false, error: 'Failed to send OTP' }
  }
}

// Verify Phone OTP
export async function verifyPhoneOTP(phone: string, token: string) {
  const supabase = await createClient()
  
  try {
    const formattedPhone = formatPhoneNumber(phone)
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms'
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Update profile
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          phone: formattedPhone,
          phone_verified: true,
          verification_state: 'phone_only'
        })
    }
    
    return {
      success: true,
      user: data.user,
      session: data.session,
      nextStep: 'add_email'
    }
  } catch (error) {
    return { success: false, error: 'Verification failed' }
  }
}
```

### 5. Combined Email + Password with OTP Verification

```typescript
// If you want email/password signup but with OTP email verification
export async function signupWithEmailPassword(
  email: string, 
  password: string
) {
  const supabase = await createClient()
  
  try {
    // Create user with password
    const { data: signUpData, error: signUpError } = 
      await supabase.auth.signUp({
        email,
        password,
        options: {
          // Don't send default confirmation email
          emailRedirectTo: undefined
        }
      })
    
    if (signUpError) {
      return { success: false, error: signUpError.message }
    }
    
    // Immediately send OTP for verification
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false // User already exists
      }
    })
    
    if (otpError) {
      return { success: false, error: otpError.message }
    }
    
    return {
      success: true,
      requiresOTP: true,
      message: 'Check your email for verification code'
    }
  } catch (error) {
    return { success: false, error: 'Signup failed' }
  }
}
```

### 6. Progressive Profile Completion

```typescript
// Add missing contact method
export async function addPhoneToProfile(userId: string, phone: string) {
  const supabase = await createClient()
  
  try {
    // Send OTP to verify ownership
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhoneNumber(phone),
      options: {
        shouldCreateUser: false
      }
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Store pending phone in profile
    await supabase
      .from('profiles')
      .update({
        phone: formatPhoneNumber(phone),
        phone_verified: false
      })
      .eq('id', userId)
    
    return {
      success: true,
      message: 'Verification code sent to your phone'
    }
  } catch (error) {
    return { success: false, error: 'Failed to add phone' }
  }
}

// Verify added phone
export async function verifyAddedPhone(
  userId: string, 
  phone: string, 
  token: string
) {
  const supabase = await createClient()
  
  try {
    // Note: This creates a challenge for linking phone to existing user
    // Supabase doesn't directly support this, so we need a workaround
    
    // Option 1: Verify the OTP
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhoneNumber(phone),
      token,
      type: 'sms'
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // If successful, update the profile
    // Note: This might create a new session for phone number
    // You may need to merge accounts or handle this carefully
    
    await supabase
      .from('profiles')
      .update({
        phone_verified: true,
        verification_state: 'fully_verified'
      })
      .eq('id', userId)
      .eq('phone', formatPhoneNumber(phone))
    
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Verification failed' }
  }
}
```

### 7. UI Components (Simplified)

```typescript
// src/components/auth/SupabaseOTPForm.tsx
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SupabaseOTPForm() {
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState('')
  const [isOTPSent, setIsOTPSent] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const sendOTP = async () => {
    setLoading(true)
    
    const isEmail = contact.includes('@')
    const result = isEmail 
      ? await signupWithEmailOTP(contact)
      : await signupWithPhoneOTP(contact)
    
    if (result.success) {
      setIsOTPSent(true)
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }
    
    setLoading(false)
  }
  
  const verifyOTP = async () => {
    setLoading(true)
    
    const isEmail = contact.includes('@')
    const result = isEmail
      ? await verifyEmailOTP(contact, otp)
      : await verifyPhoneOTP(contact, otp)
    
    if (result.success) {
      // Redirect based on next step
      window.location.href = `/${result.nextStep}`
    } else {
      toast.error(result.error)
    }
    
    setLoading(false)
  }
  
  return (
    <div className="space-y-4">
      {!isOTPSent ? (
        <>
          <Input
            placeholder="Email or Phone Number"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
          <Button 
            onClick={sendOTP} 
            disabled={loading || !contact}
            className="w-full"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Enter the code sent to {contact}
          </p>
          <Input
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <Button 
            onClick={verifyOTP} 
            disabled={loading || otp.length !== 6}
            className="w-full"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsOTPSent(false)
              setOtp('')
            }}
            className="w-full"
          >
            Use different contact
          </Button>
        </>
      )}
    </div>
  )
}
```

## Email Template Configuration

To use OTP instead of magic links for email, update your Supabase email templates:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Edit the "Magic Link" template
3. Replace `{{ .ConfirmationURL }}` with:

```html
<h2>Your verification code</h2>
<p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">
  {{ .Token }}
</p>
<p>This code expires in 1 hour.</p>
```

## Implementation Comparison

### Code Reduction with Supabase OTP

**What you DON'T need with Supabase OTP:**
- ❌ OTP generation logic
- ❌ OTP storage tables
- ❌ OTP verification logic
- ❌ Rate limiting implementation
- ❌ OTP expiry handling
- ❌ Hash comparison logic
- ❌ Custom session creation
- ❌ MSG91 integration
- ❌ Multiple API endpoints

**Estimated code reduction: ~70%**

### Migration Path from MSG91 to Supabase OTP

1. **Phase 1: Parallel Implementation**
   ```typescript
   const OTP_PROVIDER = process.env.OTP_PROVIDER || 'supabase'
   
   export async function sendOTP(contact: string, type: 'email' | 'sms') {
     if (OTP_PROVIDER === 'supabase') {
       return sendSupabaseOTP(contact, type)
     } else {
       return sendMSG91OTP(contact, type)
     }
   }
   ```

2. **Phase 2: Gradual Migration**
   - Start with new users on Supabase OTP
   - Migrate existing users gradually
   - Monitor success rates

3. **Phase 3: Full Migration**
   - Switch all users to Supabase OTP
   - Remove MSG91 code
   - Simplify database schema

## Limitations & Workarounds

### 1. Phone Number Linking Challenge

Supabase OTP creates new users by default. Linking phone to existing email users requires workarounds:

```typescript
// Workaround: Admin API to link phone
async function linkPhoneToUser(userId: string, phone: string) {
  // This requires service role key (server-side only)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Update user's phone in auth.users
  const { error } = await supabaseAdmin.auth.admin
    .updateUserById(userId, {
      phone: phone,
      phone_confirmed: true
    })
  
  return { success: !error, error }
}
```

### 2. Custom OTP Length/Format

Supabase uses 6-digit OTPs. If you need different formats:

```typescript
// Not possible with Supabase native OTP
// Would need MSG91 or custom implementation
```

### 3. WhatsApp Integration

Supabase doesn't support WhatsApp OTP natively:

```typescript
// Hybrid approach for WhatsApp
export async function sendWhatsAppOTP(phone: string) {
  // Use MSG91 only for WhatsApp
  if (userTier >= 2) {
    return sendMSG91WhatsApp(phone)
  }
  // Fall back to SMS via Supabase
  return supabase.auth.signInWithOtp({ phone })
}
```

## Recommendations

### Use Supabase Native OTP if:
- ✅ You want faster implementation
- ✅ You're already using Supabase Auth
- ✅ Standard 6-digit OTPs are sufficient
- ✅ You don't need WhatsApp support
- ✅ You want built-in security features

### Use MSG91 Custom Implementation if:
- ✅ You need WhatsApp integration
- ✅ You need custom OTP formats
- ✅ You want more SMS provider options
- ✅ You need detailed analytics
- ✅ You're primarily targeting Indian users

### Hybrid Approach (Best of Both):
```typescript
// Use Supabase for email/SMS OTP (simpler)
// Use MSG91 only for WhatsApp (when needed)
// This gives you 80% simplicity with 20% flexibility
```

## Sample Implementation Timeline

### Supabase OTP: 2-3 days
1. Configure SMS provider (30 min)
2. Implement auth flows (1 day)
3. Create UI components (1 day)
4. Testing (0.5 day)

### MSG91 Full Implementation: 7-10 days
1. Design OTP system (1 day)
2. Create database schema (0.5 day)
3. Implement OTP logic (2 days)
4. Create API endpoints (1 day)
5. Build UI components (2 days)
6. Security implementation (1 day)
7. Testing (2 days)

## Conclusion

Supabase native OTP can reduce your implementation time by 70% while maintaining security and reliability. The main trade-off is less flexibility, but for most use cases, Supabase OTP is more than sufficient.

For your specific use case with progressive profile completion, Supabase OTP would work well for email and SMS, with the option to add MSG91 later just for WhatsApp features (Tier 2+).
