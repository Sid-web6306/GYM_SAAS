-- 17. INSERT SAMPLE SUBSCRIPTION PLANS
-- This migration adds sample tiered subscription plans for Razorpay integration

BEGIN;

-- Insert Starter Plans
INSERT INTO public.subscription_plans (
  name, price_inr, billing_cycle, plan_type, member_limit, features,
  tier_level, api_access_enabled, multi_gym_enabled, data_retention_months,
  priority_support, advanced_analytics, custom_reporting
) VALUES 
  ('Starter Monthly', , 'monthly', 'starter', 50, 
   ARRAY['Member Management', 'Basic Check-ins', 'Simple Dashboard', 'Mobile App Access'], 
   1, false, false, 3, false, false, false),
  ('Starter Annual', 299000, 'annual', 'starter', 50, 
   ARRAY['Member Management', 'Basic Check-ins', 'Simple Dashboard', 'Mobile App Access'], 
   1, false, false, 3, false, false, false);

-- Insert Professional Plans  
INSERT INTO public.subscription_plans (
  name, price_inr, billing_cycle, plan_type, member_limit, features,
  tier_level, api_access_enabled, multi_gym_enabled, data_retention_months,
  priority_support, advanced_analytics, custom_reporting
) VALUES 
  ('Professional Monthly', 79900, 'monthly', 'professional', 200, 
   ARRAY['All Starter Features', 'Advanced Analytics', 'Member Growth Charts', 'Revenue Tracking', 'Email Notifications', 'Check-in Trends', 'Member Reports'], 
   2, false, false, 12, false, true, false),
  ('Professional Annual', 799000, 'annual', 'professional', 200, 
   ARRAY['All Starter Features', 'Advanced Analytics', 'Member Growth Charts', 'Revenue Tracking', 'Email Notifications', 'Check-in Trends', 'Member Reports'], 
   2, false, false, 12, false, true, false);

-- Insert Enterprise Plans
INSERT INTO public.subscription_plans (
  name, price_inr, billing_cycle, plan_type, member_limit, features,
  tier_level, api_access_enabled, multi_gym_enabled, data_retention_months,
  priority_support, advanced_analytics, custom_reporting
) VALUES 
  ('Enterprise Monthly', 149900, 'monthly', 'enterprise', NULL, 
   ARRAY['All Professional Features', 'API Access', 'Multi-Gym Management', 'Custom Reports', 'Priority Support', 'Advanced Retention Analytics', 'Unlimited Data Storage', 'White-label Options'], 
   3, true, true, 36, true, true, true),
  ('Enterprise Annual', 1499000, 'annual', 'enterprise', NULL, 
   ARRAY['All Professional Features', 'API Access', 'Multi-Gym Management', 'Custom Reports', 'Priority Support', 'Advanced Retention Analytics', 'Unlimited Data Storage', 'White-label Options'], 
   3, true, true, 36, true, true, true);

-- Note: Indexes for subscription_plans are already created in 12_create_indexes.sql

-- Add helpful comments
COMMENT ON TABLE public.subscription_plans IS 'Razorpay-based subscription plans with tiered features';
COMMENT ON COLUMN public.subscription_plans.razorpay_plan_id IS 'Razorpay Plan ID for API integration (populated during plan creation)';
COMMENT ON COLUMN public.subscription_plans.billing_cycle IS 'Monthly or annual billing cycle (separate plans for each)';
COMMENT ON COLUMN public.subscription_plans.plan_type IS 'Plan tier: starter, professional, or enterprise';
COMMENT ON COLUMN public.subscription_plans.tier_level IS '1=starter, 2=professional, 3=enterprise';

COMMIT;

-- Sample plans created successfully!
-- 
-- Pricing Structure:
-- Starter: ₹299/month, ₹2,990/year (50 members, basic features)
-- Professional: ₹799/month, ₹7,990/year (200 members, advanced analytics)
-- Enterprise: ₹1,499/month, ₹14,990/year (unlimited, API access, multi-gym)
--
-- Each plan has enhanced tier features like:
-- - API access (Enterprise only)
-- - Multi-gym management (Enterprise only)  
-- - Data retention policies (3/12/36 months)
-- - Priority support (Enterprise only)
-- - Advanced analytics (Professional+)
-- - Custom reporting (Enterprise only)