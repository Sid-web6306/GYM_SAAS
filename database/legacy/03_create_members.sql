-- 3. CREATE TABLE members
CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(), 
  created_at timestamptz NOT NULL DEFAULT now(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  first_name text NULL,
  last_name text NULL,
  email text NULL,
  phone_number text NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  join_date timestamptz DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_pkey PRIMARY KEY (id)
); 