-- 6. CREATE TABLE subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price_monthly_inr integer NOT NULL, -- Price in paise (100 paise = 1 rupee)
  price_annual_inr integer NOT NULL, -- Price in paise for annual billing
  member_limit integer, -- NULL for unlimited
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  stripe_product_id text, -- Stripe Product ID for direct mapping
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
); 