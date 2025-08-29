### Member Portal PWA: Check‑In/Check‑Out Architecture

This document captures the implementation approach to enable gym members to access a mobile PWA for self-service check-in/check-out while preserving the separation between staff management (Team) and customer management (Members). This leverages the existing robust attendance system and implements a flexible three-flow member management strategy.

### Goals
- Provide members with a minimal, fast, offline‑capable PWA to check in/out and view their own info.
- Leverage existing attendance system (`attendance_sessions` table) for unified data management.
- Implement flexible member management with three distinct flows:
  1. **Add Member Only**: Customer record without portal access
  2. **Invite to Portal**: Link existing member to authenticated user
  3. **Add Member + Portal**: Combined flow for new members with immediate portal access
- Maintain clear separation of concerns:
  - Team page manages staff/trainers/managers (no member invites here).
  - Members page manages customer records with optional portal invitations.
- Preserve and leverage RLS; do not bypass existing security model.
- Reuse existing attendance infrastructure and RPC functions.

### Non‑Goals
- Not replacing existing staff dashboards or attendance system.
- Not implementing full member self‑service (payments, plans, etc.) in v1.
- Not creating duplicate attendance tracking systems.

### Personas
- **Member**: Uses PWA on mobile to check in/out and view own recent activity.
- **Staff/Trainer/Manager**: Manages members, views attendance analytics; can optionally invite members to portal.

### High‑Level Architecture
- Members remain domain entities in `public.members`.
- Authenticated users (via Supabase) can be assigned role `member` to access the PWA.
- A secure linkage is established between an authenticated user and the `members` row via a foreign key (`members.user_id`).
- **Attendance uses existing `attendance_sessions` table** with `subject_type='member'` and `member_id` reference.
- PWA is offline‑first: check‑ins are enqueued when offline and synced when online.
- Staff can see all member attendance in existing `/attendance` dashboard.

### Data Model Changes

#### 1) Link `members` to authenticated users
```sql
ALTER TABLE public.members
  ADD COLUMN user_id uuid NULL REFERENCES auth.users(id);

-- Member states:
-- user_id = NULL: Customer record only (no portal access)
-- user_id = UUID: Linked to authenticated user (has portal access)
```

#### 2) Attendance Integration (No Changes Needed)
**The existing `attendance_sessions` table already supports member check-ins:**
```sql
-- Table: public.attendance_sessions (already exists)
-- When subject_type = 'member':
--   - member_id: References members.id
--   - staff_user_id: NULL
--   - All existing RPC functions work seamlessly

-- Existing RPC Functions (already implemented):
-- • start_attendance_session() - Handles member check-ins
-- • end_attendance_session() - Handles member check-outs  
-- • get_member_attendance() - Lists member attendance
-- • get_staff_attendance() - Lists staff attendance
```

#### 3) Member Management Flow States
```sql
-- Three possible member states:
-- 1. Customer Only: members.user_id = NULL (no portal)
-- 2. Portal Member: members.user_id = auth_user_id (has portal)
-- 3. Invited Pending: invitation sent, not yet accepted
```

### RLS Policies

#### Members Table
```sql
-- Enable RLS (if not already enabled)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Staff and above can manage their gym members (existing policies apply)

-- NEW: Member user can read only their own member record
CREATE POLICY members_read_own
  ON public.members FOR SELECT
  USING (user_id = auth.uid());

-- Members cannot insert/update/delete member records
-- (Staff policies govern those actions)
```

#### Attendance Sessions (Leverage Existing RLS)
```sql
-- Table: public.attendance_sessions (RLS already enabled)
-- Existing policies use activities.* permissions:
-- • activities.read - View attendance
-- • activities.create - Start sessions  
-- • activities.update - Modify sessions
-- • activities.delete - Remove sessions

-- RBAC Integration:
-- Member role has: activities.create, activities.read
-- Staff+ roles have: all activities.* permissions

-- When member calls start_attendance_session():
-- ✅ RLS allows if user has activities.create permission
-- ✅ member_id derived from members.user_id = auth.uid()
-- ✅ All validation handled by existing RPC functions
```

### Three-Flow Member Management Strategy

#### Flow 1: Add Member Only (Existing - No Changes)
```typescript
// Current functionality in /members page
// Creates customer record without portal access
interface AddMemberData {
  first_name: string
  last_name: string  
  email?: string
  phone_number?: string
  status: 'active' | 'inactive' | 'pending'
  // user_id remains NULL = no portal access
}
```

#### Flow 2: Invite to Portal (New - From Existing Member)
```typescript
// New action in member row dropdown
<DropdownMenuItem onClick={() => inviteToPortal(member.id)}>
  <Mail className="h-4 w-4 mr-2" />
  Invite to Portal
</DropdownMenuItem>

// Implementation:
// • Uses existing invitation system
// • Sets role = 'member' 
// • Embeds member_id in invitation metadata
// • Pre-fills email from member record
// • On acceptance: UPDATE members SET user_id = auth.uid() WHERE id = member_id
```

#### Flow 3: Add Member + Portal (New - Combined)
```typescript
// Enhanced add member form
interface AddMemberWithPortalData extends AddMemberData {
  send_portal_invitation: boolean
}

// Implementation:
// • Create member record
// • If send_portal_invitation = true:
//   - Send invitation with member_id in metadata
//   - On acceptance: link user_id to created member
```

### Invitation and Linking Flow Integration
- **Team invites remain staff‑only** (no member role in team management)
- **Member portal invitations** use existing invitation pipeline with `role = 'member'`
- **Invitation metadata** includes `member_id` for linking
- **On invitation acceptance** (existing verify route):
  - If `role = 'member'`: Update `members.user_id = auth.uid()` where `id = metadata.member_id`
  - Assign member role permissions via existing RBAC system
  - No RLS bypass; all operations use standard permission checks

### API Design (Leverage Existing RPC Functions)

#### Member Check-in/Check-out Endpoints
```typescript
// POST /api/members/checkin - Start attendance session
interface CheckinRequest {
  method?: string  // 'pwa', 'mobile', etc.
  notes?: string
}
// Implementation: Calls existing start_attendance_session() RPC
// • Resolves member_id from members.user_id = auth.uid()
// • Uses subject_type = 'member'
// • RLS enforced via activities.create permission

// POST /api/members/checkout - End attendance session  
interface CheckoutRequest {
  checkout_at?: string  // Optional custom checkout time
}
// Implementation: Calls existing end_attendance_session() RPC
// • Finds open session for current member
// • Uses existing RLS policies
```

#### Member Attendance History
```typescript
// GET /api/members/attendance?from=...&to=...&limit=...
// Implementation: Calls existing get_member_attendance() RPC
// • Filters to current user's member_id only
// • Uses activities.read permission
// • Returns same format as staff attendance view
```

#### Member Profile Access
```typescript
// GET /api/members/me - Get own member profile
// Implementation: Direct query to members table
// • WHERE user_id = auth.uid()
// • Uses new members_read_own RLS policy
```

### PWA UX (v1) - Member Portal Routes

#### Route Structure
```
/portal/          - Member dashboard (check-in/out)
/portal/history   - Member's attendance history  
/portal/profile   - Member's profile view
```

#### Member Dashboard (/portal)
- **Mobile-first design** with large touch targets
- **Smart check-in/out buttons**:
  - Show current status (checked in/out)
  - Contextual button state and messaging
  - Real-time status updates
- **Quick stats**: Today's session time, this week's visits
- **Recent activity preview**: Last 3-5 check-ins
- **Install prompt** and offline indicator via existing PWA scaffolding

#### Offline Behavior (Leveraging Existing PWA Infrastructure)
- **Queue check-ins** in IndexedDB when offline
- **Background sync** via existing Workbox configuration
- **UI feedback**: Shows queued state and eventual sync success
- **Graceful degradation**: Essential features work offline

### Security & Abuse Mitigation (Progressive)

#### Phase 1: Basic Protection (Immediate)
- **Rate limiting**: Minimum 2-minute intervals between check-ins/outs
- **Session validation**: Prevent overlapping sessions via existing RPC logic
- **Permission checks**: RLS + RBAC enforcement

#### Phase 2: Enhanced Validation (Future)
- **QR code validation**: Optional front-desk token scanning
- **Geofence validation**: Coarse location checking around gym coordinates  
- **Device fingerprinting**: Store device metadata in attendance session
- **Time-based rules**: Gym operating hours enforcement

### RBAC Integration (Existing System)

#### Member Role Permissions (Already Configured)
```typescript
// Member role (level 25) has:
- profile.read        // View own profile
- activities.create   // Start/end attendance sessions  
- activities.read     // View own attendance history

// Members do NOT have:
- members.* permissions (cannot manage member records)
- staff.* permissions (cannot manage staff)
- analytics.* permissions (cannot view gym analytics)
```

#### Staff Visibility & Management
- **Unified attendance view**: Member self-check-ins appear in staff `/attendance` dashboard
- **Same data model**: No separate tracking systems to reconcile
- **Permission-based access**: Staff see member attendance via existing `activities.read` permission

### Analytics & Reporting (Leverages Existing System)

#### Staff Analytics (No Changes)
- **Existing `/attendance` dashboard** shows all member and staff attendance
- **Real-time present counts** include members who self-checked in
- **Attendance reports** use same `attendance_sessions` data source
- **Filtering and search** works across both member and staff sessions

#### Member View (New)
- **Personal dashboard**: Own attendance history only
- **Simple metrics**: Visit frequency, total time, streaks
- **No gym-wide analytics**: Members cannot see other members' data

### Phased Implementation Plan

#### Phase 1: Database Foundation
```sql
-- Single schema change needed:
ALTER TABLE public.members ADD COLUMN user_id uuid NULL REFERENCES auth.users(id);

-- Add RLS policy for member self-access:
CREATE POLICY members_read_own ON public.members FOR SELECT USING (user_id = auth.uid());
```

#### Phase 2: Member Management Enhancements
- **"Invite to Portal"** action in existing Members page
- **Portal status indicator** showing which members have portal access
- **Enhanced invitation acceptance** to link `user_id` to member records

#### Phase 3: Member-Facing APIs  
- **Member check-in/out endpoints** using existing RPC functions
- **Member profile access** with RLS protection
- **Member attendance history** with filtering

#### Phase 4: Portal UI Development
- **Member dashboard** with check-in/out functionality
- **Attendance history view** with search and filtering
- **Profile management** for member self-service

#### Phase 5: PWA Enhancements
- **Offline check-in queueing** using existing service worker
- **Push notifications** for reminders (optional)
- **Install prompts** for better mobile experience

### Benefits of This Unified Approach ✅

#### Technical Benefits
- **Single source of truth**: One attendance table for all users
- **Reuses existing infrastructure**: No duplicate systems to maintain
- **Consistent data model**: Staff and member attendance use same schema
- **Leverages existing RLS**: Proven security model without bypasses
- **Unified analytics**: Member self-check-ins appear in staff reports

#### Business Benefits  
- **Flexible member management**: Three flows accommodate different member types
- **Gradual portal rollout**: Optional portal access per member
- **Staff visibility**: All attendance visible in existing dashboard
- **Reduced complexity**: Single system to learn and maintain

### Risks & Considerations

#### Technical Risks
- **Email collisions**: Multiple members with same email need staff resolution
- **Multi-gym scenarios**: Users with multiple gym memberships need gym context selection
- **Rate limiting**: Balance between abuse prevention and legitimate use
- **Offline sync conflicts**: Handle check-ins made offline by multiple devices

#### Business Considerations
- **Member adoption**: Not all members may want digital portal access
- **Staff training**: Need to understand three-flow member management
- **Privacy concerns**: Members may prefer manual check-in only
- **Validation requirements**: Some gyms may need QR/location validation

### Future Enhancements (Roadmap)

#### Phase 6: Enhanced Member Features
- **Membership status display**: Show current plan, expiry dates
- **Class schedules**: View and book upcoming classes  
- **Guest management**: Add guest check-ins for members
- **Achievement tracking**: Visit streaks, milestones, badges

#### Phase 7: Advanced Integrations
- **Payment integration**: View billing, make payments
- **Wearable device sync**: Integration with fitness trackers
- **Social features**: Member community, challenges
- **Nutrition tracking**: Meal plans, dietary goals

#### Phase 8: Advanced Validation
- **QR code systems**: Dynamic codes for secure check-ins
- **Geofencing**: Location-based validation
- **Biometric integration**: Fingerprint or face recognition
- **NFC/RFID**: Contactless member cards

### Implementation Notes & Best Practices

#### Security Requirements
- **Strict RLS adherence**: No privileged bypasses in any API routes
- **Permission-based access**: All operations use existing RBAC system
- **Rate limiting**: Implement at API and database levels
- **Audit logging**: Track all member portal activities

#### Code Organization
- **Reuse existing patterns**: Follow established project conventions
- **Shared type definitions**: Use `src/types/supabase.ts` throughout
- **Dynamic forms**: All UI actions follow existing dynamic-form patterns
- **Consistent error handling**: Use established error boundaries and messaging

#### Data Management
- **Real-time updates**: Leverage existing subscription patterns
- **Optimistic updates**: Use established mutation patterns
- **Caching strategy**: Follow existing TanStack Query patterns
- **State management**: Use existing store patterns for portal state


