### Member Portal PWA: Check‑In/Check‑Out Architecture

This document captures a proposed approach to enable gym members to access a mobile PWA to perform self service Check‑In/Check‑Out while preserving the separation between staff management (Team) and customer management (Members). This is a future-ready plan to be implemented incrementally without breaking existing flows or Row Level Security (RLS).

### Goals
- Provide members with a minimal, fast, offline‑capable PWA to check in/out and view their own info.
- Maintain clear separation of concerns:
  - Team page manages staff/trainers/managers (no member invites here).
  - Members page manages customer records and can optionally invite a member to the portal.
- Preserve and leverage RLS; do not bypass it.
- Avoid duplicate sources of truth between `members` and user roles.

### Non‑Goals
- Not replacing existing staff dashboards.
- Not implementing full member self‑service (payments, plans, etc.) in v1.

### Personas
- Member: Uses PWA on mobile to check in/out and view own recent activity.
- Staff/Trainer/Manager: Manages members, views attendance analytics; doesn’t use member PWA.

### High‑Level Architecture
- Members remain domain entities in `public.members`.
- Authenticated users (via Supabase) can be assigned role `member` to access the PWA.
- A secure linkage is established between an authenticated user and the `members` row via a foreign key (`members.user_id`).
- Check‑ins are recorded in a dedicated table `member_checkins` via RLS‑guarded inserts.
- PWA is offline‑first: check‑ins are enqueued when offline and synced when online.

### Data Model Changes
1) Link `members` to authenticated users
```
ALTER TABLE public.members
  ADD COLUMN user_id uuid NULL REFERENCES auth.users(id);

-- Optional: if profiles table is the local identity anchor
-- ADD COLUMN user_id uuid NULL REFERENCES public.profiles(id);
```

2) Check‑ins table
```
CREATE TABLE public.member_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in','out')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'pwa',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.member_checkins (gym_id, member_id, occurred_at DESC);
```

### RLS Policies (outline)
- Members table
```
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Staff and above can manage their gym members (existing policies apply).

-- Member user can read only their own member record
CREATE POLICY members_read_own
  ON public.members FOR SELECT
  USING (user_id = auth.uid());

-- Disallow members from inserting/updating/deleting members rows
-- (Staff policies govern those actions.)
```

- Check‑ins table
```
ALTER TABLE public.member_checkins ENABLE ROW LEVEL SECURITY;

-- Members can insert check‑ins only for their linked member row and gym
CREATE POLICY checkins_insert_self
  ON public.member_checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = member_checkins.member_id
        AND m.user_id = auth.uid()
        AND m.gym_id = member_checkins.gym_id
    )
  );

-- Members can read only their own check‑ins
CREATE POLICY checkins_select_self
  ON public.member_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.id = member_checkins.member_id
        AND m.user_id = auth.uid()
    )
  );

-- Staff/Managers can read check‑ins for their gym (reuse existing staff RLS approach)
```

### Invitation and Linking Flow
- Remove `member` role from generic Team invites. Team remains staff‑only.
- Add “Invite to Portal” action on `Members` page rows:
  - Uses existing invitation pipeline; sets role = `member` and embeds `member_id` in invite metadata.
  - Pre‑fills email from the member record.
- On invitation acceptance (existing verify route):
  - If role is `member`, link the authenticated user to the `members` row:
    - Prefer `member_id` from metadata to update `members.user_id`.
    - Fallback: match on gym_id + email if metadata missing and link if unambiguous.
  - Ensure permission checks; no RLS bypass.

### API Design (minimal)
- POST `/api/checkins` body: `{ type: 'in' | 'out' }`
  - Server resolves current user → `members.user_id`, determines `member_id` and `gym_id`, and performs Supabase insert into `member_checkins`.
  - RLS enforces self‑access.

- GET `/api/checkins/me?limit=…&cursor=…`
  - Returns paginated check‑ins for the current user’s linked `member_id`.

### PWA UX (v1)
- Member Home (mobile‑first):
  - Large buttons: “Check‑In” and “Check‑Out” (contextual state; rate‑limited).
  - Last status and timestamp, recent history list.
  - Install prompt and offline indicator via existing PWA scaffolding.

- Offline behavior:
  - Queue check‑ins in IndexedDB when offline; background sync via Workbox when online.
  - UI reflects queued state and eventual success.

### Security & Abuse Mitigation (progressive)
- Phase 1: Basic toggling with server‑side rate limiting (e.g., minimum 2 min between toggles).
- Phase 2: Optional validations per gym:
  - Rotating front‑desk QR validation (PWA scans ephemeral token to authorize on‑prem check‑in).
  - Coarse geofence around gym coordinates.
  - Device fingerprint stored in `metadata` for audits.

### RBAC Mapping
- Member role minimal permissions:
  - `profile.read`
  - `activities.create` (to insert check‑ins)
  - `activities.read` (to view own history)

- Staff/Trainer/Manager retain existing permissions for analytics and member management.

### Analytics
- Staff dashboards read from `member_checkins` aggregated by day/hour for attendance and utilization.
- Members see only their own history.

### Phased Rollout
1) Schema + RLS
   - Add `members.user_id`, create `member_checkins`, apply RLS policies.
2) Invitations
   - Add “Invite to Portal” action on Members, remove `member` from Team invites.
   - Update acceptance handler to link `user_id` to `members`.
3) API
   - Implement `/api/checkins` endpoints with RLS‑safe Supabase access.
4) PWA UI
   - Minimal Member Home with check‑in/out and history; offline queueing.
5) Optional hardening
   - Rate limiting, QR validation, geofence.

### Risks & Open Questions
- Email collisions: If multiple members share an email, linking by email fallback must be disabled or resolved by staff.
- Attendance model: Some gyms may require scan‑based validation; keep the API flexible to add `token` or `location` constraints.
- Multi‑gym accounts: If users belong to multiple gyms, the PWA must select the active gym context before check‑in.

### Future Enhancements
- Display membership status/plan, upcoming classes, and pass balance.
- Self‑service profile updates with server‑side validation.
- Push notifications for reminders or streaks (via web push).

### Implementation Notes
- Maintain strict RLS adherence; no privileged bypass in API routes.
- Prefer using shared type definitions from `src/types/supabase.ts` and existing client wrappers.
- Keep UI actions dynamic‑form driven to match project conventions.


