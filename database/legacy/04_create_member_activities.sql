-- 4. CREATE TABLE member_activities
CREATE TABLE IF NOT EXISTS public.member_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('check_in', 'check_out', 'visit', 'class_attended')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activity_time timestamptz NULL,
  CONSTRAINT member_activities_pkey PRIMARY KEY (id)
); 