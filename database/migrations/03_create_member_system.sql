-- 03. CREATE MEMBER SYSTEM
-- Members, activities, and gym metrics tables

-- ========== MEMBERS TABLE ==========
CREATE TABLE IF NOT EXISTS public.members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  membership_type text DEFAULT 'basic' CHECK (membership_type IN ('basic', 'premium', 'vip')),
  membership_start_date date DEFAULT CURRENT_DATE,
  membership_end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'cancelled')),
  notes text,
  avatar_url text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  
  CONSTRAINT members_gym_email_unique UNIQUE (gym_id, email)
);

-- ========== MEMBER ACTIVITIES TABLE ==========
CREATE TABLE IF NOT EXISTS public.member_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'check_in' CHECK (activity_type IN ('check_in', 'check_out', 'workout', 'class', 'personal_training', 'other')),
  timestamp timestamptz DEFAULT now(),
  notes text,
  duration_minutes integer,
  calories_burned integer,
  equipment_used text[],
  trainer_id uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

-- ========== GYM METRICS TABLE ==========
CREATE TABLE IF NOT EXISTS public.gym_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  month_year text NOT NULL, -- Format: 'YYYY-MM'
  total_members integer DEFAULT 0,
  active_members integer DEFAULT 0,
  new_members integer DEFAULT 0,
  cancelled_members integer DEFAULT 0,
  checked_in_today integer DEFAULT 0,
  total_check_ins integer DEFAULT 0,
  revenue_today decimal(10,2) DEFAULT 0.00,
  revenue_month decimal(10,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT gym_metrics_gym_date_unique UNIQUE (gym_id, metric_date)
);

-- ========== ENABLE ROW LEVEL SECURITY ==========
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_metrics ENABLE ROW LEVEL SECURITY;

-- ========== INDEXES FOR PERFORMANCE ==========
-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_gym ON public.members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_type ON public.members(membership_type);
CREATE INDEX IF NOT EXISTS idx_members_membership_dates ON public.members(membership_start_date, membership_end_date);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON public.members(created_by);

-- Member activities indexes
CREATE INDEX IF NOT EXISTS idx_member_activities_member ON public.member_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_timestamp ON public.member_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_member_activities_type ON public.member_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_member_activities_date ON public.member_activities(DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_member_activities_trainer ON public.member_activities(trainer_id) WHERE trainer_id IS NOT NULL;

-- Gym metrics indexes
CREATE INDEX IF NOT EXISTS idx_gym_metrics_gym ON public.gym_metrics(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_date ON public.gym_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_month ON public.gym_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_gym_date ON public.gym_metrics(gym_id, metric_date);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON public.members(gym_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_member_date ON public.member_activities(member_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_activities_gym_date ON public.member_activities(
  (SELECT gym_id FROM public.members WHERE id = member_id), 
  DATE(timestamp)
);