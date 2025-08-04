-- Fix subscription_plans table compatibility

-- Add missing columns to subscription_plans table
ALTER TABLE public.subscription_plans 
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price_monthly integer,
  ADD COLUMN IF NOT EXISTS price_yearly integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS max_members integer,
  ADD COLUMN IF NOT EXISTS max_staff integer,
  ADD COLUMN IF NOT EXISTS is_popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update existing records to have the new fields
UPDATE public.subscription_plans SET
  display_name = COALESCE(display_name, INITCAP(name)),
  description = COALESCE(description, 'Gym membership plan'),
  price_monthly = COALESCE(price_monthly, price_inr),
  max_members = COALESCE(max_members, member_limit),
  max_staff = COALESCE(max_staff, 5),
  sort_order = COALESCE(sort_order, tier_level);

-- Show the updated structure
\echo 'Updated subscription_plans table structure:'
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'subscription_plans' 
  AND column_name IN ('display_name', 'description', 'price_monthly', 'max_members', 'max_staff')
ORDER BY ordinal_position;