## MSG91 WhatsApp Integration Guide

### Overview

Add WhatsApp messaging capabilities via MSG91 using a provider-based communications layer that mirrors the existing email abstraction in `src/lib/email-service.ts`. Email continues to work as-is (Resend/dev). WhatsApp is additive and gated by config flags to avoid breaking current behavior.

### Objectives

- **Enable WhatsApp messaging** using MSG91 with minimal impact to existing flows.
- **Do not break** current email-based invitations and notifications.
- **Centralize** communications (email + WhatsApp) orchestration and logging.
- **Respect security**: server-only secrets and no RLS bypass in Supabase [[memory:5667666]].

### Scope

- In-scope: WhatsApp via MSG91 WhatsApp API, template messaging, server API endpoints, configuration wiring, and optional feature hooks (invites/payments/trial).
- Out-of-scope (for now): SMS fallback, DB auditing table, rate limiting/queues, i18n content, media messaging.

## Architecture

### Components

- **Provider layer (WhatsApp)**: `src/lib/whatsapp-service.ts`
  - Interface for WhatsApp operations and `getWhatsAppService()` factory similar to `email-service`.
  - Providers: `Msg91WhatsAppService` (production), `DevWhatsAppService` (development no-op/logging).

- **MSG91 client helpers**: `src/lib/msg91.ts`
  - Thin wrappers around MSG91 WhatsApp API endpoints.

- **Orchestration**: `src/lib/communications.ts`
  - High-level helpers that coordinate email + WhatsApp for events, guarded by config flags.

- **Server API routes (optional but recommended)**:
  - `src/app/api/communications/whatsapp/route.ts`: Authenticated endpoint to send templated WhatsApp messages.

- **Configuration**: `src/lib/config.ts`
  - Extend server config with MSG91 keys, template IDs, and feature flags.

### Why this design

- Mirrors existing email abstraction for consistency.
- Keeps all MSG91 interactions server-side to avoid exposing secrets and to preserve RLS patterns [[memory:5667666]].
- Incremental adoption: features opt-in to WhatsApp via flags; email remains the primary channel.

## Files to Add (under `src/`)

- `lib/whatsapp-service.ts`
  - `WhatsAppService` interface and `getWhatsAppService()` factory.
  - Methods:
    - `sendTemplate({ to, templateId, parameters?, languageCode? })`
    - `sendText({ to, message })` (for simple text messages)

- `lib/msg91.ts`
  - `msg91SendWhatsAppTemplate`, `msg91SendWhatsAppText` low-level HTTP helpers.

- `lib/communications.ts`
  - Orchestrators for feature events (e.g., `sendInviteMessage`, `sendPaymentMessage`, `sendTrialMessage`).

- `types/communications.types.ts`
  - Types for WhatsApp template parameters, message payloads, and normalized results.

- Optional API routes:
  - `app/api/communications/whatsapp/route.ts` (POST)

## Configuration

Add server-side environment variables (do not expose to client):

- `WHATSAPP_PROVIDER=msg91`
- `MSG91_API_KEY=...`
- `MSG91_WHATSAPP_NUMBER=...` (your registered WhatsApp Business number)
- `MSG91_TEMPLATE_ID_INVITE=...`
- `MSG91_TEMPLATE_ID_PAYMENT=...`
- `MSG91_TEMPLATE_ID_TRIAL=...`
- `MSG91_TEMPLATE_ID_GENERIC=...`
- `ENABLE_WHATSAPP=true|false` (feature toggle; default false)
- Optional fine-grained flags: `ENABLE_WHATSAPP_INVITES`, `ENABLE_WHATSAPP_TRIALS`, `ENABLE_WHATSAPP_PAYMENTS`

Update `src/lib/config.ts` to:

- Include the above under server-only config.
- Validate presence/format, emit warnings in development when missing.
- Keep client config clean; do not export MSG91 secrets.

## Tier-based channel gating

### Goal

Enable channels based on subscription tier:

- Tier 1 (Starter): email only
- Tier 2 (Professional): email + WhatsApp
- Tier 3 (Enterprise): email + WhatsApp (+ advanced features)

This uses existing DB fields in `public.subscription_plans`:

- `tier_level integer` with constraint `[1,2,3]`
- Optional `features text[]` for overrides

### Implementation

1) Add a resolver in `src/lib/communications.ts`:

```ts
type Channel = 'email' | 'whatsapp'

export function resolveChannelsForTier(tierLevel: number, features?: string[]): Channel[] {
  // Feature override support (optional)
  // If features array explicitly lists channels, prefer that
  const normalized = (features || []).map(f => f.toLowerCase())
  const explicit: Channel[] = []
  if (normalized.includes('email')) explicit.push('email')
  if (normalized.includes('whatsapp')) explicit.push('whatsapp')
  if (explicit.length > 0) return explicit

  // Fallback to tier mapping
  switch (tierLevel) {
    case 1:
      return ['email']
    case 2:
    case 3:
      return ['email', 'whatsapp']
    default:
      return ['email']
  }
}

export function channelsAllowWhatsApp(channels: Channel[]) {
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
if (channelsAllowWhatsApp(channels) && process.env.ENABLE_WHATSAPP_INVITES === 'true') {
  await whatsAppService.sendTemplate({ 
    to: recipientPhone, 
    templateId: process.env.MSG91_TEMPLATE_ID_INVITE,
    parameters: templateParams
  })
}
```

4) UI gating (optional): leverage existing upgrade flows. When a user on tier 1 accesses WhatsApp features, show upgrade prompts (reusing `TrialGuard` or upgrade links) with required plan info.

### Notes

- The features array, if populated with channel names (`email`, `whatsapp`), can override the tier mapping on a per-plan basis without code changes.
- WhatsApp requires pre-approved templates - ensure all templates are approved by WhatsApp before production use.

## Contracts and Examples

### WhatsAppService interface (sketch)

```ts
export interface WhatsAppService {
  sendTemplate(params: { 
    to: string; 
    templateId: string; 
    parameters?: Array<{ type: 'text' | 'image' | 'document', value: string }>; 
    languageCode?: string 
  }): Promise<{ success: boolean; messageId?: string; error?: string }>
  
  sendText(params: { 
    to: string; 
    message: string 
  }): Promise<{ success: boolean; messageId?: string; error?: string }>
}
```

### WhatsApp route example

```bash
curl -X POST https://your.app/api/communications/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+91XXXXXXXXXX",
    "templateId": "invite_template",
    "parameters": [
      {"type": "text", "value": "Acme Gym"},
      {"type": "text", "value": "Siddhant"}
    ]
  }'
```

## WhatsApp Template Management

### Template Structure
WhatsApp templates must be pre-approved. Example templates:

**Invite Template:**
```
Hi {{1}}! 🏋️‍♀️

You've been invited to join *{{2}}*. 

Click here to accept your invitation: {{3}}

Welcome to the team! 💪
```

**Payment Success Template:**
```
Payment Confirmed! ✅

Thanks {{1}}! Your payment of ₹{{2}} for {{3}} plan has been processed.

Your subscription is now active until {{4}}.

Need help? Reply to this message.
```

**Trial Reminder Template:**
```
Trial Ending Soon ⏰

Hi {{1}}! Your trial at {{2}} expires in {{3}} days.

Upgrade now to continue: {{4}}

Questions? We're here to help!
```

### Template Parameter Mapping

```ts
// src/lib/whatsapp-templates.ts
export const WHATSAPP_TEMPLATES = {
  INVITE: {
    id: process.env.MSG91_TEMPLATE_ID_INVITE,
    parameters: ['recipientName', 'gymName', 'inviteLink']
  },
  PAYMENT_SUCCESS: {
    id: process.env.MSG91_TEMPLATE_ID_PAYMENT,
    parameters: ['customerName', 'amount', 'planName', 'expiryDate']
  },
  TRIAL_REMINDER: {
    id: process.env.MSG91_TEMPLATE_ID_TRIAL,
    parameters: ['userName', 'gymName', 'daysLeft', 'upgradeLink']
  }
} as const

export function mapTemplateParameters(
  templateType: keyof typeof WHATSAPP_TEMPLATES,
  data: Record<string, string>
): Array<{ type: 'text', value: string }> {
  const template = WHATSAPP_TEMPLATES[templateType]
  return template.parameters.map(param => ({
    type: 'text' as const,
    value: data[param] || ''
  }))
}
```

## Integration Points (incremental and optional)

- **Invitations** (`src/actions/invite.actions.ts`): After successful `sendInvitationEmail`, optionally call `sendInviteMessage` when `ENABLE_WHATSAPP_INVITES=true` and recipient phone is known. Email stays primary.

- **Payments** (`src/app/api/payments/route.ts`): After successful payment/subscription creation, optionally send a WhatsApp confirmation with amount and plan name when `ENABLE_WHATSAPP_PAYMENTS=true`.

- **Trials** (`src/hooks/use-trial.ts`): On trial nearing expiry or expired, optionally send WhatsApp reminder when `ENABLE_WHATSAPP_TRIALS=true`.

All usage should preserve Supabase auth checks and never bypass RLS [[memory:5667666]].

## Security and Compliance

- Keep `MSG91_API_KEY` and all provider secrets server-side only.
- Sanitize phone numbers with `sanitizeInput.phone` before invoking MSG91.
- API routes must verify authenticated user and, when applicable, gym-level permissions via existing RBAC utilities.
- Ensure WhatsApp Business Terms compliance.
- For auditability, consider adding a `communication_events` table with RLS in a future iteration (not required for initial rollout).

## WhatsApp-Specific Considerations

### Template Approval Process
1. Create templates in MSG91 dashboard
2. Submit for WhatsApp approval (can take 24-48 hours)
3. Use approved templates only in production
4. Monitor template performance and delivery rates

### Phone Number Requirements
- Recipients must have WhatsApp installed
- Numbers should include country code (+91 for India)
- Consider opt-in mechanisms for marketing messages
- Handle delivery failures gracefully (fallback to email)

### Message Limitations
- Template messages only for business-initiated conversations
- 24-hour response window for free-form messages after user interaction
- Character limits vary by template component

## Observability

- Use `src/lib/logger.ts` for structured logs (success/failure, userId, gymId, templateId).
- Return normalized result shapes from the WhatsApp layer to keep call sites simple.
- Track delivery rates and template performance.
- Monitor WhatsApp Business API limits and quotas.

## Rollout Plan

1. Add new libs, config wiring, and (optional) API routes. Keep `ENABLE_WHATSAPP=false`.
2. Create and submit WhatsApp templates for approval via MSG91 dashboard.
3. Verify environment variables locally with development/test keys.
4. Use the `/api/communications/whatsapp` route to send a template message to a verified number.
5. Enable `ENABLE_WHATSAPP_INVITES=true` in development and test the invitation WhatsApp alongside existing email.
6. Gradually enable for trials and payments as needed.
7. Promote to production using production MSG91 keys and approved templates.

## Testing Checklist

- Environment validation logs warnings but no runtime crashes when WhatsApp is disabled.
- Sending a template WhatsApp message via the test route yields a success response.
- All templates are approved and working in MSG91 dashboard.
- Email flows (Resend/dev) are unaffected.
- Phone number validation and formatting works correctly.

## Acceptance Criteria

- `WHATSAPP_PROVIDER=msg91` and server config in place; secrets not exposed to client.
- `getWhatsAppService()` returns a working MSG91-backed service on the server.
- Test route(s) function end-to-end for template messaging.
- No regression to existing email behavior.
- All routes follow existing auth patterns; no RLS bypass [[memory:5667666]].
- Channel availability is gated by `subscription_plans.tier_level` (and optional `features[]`), enforcing:
  - Tier 1: email only
  - Tier 2: email + WhatsApp
  - Tier 3: email + WhatsApp (+ premium features)

## References

- MSG91 WhatsApp Documentation: [WhatsApp API](https://msg91.com/whatsapp)
- WhatsApp Business Platform: [Template Guidelines](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- Existing email abstraction: `src/lib/email-service.ts`
- Logger: `src/lib/logger.ts`