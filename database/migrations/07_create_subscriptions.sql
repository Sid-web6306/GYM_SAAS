-- 7. CREATE TABLE subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  
  -- Status and lifecycle
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'canceled', 'past_due', 'incomplete', 'scheduled')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Timing
  starts_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  ends_at timestamptz NULL, -- NULL for active subscriptions
  canceled_at timestamptz NULL,
  paused_at timestamptz NULL,
  
  -- Trial fields (included from creation)
  trial_start_date timestamptz NULL,
  trial_end_date timestamptz NULL,
  trial_status text NULL CHECK (trial_status IN ('active', 'expired', 'converted', 'none')),
  
  -- Scheduled changes (for subscription updates)
  scheduled_change_type text NULL CHECK (scheduled_change_type IN ('plan_change', 'pause', 'cancel')),
  scheduled_change_effective_date timestamptz NULL,
  scheduled_change_data jsonb NULL, -- Store details about the scheduled change
  
  -- Stripe integration
  stripe_customer_id text NULL,
  stripe_subscription_id text NULL,
  stripe_subscription_item_id text NULL,
  stripe_price_id text NULL,
  
  -- Pricing (store actual amounts for this subscription)
  amount integer NOT NULL, -- Amount in paise
  currency text NOT NULL DEFAULT 'INR',
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id)
); 