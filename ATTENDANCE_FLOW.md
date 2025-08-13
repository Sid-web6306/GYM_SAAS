## Attendance Flow

This document describes the end-to-end attendance architecture for members and staff, including the database model, RBAC/RLS, RPC interfaces, frontend integration, and realtime behavior.

### Goals

- Single attendance system for both members and staff
- Secure by default (RLS enforced, no bypass)
- Efficient list queries and simple mutations (start/end sessions)
- Realtime UI updates

## Data Model

### Table: `public.attendance_sessions`

- `id` (uuid, pk)
- `gym_id` (uuid, fk → `gyms.id`, cascade delete)
- `subject_type` ('member' | 'staff')
- `member_id` (uuid, fk → `members.id`, nullable when `subject_type='staff'`)
- `staff_user_id` (uuid, fk → `profiles.id`, nullable when `subject_type='member'`)
- `check_in_at` (timestamptz, default now)
- `check_out_at` (timestamptz, null until checkout)
- `method` (text, optional; e.g. kiosk, mobile, manual)
- `notes` (text, optional)
- `created_by` (uuid, fk → `profiles.id`, set from `auth.uid()` if available)
- `created_at`, `updated_at` (timestamptz)

Constraints/invariants:
- If `subject_type='member'`, then `member_id` is required and `gym_id` is derived from that member
- If `subject_type='staff'`, then `staff_user_id` is required and `gym_id` is derived from that staff user profile
- `check_out_at >= check_in_at`
- Exactly one of (`member_id`, `staff_user_id`) is non-null, matching `subject_type` (CHECK)
- At most one open session per subject (partial UNIQUE index)

DDL (indicative):
- CHECK ((subject_type='member' AND member_id IS NOT NULL AND staff_user_id IS NULL)
         OR (subject_type='staff' AND staff_user_id IS NOT NULL AND member_id IS NULL))
- CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
- UNIQUE (gym_id, subject_type, member_id, staff_user_id) WHERE check_out_at IS NULL
Indexes:
- `(gym_id, check_in_at desc)`
- `(subject_type, member_id, staff_user_id)`

## Security (RBAC + RLS)

- Row Level Security is enabled on `attendance_sessions`
- Policies reuse existing `activities.*` permissions:
  - View: `activities.read`
  - Create: `activities.create`
  - Update: `activities.update`
  - Delete: `activities.delete`
- All policy checks are scoped to the row `gym_id`

This aligns with the project’s policy to never bypass RLS.

## RPC Interfaces

All functions run with invoker security and are protected by RLS.

### List (Members)

Function: `public.get_member_attendance(
  p_gym_id uuid,
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)` → returns rows:

- `session_id`, `member_id`, `name`, `role`, `check_in_at`, `check_out_at`, `total_seconds`

Notes:
- `total_seconds` is computed server-side: if `check_out_at` is null, it’s `now() - check_in_at`

### List (Staff)

Function: `public.get_staff_attendance(
  p_gym_id uuid,
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)` → returns rows:
Behavior:
- Starting a session reuses an existing open session for the same subject (if any) to prevent duplicates
- Ending a session only sets `check_out_at` if it’s still null

Concurrency-safe design:
- Ensure the partial UNIQUE index (see Data Model) exists.
- In start_attendance_session:
  - INSERT with derived gym_id; ON CONFLICT ON CONSTRAINT unique_open_session DO
    UPDATE SET /* fields = EXCLUDED.fields */ WHERE attendance_sessions.check_out_at IS NULL
    RETURNING *
- In end_attendance_session:
  - UPDATE attendance_sessions
    SET check_out_at = p_checkout_at
    WHERE id = p_session_id
      AND check_out_at IS NULL
    RETURNING *
- Use a single transaction per call; SERIALIZABLE isolation (or default with the above
  ON CONFLICT logic) to fully guard against races.
    p_checkout_at timestamptz default now()
  )` → returns updated session

Behavior:
- Starting a session reuses an existing open session for the same subject (if any) to prevent duplicates
- Ending a session only sets `check_out_at` if it’s still null

## Frontend Integration

### Page

- Route: `src/app/(app)/attendance/page.tsx`
- Tabs:
  - Members Attendance
  - Staff Attendance
- Columns: Name, Role, Check-in, Check-out, Total Time
- Actions:
  - Check-out button on open sessions (calls `end_attendance_session`)

### Hooks

- `useMemberAttendance(gymId, filters)` → calls `get_member_attendance`
- `useStaffAttendance(gymId, filters)` → calls `get_staff_attendance`
- `useStartAttendance()` → calls `start_attendance_session`
- `useEndAttendance()` → calls `end_attendance_session`
- `formatDurationFromSeconds(seconds)` → returns human-readable duration (e.g. `1h 25m`)

Source: `src/hooks/use-attendance.ts`

### Types

- `attendance_sessions` is defined in `src/types/supabase.ts`
- RPC function signatures are also declared there for type-safety

### Realtime

- Realtime subscription added for `attendance_sessions` filtered by `gym_id`
- Query invalidation keys:
  - `['attendance','members', gymId]`
  - `['attendance','staff', gymId]`

Source: `src/hooks/use-realtime-simple.ts`

## UX Notes & Edge Cases

- Total Time shows a running duration for open sessions (server computes seconds from `now() - check_in_at`)
- Prevent overlapping sessions by reusing open session on `start_attendance_session`
- If a user forgets to check out, manager/staff with `activities.update` can end the session later
- Searching is case-insensitive on names/emails (server-side in list RPCs)

## Environment & Deployment

- If your Supabase instance is already configured (tables/RPCs/policies exist), no additional migrations are required
- Otherwise, ensure schema aligns with the interfaces above and RLS remains enabled

## Future Enhancements

- Date range filters (from/to) surfaced in the UI
- Bulk export (guarded by `analytics.export`)
- Kiosk mode with QR/NFC integration
- Session health checks (e.g., very long open sessions)


