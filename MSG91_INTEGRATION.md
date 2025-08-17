## MSG91 OTP + Email + WhatsApp Integration Guide

### Overview

Integrate MSG91 to handle OTP authentication, transactional email, and WhatsApp messaging in a unified provider-based communications layer. This approach centralizes these communication channels for consistent orchestration and logging.

### Objectives

- **Enable OTP, Email, and WhatsApp** using MSG91 with minimal impact to existing flows.
- **Do not break** current invitation and notification processes.
- **Centralize** communications (OTP + Email + WhatsApp) orchestration and logging.
- **Respect security**: server-only secrets and no RLS bypass in Supabase [[memory:5667666]].

### Scope

- In-scope: OTP via MSG91 OTP API, Email via MSG91 Email API, WhatsApp via MSG91 WhatsApp API, server API endpoints, configuration wiring, and optional feature hooks (invites/payments/trial).
- Out-of-scope (for now): SMS/Flow messaging, DB auditing table, rate limiting/queues, i18n content.

## Architecture

### Components

- **Provider layers**:
  - `src/lib/otp-service.ts`
    - Interface for OTP send/verify operations and `getOtpService()` factory.
  - `src/lib/email-service.ts`
    - Interface for transactional email operations and `getEmailService()` factory.
  - `src/lib/whatsapp-service.ts`
    - Interface for WhatsApp template/message operations and `getWhatsappService()` factory.

- **MSG91 client helpers**: `src/lib/msg91.ts`
  - Thin wrappers around MSG91 OTP, Email, and WhatsApp APIs.

- **Orchestration**: `src/lib/communications.ts`
  - High-level helpers that coordinate OTP, Email, and WhatsApp for events, guarded by config flags.

- **Server API routes (optional but recommended)**:
  - `src/app/api/communications/otp/route.ts`: Authenticated endpoint to send/verify OTP.
  - `src/app/api/communications/email/route.ts`: Authenticated endpoint to send templated emails.
  - `src/app/api/communications/whatsapp/route.ts`: Authenticated endpoint to send WhatsApp templates/messages.

- **Configuration**: `src/lib/config.ts`
  - Extend server config with MSG91 keys, template IDs, sender info, and feature flags for OTP, Email, and WhatsApp.

### Why this design

- Unified abstraction for OTP, Email, and WhatsApp for consistency.
- Keeps all MSG91 interactions server-side to avoid exposing secrets and to preserve RLS patterns [[memory:5667666]].
- Incremental adoption: features opt-in via flags; existing email and OTP flows remain primary.

## Configuration

Add server-side environment variables (do not expose to client):

- OTP:
  - `MSG91_API_KEY=...`
  - `MSG91_OTP_EXPIRY_SECONDS=300` (optional)
  - `ENABLE_OTP=true|false` (feature toggle; default false)
- Email:
  - `EMAIL_PROVIDER=msg91`
  - `MSG91_EMAIL_SENDER=...`
  - `MSG91_EMAIL_TEMPLATE_INVITE=...`
  - `MSG91_EMAIL_TEMPLATE_PAYMENT=...`
  - `ENABLE_EMAIL_INVITES=true|false`
  - `ENABLE_EMAIL_PAYMENTS=true|false`
- WhatsApp:
  - `WHATSAPP_PROVIDER=msg91`
  - `MSG91_WHATSAPP_SENDER_NUMBER=...`
  - `MSG91_WHATSAPP_TEMPLATE_INVITE=...`
  - `MSG91_WHATSAPP_TEMPLATE_PAYMENT=...`
  - `ENABLE_WHATSAPP_INVITES=true|false`
  - `ENABLE_WHATSAPP_PAYMENTS=true|false`
  - `ENABLE_WHATSAPP_TRIALS=true|false`

Update `src/lib/config.ts` to:

- Include the above under server-only config.
- Validate presence/format, emit warnings in development when missing.
- Keep client config clean; do not export MSG91 secrets.

## OTP Authentication Flow

### Overview

Replace Supabase email confirmation with MSG91 OTP verification while maintaining Supabase's session management and RLS security.

### Authentication Architecture

```typescript
// Hybrid approach: MSG91 OTP + Supabase Auth
interface OTPAuthFlow {
  // 1. Create unverified Supabase user
  signup: {
    email: string
    password: string
    phone: string
    skipEmailConfirmation: true
  }
  
  // 2. Send OTP via MSG91
  sendOTP: {
    phone: string
    userId: string
    type: 'signup' | 'login' | '2fa'
  }
  
  // 3. Verify OTP
  verifyOTP: {
    phone: string
    otp: string
    userId: string
  }
  
  // 4. Confirm user & generate session
  confirmAndAuthenticate: {
    updateSupabaseUser: true
    generateSession: true
    setPhoneVerified: true
  }
}
```

### Implementation Details

#### Database Schema
```sql
-- OTP verification tracking
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  otp_hash TEXT NOT NULL, -- Store hashed OTP
  type TEXT CHECK (type IN ('signup', 'login', '2fa')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add phone to profiles
ALTER TABLE profiles 
  ADD COLUMN phone_number TEXT,
  ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN phone_verified_at TIMESTAMP;

-- Index for fast lookups
CREATE INDEX idx_otp_phone_expires ON otp_verifications(phone_number, expires_at);
```

#### Modified Signup Flow
```typescript
// src/actions/auth.actions.ts
export const signupWithOTP = async (
  email: string,
  password: string,
  phone: string
): Promise<SignupResult> => {
  const supabase = await createClient()
  
  // Step 1: Create user without email confirmation
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // Skip email confirmation
      data: { 
        phone_number: sanitizeInput.phone(phone),
        requires_otp_verification: true
      }
    }
  })
  
  if (error || !data.user) {
    return { error: error?.message || 'Signup failed' }
  }
  
  // Step 2: Send OTP
  const otpResult = await sendSignupOTP(data.user.id, phone)
  
  if (!otpResult.success) {
    // Rollback user creation if OTP fails
    await supabase.auth.admin.deleteUser(data.user.id)
    return { error: 'Failed to send OTP' }
  }
  
  return { 
    userId: data.user.id,
    requiresOTP: true,
    maskedPhone: maskPhoneNumber(phone)
  }
}
```

#### OTP Verification API
```typescript
// src/app/api/auth/verify-otp/route.ts
export async function POST(request: Request) {
  const { userId, phone, otp } = await request.json()
  
  // Rate limiting check
  const rateLimitOk = await checkOTPRateLimit(phone)
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 }
    )
  }
  
  // Verify OTP with MSG91
  const otpService = getOtpService()
  const { success, error } = await otpService.verifyOtp({
    phone: sanitizeInput.phone(phone),
    code: otp
  })
  
  if (!success) {
    await incrementOTPAttempts(phone, userId)
    return NextResponse.json({ error }, { status: 400 })
  }
  
  // Confirm user in Supabase
  const supabaseAdmin = createAdminClient()
  
  const { error: updateError } = await supabaseAdmin.auth.admin
    .updateUserById(userId, {
      email_confirmed_at: new Date().toISOString(),
      phone_verified: true,
      user_metadata: { 
        phone_number: phone,
        phone_verified: true,
        phone_verified_at: new Date().toISOString()
      }
    })
  
  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to confirm user' },
      { status: 500 }
    )
  }
  
  // Create session for immediate login
  const { data: sessionData } = await supabaseAdmin.auth.admin
    .createSession(userId)
  
  return NextResponse.json({ 
    success: true,
    session: sessionData.session,
    redirectTo: '/onboarding'
  })
}
```

### Security Considerations

1. **OTP Security**
   - 6-digit numeric OTP
   - 5-minute expiry
   - Maximum 5 attempts per OTP
   - 15-minute lockout after max attempts
   - OTPs stored as hashed values

2. **Rate Limiting**
   ```typescript
   const OTP_RATE_LIMITS = {
     maxOTPsPerHour: 10,
     maxOTPsPerDay: 20,
     maxAttemptsPerOTP: 5,
     lockoutDuration: 15 * 60 * 1000 // 15 minutes
   }
   ```

3. **Phone Number Validation**
   - E.164 format enforcement
   - Country code validation
   - Duplicate phone number checks

### UI Components

```typescript
// src/components/auth/OTPVerification.tsx
interface OTPVerificationProps {
  userId: string
  phone: string
  onSuccess: (session: Session) => void
}

export function OTPVerification({ userId, phone, onSuccess }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  
  // Auto-focus next input
  // Resend timer countdown
  // Paste handling for OTP
  // Auto-submit on complete
}
```

### Login with OTP (Passwordless)

```typescript
// src/actions/auth.actions.ts
export const loginWithOTP = async (phone: string) => {
  const supabase = await createClient()
  
  // Check if phone exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('phone_number', phone)
    .eq('phone_verified', true)
    .single()
  
  if (!profile) {
    return { error: 'Phone number not registered' }
  }
  
  // Send OTP
  const otpResult = await sendLoginOTP(profile.user_id, phone)
  
  return {
    userId: profile.user_id,
    requiresOTP: true,
    maskedPhone: maskPhoneNumber(phone)
  }
}
```

### 2FA Implementation

```typescript
// Enable 2FA for existing users
interface TwoFactorAuth {
  // User opts into 2FA
  enable2FA: async (userId: string, phone: string) => {
    // Verify phone ownership
    await sendOTP({ phone, userId, type: '2fa' })
    
    // After verification, update user
    await updateUser({
      user_metadata: {
        two_factor_enabled: true,
        two_factor_phone: phone
      }
    })
  }
  
  // During login
  loginWith2FA: async (email: string, password: string) => {
    // Normal auth
    const { user } = await signInWithPassword({ email, password })
    
    if (user?.user_metadata?.two_factor_enabled) {
      // Don't create session yet
      await sendOTP({
        phone: user.user_metadata.two_factor_phone,
        userId: user.id,
        type: '2fa'
      })
      
      return { requires2FA: true, tempToken: generateTempToken(user.id) }
    }
    
    // Normal login flow
    return { session }
  }
}
```

### Migration Strategy

1. **Phase 1: Parallel Systems** (Recommended Start)
   - Keep email confirmation as default
   - Add OTP as opt-in feature flag
   - Allow users to add/verify phone numbers

2. **Phase 2: OTP as Primary**
   - New signups use OTP by default
   - Existing users prompted to add phone
   - Email confirmation as fallback

3. **Phase 3: Full Migration**
   - All auth flows use OTP
   - Email only for notifications
   - Legacy email-only accounts supported

### Rollback Plan

```typescript
// Feature flags for gradual rollout
const AUTH_FEATURES = {
  ENABLE_OTP_SIGNUP: process.env.ENABLE_OTP_SIGNUP === 'true',
  ENABLE_OTP_LOGIN: process.env.ENABLE_OTP_LOGIN === 'true',
  REQUIRE_PHONE_VERIFICATION: process.env.REQUIRE_PHONE === 'true',
  ALLOW_EMAIL_FALLBACK: process.env.ALLOW_EMAIL_FALLBACK !== 'false'
}

// Rollback procedure
if (AUTH_FEATURES.ALLOW_EMAIL_FALLBACK) {
  // Fall back to email confirmation if OTP fails
  if (!otpSent.success) {
    return sendEmailConfirmation(user)
  }
}
```

## Tier-based channel gating

### Goal

Enable channels based on subscription tier:

- Tier 1 (Basic): Email + OTP
- Tier 2 (Professional): Email + OTP + WhatsApp
- Tier 3 (Enterprise): Email + OTP + WhatsApp (+ premium features)

This uses existing DB fields in `public.subscription_plans`:

- `tier_level integer` with constraint `[1,2,3]`
- Optional `features text[]` for overrides

### Implementation

1) Add a resolver in `src/lib/communications.ts`:

```ts
type Channel = 'email' | 'otp' | 'whatsapp'

export function resolveChannelsForTier(tierLevel: number, features?: string[]): Channel[] {
  // Feature override support (optional)
  // If features array explicitly lists channels, prefer that
  const normalized = (features || []).map(f => f.toLowerCase())
  const explicit: Channel[] = []
  if (normalized.includes('email')) explicit.push('email')
  if (normalized.includes('otp')) explicit.push('otp')
  if (normalized.includes('whatsapp')) explicit.push('whatsapp')
  if (explicit.length > 0) return explicit

  // Fallback to tier mapping
  switch (tierLevel) {
    case 1:
      return ['email', 'otp']
    case 2:
      return ['email', 'otp', 'whatsapp']
    case 3:
      return ['email', 'otp', 'whatsapp'] // plus premium features
    default:
      return ['email', 'otp']
  }
}

export function channelsAllowOtp(channels: Channel[]) {
  return channels.includes('otp')
}

export function channelsAllowWhatsapp(channels: Channel[]) {
  return channels.includes('whatsapp')
}
```

2) Fetch current user's plan with tier in server contexts that send messages (e.g., invite actions, payments API). Example:

```ts
// Given Supabase client and userId
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*, subscription_plans(*)')
  .eq('user_id', userId)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

const tierLevel = subscription?.subscription_plans?.tier_level ?? 1
const features = subscription?.subscription_plans?.features ?? []
const channels = resolveChannelsForTier(tierLevel, features)
```

3) Use the resolved channels in orchestrators:

```ts
// Example in sendInviteMessage orchestrator
if (channelsAllowOtp(channels) && process.env.ENABLE_OTP === 'true') {
  await otpService.sendOtp({ phone: recipientPhone, expirySeconds: expirySeconds })
}

if (channelsAllowWhatsapp(channels) && process.env.ENABLE_WHATSAPP_INVITES === 'true') {
  await whatsappService.sendTemplate({ to: recipientPhone, templateId: whatsappTemplateInvite, vars })
}

if (channels.includes('email') && process.env.ENABLE_EMAIL_INVITES === 'true') {
  await emailService.sendTemplate({ to: recipientEmail, templateId: emailTemplateInvite, vars })
}
```

4) UI gating (optional): leverage existing upgrade flows. When a user on tier 1 accesses WhatsApp features, show upgrade prompts (reusing `TrialGuard` or upgrade links) with required plan info.

### Notes

- The features array, if populated with channel names (`email`, `otp`, `whatsapp`), can override the tier mapping on a per-plan basis without code changes.
- Keep premium features code paths prepared but disabled until implemented.

## Contracts and Examples

### OTP Service interface (sketch)

```ts
export interface OtpService {
  sendOtp(params: { phone: string; expirySeconds?: number }): Promise<{ success: boolean; requestId?: string; error?: string }>
  verifyOtp(params: { phone: string; code: string }): Promise<{ success: boolean; error?: string }>
}
```

### Email Service interface (sketch)

```ts
export interface EmailService {
  sendTemplate(params: { to: string; templateId: string; vars?: Record<string, string | number> }): Promise<{ success: boolean; messageId?: string; error?: string }>
}
```

### WhatsApp Service interface (sketch)

```ts
export interface WhatsappService {
  sendTemplate(params: { to: string; templateId: string; vars?: Record<string, string | number> }): Promise<{ success: boolean; messageId?: string; error?: string }>
}
```

### OTP route examples

```bash
# Send OTP
curl -X POST https://your.app/api/communications/otp -H "Content-Type: application/json" \
  -d '{"action":"send","phone":"+91XXXXXXXXXX"}'

# Verify OTP
curl -X POST https://your.app/api/communications/otp -H "Content-Type: application/json" \
  -d '{"action":"verify","phone":"+91XXXXXXXXXX","code":"123456"}'
```

### Email send example

```bash
curl -X POST https://your.app/api/communications/email \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","templateId":"invite","variables":{"gymName":"Acme Gym","inviterName":"Siddhant"}}'
```

### WhatsApp template send example

```bash
curl -X POST https://your.app/api/communications/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"to":"+91XXXXXXXXXX","templateId":"invite_template","variables":{"gymName":"Acme Gym","inviterName":"Siddhant"}}'
```

## Integration Points (incremental and optional)

- **Invitations** (`src/actions/invite.actions.ts`):
  - Email via MSG91 Email API.
  - OTP verification for account activation.
  - WhatsApp messaging for premium tiers.

- **Payments** (`src/app/api/payments/route.ts`):
  - Confirmation via email.
  - OTP for sensitive actions.
  - WhatsApp notifications for premium tiers.

- **Trials** (`src/hooks/use-trial.ts`):
  - Reminders via email and WhatsApp (if enabled).

All usage should preserve Supabase auth checks and never bypass RLS [[memory:5667666]].

## Security and Compliance

- Keep all MSG91 API keys and provider secrets server-side only.
- Sanitize phone numbers with `sanitizeInput.phone` before invoking MSG91.
- API routes must verify authenticated user and, when applicable, gym-level permissions via existing RBAC utilities.
- For auditability, consider adding a `communication_events` table with RLS in a future iteration (not required for initial rollout).

## Observability

- Use `src/lib/logger.ts` for structured logs (success/failure, userId, gymId, templateId).
- Return normalized result shapes from each channel's service to keep call sites simple.

## Rollout Plan

1. Add new libs, config wiring, and (optional) API routes. Keep feature flags disabled.
2. Verify environment variables locally with development/test keys.
3. Use the `/api/communications/otp`, `/email`, and `/whatsapp` routes to send test messages.
4. Enable feature flags incrementally and test each channel.
5. Promote to production using production MSG91 keys and approved templates.

## Testing Checklist

- Environment validation logs warnings but no runtime crashes when features are disabled.
- OTP send/verify roundtrip works for a real phone (test account) without exposing secrets.
- Email send route functions end-to-end.
- WhatsApp template send route functions end-to-end.
- All routes follow existing auth patterns; no RLS bypass [[memory:5667666]].

## Testing Strategy

### Development Testing

```typescript
// Mock OTP codes for development
const DEV_OTP_CODES = {
  '+911234567890': '123456', // Always succeeds
  '+919876543210': '000000', // Always fails
  '+915555555555': '999999'  // Rate limited
}

// Bypass OTP in development
if (process.env.NODE_ENV === 'development' && 
    process.env.BYPASS_OTP === 'true') {
  if (otp === DEV_OTP_CODES[phone]) {
    return { success: true }
  }
}
```

### E2E Test Scenarios

1. **Signup with OTP**
   - Valid phone → OTP sent → Correct OTP → User created
   - Invalid phone → Error message
   - Wrong OTP → Increment attempts → Lockout after 5

2. **Login with OTP**
   - Registered phone → OTP sent → Login success
   - Unregistered phone → Error message
   - Expired OTP → Error message

3. **2FA Flow**
   - Enable 2FA → Verify phone → 2FA active
   - Login with 2FA → Password → OTP → Session

## Acceptance Criteria

- `MSG91_API_KEY` and server config in place; secrets not exposed to client.
- `getOtpService()`, `getEmailService()`, and `getWhatsappService()` return working MSG91-backed services on the server.
- Test route(s) function end-to-end for OTP, Email, and WhatsApp.
- No regression to existing invitation and notification behavior.
- All routes follow existing auth patterns; no RLS bypass [[memory:5667666]].
- OTP authentication flow implemented with:
  - Signup with OTP verification
  - Optional passwordless login
  - 2FA support for enhanced security
  - Proper rate limiting and security measures
- Channel availability is gated by `subscription_plans.tier_level` (and optional `features[]`), enforcing:
  - Tier 1: Email + OTP
  - Tier 2: Email + OTP + WhatsApp
  - Tier 3: Email + OTP + WhatsApp (+ premium features)

## References

- MSG91 Documentation: [OTP API](https://msg91.com/apidocs/otp/), [Email API](https://msg91.com/apidocs/email/), [WhatsApp API](https://msg91.com/apidocs/whatsapp/)
- Logger: `src/lib/logger.ts`
