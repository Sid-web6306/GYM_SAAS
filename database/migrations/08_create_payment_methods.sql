-- 8. CREATE TABLE payment_methods
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_payment_method_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('card', 'bank_account', 'wallet', 'upi', 'netbanking')),
  -- Card details removed - fetch from Razorpay API when needed for freshness
  -- Payment method details (optional - can be fetched from Razorpay)
  card_brand text NULL,
  card_last4 text NULL,
  card_exp_month integer NULL,
  card_exp_year integer NULL,
  -- Status and metadata
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT unique_razorpay_payment_method UNIQUE (razorpay_payment_method_id)
); 