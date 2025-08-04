-- 5. CREATE TABLE gym_metrics
CREATE TABLE IF NOT EXISTS public.gym_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  month_year text NOT NULL,
  total_members integer DEFAULT 0,
  active_members integer DEFAULT 0,
  new_members integer DEFAULT 0,
  checked_in_today integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  retention_rate numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gym_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT gym_metrics_gym_date_unique UNIQUE (gym_id, metric_date)
); 