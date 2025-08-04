-- 01. CREATE BASE SCHEMA
-- Core tables: gyms and profiles with RBAC integration from the start

-- ========== GYMS TABLE ==========
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true
);

-- ========== PROFILES TABLE WITH RBAC FIELDS ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NULL,
  email text NOT NULL,
  avatar_url text NULL,
  preferences jsonb DEFAULT '{}',
  gym_id uuid NULL REFERENCES public.gyms(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- RBAC fields integrated from start
  default_role text DEFAULT 'owner' CHECK (default_role IN ('owner', 'manager', 'staff', 'trainer', 'member')),
  custom_permissions jsonb DEFAULT '{}', -- Additional permissions beyond role
  is_gym_owner boolean DEFAULT false, -- Quick lookup for gym ownership
  last_role_sync timestamptz DEFAULT now(), -- Track when roles were last synced
  
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_unique UNIQUE (email)
);

-- ========== DOCUMENTS TABLE ==========
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT false,
  category text DEFAULT 'general' CHECK (category IN ('general', 'contract', 'policy', 'form', 'other'))
);

-- ========== FEEDBACK TABLE ==========
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gym_id uuid NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'support', 'billing')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES auth.users(id)
);

-- ========== ENABLE ROW LEVEL SECURITY ==========
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ========== INITIAL INDEXES FOR PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_gyms_active ON public.gyms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_profiles_gym ON public.profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gym_owner ON public.profiles(gym_id) WHERE is_gym_owner = true;
CREATE INDEX IF NOT EXISTS idx_profiles_default_role ON public.profiles(default_role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_documents_gym ON public.documents(gym_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_gym ON public.feedback(gym_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);