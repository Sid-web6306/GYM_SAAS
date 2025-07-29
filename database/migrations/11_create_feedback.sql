-- 11. CREATE TABLE feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN (
    'too_expensive', 'not_using', 'missing_features', 'switching_platform', 
    'technical_issues', 'customer_service', 'other'
  )),
  feedback_text text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  would_recommend boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_unique UNIQUE (subscription_id)
); 