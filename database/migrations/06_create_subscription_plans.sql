-- 6. CREATE TABLE subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- e.g., "Professional Monthly", "Enterprise Annual"
  price_inr integer NOT NULL, -- Price in paise (single price per plan)
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
  
  -- Razorpay Integration
  razorpay_plan_id text UNIQUE, -- Razorpay Plan ID for API integration
  
  -- Plan Features and Limits
  member_limit integer, -- NULL for unlimited
  features text[] DEFAULT '{}',
  
  -- Enhanced Tier Features
  tier_level integer NOT NULL DEFAULT 1 CHECK (tier_level IN (1, 2, 3)), -- 1=starter, 2=professional, 3=enterprise
  api_access_enabled boolean DEFAULT false,
  multi_gym_enabled boolean DEFAULT false,
  data_retention_months integer DEFAULT 12,
  priority_support boolean DEFAULT false,
  advanced_analytics boolean DEFAULT false,
  custom_reporting boolean DEFAULT false,
  
  -- Status and Metadata
  is_active boolean DEFAULT true, 
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
); 