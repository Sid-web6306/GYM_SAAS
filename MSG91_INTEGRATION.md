## MSG91 Integration Guide

### Overview

Add SMS and OTP capabilities via MSG91 using a provider-based communications layer that mirrors the existing email abstraction in `src/lib/email-service.ts`. Email continues to work as-is (Resend/dev). SMS is additive and gated by config flags to avoid breaking current behavior.

### Objectives

- **Enable SMS and OTP** using MSG91 with minimal impact to existing flows.
- **Do not break** current email-based invitations and notifications.
- **Centralize** communications (email + SMS) orchestration and logging.
- **Respect security**: server-only secrets and no RLS bypass in Supabase [[memory:5667666]].

### Scope

- In-scope: SMS via MSG91 Flow API, OTP send/verify helpers, server API endpoints, configuration wiring, and optional feature hooks (invites/payments/trial).
- Out-of-scope (for now): WhatsApp templates, DB auditing table, rate limiting/queues, i18n content.

## Architecture

### Components

- **Provider layer (SMS)**: `src/lib/sms-service.ts`
  - Interface for SMS operations and `getSmsService()` factory similar to `email-service`.
  - Providers: `Msg91SmsService` (production), `DevSmsService` (development no-op/logging).

- **MSG91 client helpers**: `src/lib/msg91.ts`
  - Thin wrappers around MSG91 v5 Flow and OTP endpoints.

- **Orchestration**: `src/lib/communications.ts`
  - High-level helpers that coordinate email + SMS for events, guarded by config flags.

- **Server API routes (optional but recommended)**:
  - `src/app/api/communications/sms/route.ts`: Authenticated endpoint to send templated SMS.
  - `src/app/api/communications/otp/route.ts`: Authenticated endpoint to send/verify OTP.

- **Configuration**: `src/lib/config.ts`
  - Extend server config with MSG91 keys, Flow IDs, and feature flags.

### Why this design

- Mirrors existing email abstraction for consistency.
- Keeps all MSG91 interactions server-side to avoid exposing secrets and to preserve RLS patterns [[memory:5667666]].
- Incremental adoption: features opt-in to SMS via flags; email remains the primary channel.

## Files to Add (under `src/`)

- `lib/sms-service.ts`
  - `SmsService` interface and `getSmsService()` factory.
  - Methods:
    - `sendWithFlow({ to, flowId, vars })`
    - `sendOtp({ phone, expirySeconds? })`
    - `verifyOtp({ phone, code })`

- `lib/msg91.ts`
  - `msg91SendFlow`, `msg91SendOtp`, `msg91VerifyOtp` low-level HTTP helpers.

- `lib/communications.ts`
  - Orchestrators for feature events (e.g., `sendInviteMessage`, `sendPaymentMessage`, `sendTrialMessage`).

- `types/communications.types.ts`
  - Types for SMS template variables, OTP payloads, and normalized results.

- Optional API routes:
  - `app/api/communications/sms/route.ts` (POST)
  - `app/api/communications/otp/route.ts` (POST)

## Configuration

Add server-side environment variables (do not expose to client):

- `SMS_PROVIDER=msg91`
- `MSG91_API_KEY=...`
- `MSG91_SENDER_ID=...` (if required by your MSG91 route)
- `MSG91_FLOW_ID_INVITE=...`
- `MSG91_FLOW_ID_GENERIC=...`
- `MSG91_OTP_EXPIRY_SECONDS=300` (optional)
- `ENABLE_SMS=true|false` (feature toggle; default false)
- Optional fine-grained flags: `ENABLE_SMS_INVITES`, `ENABLE_SMS_TRIALS`, `ENABLE_SMS_PAYMENTS`

Update `src/lib/config.ts` to:

- Include the above under server-only config.
- Validate presence/format, emit warnings in development when missing.
- Keep client config clean; do not export MSG91 secrets.

## Tier-based channel gating

### Goal

Enable channels based on subscription tier:

- Tier 1 (Basic): email only
- Tier 2 (Professional): email + SMS
- Tier 3 (Enterprise): email + SMS + WhatsApp (future)

This uses existing DB fields in `public.subscription_plans`:

- `tier_level integer` with constraint `[1,2,3]`
- Optional `features text[]` for overrides

### Implementation

1) Add a resolver in `src/lib/communications.ts`:

```ts
type Channel = 'email' | 'sms' | 'whatsapp'

export function resolveChannelsForTier(tierLevel: number, features?: string[]): Channel[] {
  // Feature override support (optional)
  // If features array explicitly lists channels, prefer that
  const normalized = (features || []).map(f => f.toLowerCase())
  const explicit: Channel[] = []
  if (normalized.includes('email')) explicit.push('email')
  if (normalized.includes('sms')) explicit.push('sms')
  if (normalized.includes('whatsapp')) explicit.push('whatsapp')
  if (explicit.length > 0) return explicit

  // Fallback to tier mapping
  switch (tierLevel) {
    case 1:
      return ['email']
    case 2:
      return ['email', 'sms']
    case 3:
      return ['email', 'sms', 'whatsapp']
    default:
      return ['email']
  }
}

export function channelsAllowSms(channels: Channel[]) {
  return channels.includes('sms')
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
if (channelsAllowSms(channels) && process.env.ENABLE_SMS_INVITES === 'true') {
  await smsService.sendWithFlow({ to: recipientPhone, flowId: flowIdInvite, vars })
}

// WhatsApp: scaffold only for tier 3; implement later
if (channelsAllowWhatsapp(channels) && process.env.ENABLE_WHATSAPP_INVITES === 'true') {
  // TODO: integrate WhatsApp provider when ready
}
```

4) UI gating (optional): leverage existing upgrade flows. When a user on tier 1 accesses SMS features, show upgrade prompts (reusing `TrialGuard` or upgrade links) with required plan info.

### Notes

- The features array, if populated with channel names (`email`, `sms`, `whatsapp`), can override the tier mapping on a per-plan basis without code changes.
- Keep WhatsApp code paths prepared but disabled until provider support is added.

## Contracts and Examples

### SmsService interface (sketch)

```ts
export interface SmsService {
  sendWithFlow(params: { to: string; flowId: string; vars?: Record<string, string | number> }): Promise<{ success: boolean; id?: string; error?: string }>
  sendOtp(params: { phone: string; expirySeconds?: number }): Promise<{ success: boolean; requestId?: string; error?: string }>
  verifyOtp(params: { phone: string; code: string }): Promise<{ success: boolean; error?: string }>
}
```

### Flow SMS route example

```bash
curl -X POST https://your.app/api/communications/sms \
  -H "Content-Type: application/json" \
  -d '{"to":"+91XXXXXXXXXX","templateId":"invite","variables":{"gymName":"Acme Gym","inviterName":"Siddhant"}}'
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

## Integration Points (incremental and optional)

- **Invitations** (`src/actions/invite.actions.ts`): After successful `sendInvitationEmail`, optionally call `sendInviteMessage` when `ENABLE_SMS_INVITES=true` and recipient phone is known. Email stays primary.

- **Payments** (`src/app/api/payments/route.ts`): After successful payment/subscription creation, optionally send an SMS confirmation/receipt with amount and plan name when `ENABLE_SMS_PAYMENTS=true`.

- **Trials** (`src/hooks/use-trial.ts`): On trial nearing expiry or expired, optionally send SMS reminder when `ENABLE_SMS_TRIALS=true`.

All usage should preserve Supabase auth checks and never bypass RLS [[memory:5667666]].

## Security and Compliance

- Keep `MSG91_API_KEY` and all provider secrets server-side only.
- Sanitize phone numbers with `sanitizeInput.phone` before invoking MSG91.
- API routes must verify authenticated user and, when applicable, gym-level permissions via existing RBAC utilities.
- For auditability, consider adding a `communication_events` table with RLS in a future iteration (not required for initial rollout).

## Observability

- Use `src/lib/logger.ts` for structured logs (success/failure, userId, gymId, flowId/templateId).
- Return normalized result shapes from the SMS layer to keep call sites simple.

## Rollout Plan

1. Add new libs, config wiring, and (optional) API routes. Keep `ENABLE_SMS=false`.
2. Verify environment variables locally with development/test keys.
3. Use the `/api/communications/sms` route to send a Flow SMS to a verified number.
4. Enable `ENABLE_SMS_INVITES=true` in development and test the invitation SMS alongside existing email.
5. Gradually enable for trials and payments as needed.
6. Promote to production using production MSG91 keys and approved DLT templates.

## Testing Checklist

- Environment validation logs warnings but no runtime crashes when SMS is disabled.
- Sending a Flow SMS via the test route yields a success response and appears in MSG91 reports.
- OTP send/verify roundtrip works for a real phone (test account) without exposing secrets.
- Email flows (Resend/dev) are unaffected.

## Acceptance Criteria

- `SMS_PROVIDER=msg91` and server config in place; secrets not exposed to client.
- `getSmsService()` returns a working MSG91-backed service on the server.
- Test route(s) function end-to-end for Flow and OTP.
- No regression to existing email behavior.
- All routes follow existing auth patterns; no RLS bypass [[memory:5667666]].
- Channel availability is gated by `subscription_plans.tier_level` (and optional `features[]`), enforcing:
  - Tier 1: email only
  - Tier 2: email + SMS
  - Tier 3: email + SMS (+ WhatsApp when implemented)

## References

- MSG91 Documentation: [Flow API](https://msg91.com/apidocs/flows/), [OTP API](https://msg91.com/apidocs/otp/)
- Existing email abstraction: `src/lib/email-service.ts`
- Logger: `src/lib/logger.ts`


