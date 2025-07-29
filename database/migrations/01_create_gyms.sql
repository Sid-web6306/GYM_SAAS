-- 1. CREATE TABLE gyms
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid NOT NULL DEFAULT gen_random_uuid(), 
  created_at timestamptz NOT NULL DEFAULT now(), 
  name text NULL, 
  owner_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gyms_pkey PRIMARY KEY (id)
); 