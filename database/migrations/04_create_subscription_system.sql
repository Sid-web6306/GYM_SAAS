-- 04. CREATE SUBSCRIPTION SYSTEM
-- Subscription plans, user subscriptions, payment methods, and events

-- ========== SUBSCRIPTION PLANS TABLE ==========
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  price_monthly integer NOT NULL, -- Price in smallest currency unit (paise for INR)
  price_yearly integer, -- Yearly pricing (optional)
  currency text DEFAULT 'INR',
  features jsonb DEFAULT '[]', -- Array of features
  max_members integer DEFAULT 100, -- Member limit for this plan
  max_staff integer DEFAULT 5, -- Staff limit for this plan
  is_active boolean DEFAULT true,
  is_popular boolean DEFAULT false, -- Popular plan badge
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========== SUBSCRIPTIONS TABLE ==========
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'paused')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Razorpay integration fields
  razorpay_customer_id text,
  razorpay_subscription_id text,
  razorpay_price_id text,
  
  -- Subscription details
  amount integer NOT NULL, -- Amount in smallest currency unit
  currency text DEFAULT 'INR',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  
  -- Trial information
  trial_status text CHECK (trial_status IN ('active', 'expired', 'converted')),
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  
  -- Cancellation
  cancel_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========== PAYMENT METHODS TABLE ==========
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Razorpay fields
  razorpay_payment_method_id text,
  razorpay_customer_id text,
  
  -- Payment method details
  type text NOT NULL CHECK (type IN ('card', 'upi', 'netbanking', 'wallet')),
  last_four text, -- Last 4 digits for cards
  brand text, -- Card brand (visa, mastercard, etc.)
  bank text, -- Bank name for netbanking/UPI
  
  -- Status and metadata
  is_default boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========== SUBSCRIPTION EVENTS TABLE ==========
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled', 'renewed', 'trial_started', 'trial_ended', 'payment_succeeded', 'payment_failed', 'invoice_created', 'invoice_paid')),
  event_data jsonb DEFAULT '{}',
  razorpay_event_id text, -- Razorpay webhook event ID
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ========== ENABLE ROW LEVEL SECURITY ==========
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- ========== INDEXES FOR PERFORMANCE ==========
-- Subscription plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON public.subscription_plans(sort_order);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON public.subscriptions(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period ON public.subscriptions(current_period_start, current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON public.subscriptions(trial_status, trial_end_date) WHERE trial_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id, status) WHERE status = 'active';

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_razorpay ON public.payment_methods(razorpay_customer_id) WHERE razorpay_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON public.payment_methods(type);

-- Subscription events indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_date ON public.subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_razorpay ON public.subscription_events(razorpay_event_id) WHERE razorpay_event_id IS NOT NULL;