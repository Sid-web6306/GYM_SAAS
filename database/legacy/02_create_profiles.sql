-- 2. CREATE TABLE profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL, 
  created_at timestamptz NOT NULL DEFAULT now(), 
  full_name text NULL, 
  -- email removed - use auth.users.email instead
  avatar_url text NULL,
  preferences jsonb DEFAULT '{}',
  gym_id uuid NULL,
  email text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- trial fields removed - now in subscriptions table
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_unique UNIQUE (email)
)