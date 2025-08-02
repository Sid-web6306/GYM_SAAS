-- 16. SUBSCRIPTION SCHEMA CLEANUP AND DOCUMENTATION

-- Document unused fields that could be removed in future versions:
-- razorpay_subscription_item_id: Defined for Razorpay integration but not actively used
-- metadata: Defined with default '{}' but never used in functions

-- Add comments for field purposes
COMMENT ON COLUMN public.subscriptions.razorpay_subscription_item_id 
IS 'Razorpay subscription item ID - currently unused, reserved for future Razorpay integration features';

COMMENT ON COLUMN public.subscriptions.metadata 
IS 'JSON metadata for storing additional subscription information - currently unused';

COMMENT ON COLUMN public.subscriptions.trial_status 
IS 'Status of trial subscription: active (trial in progress), expired (trial ended), converted (trial converted to paid), none (not a trial)';

-- Add constraint to ensure trial fields are consistent
-- If trial_status indicates an active or expired trial, then trial dates should be set
-- This constraint helps maintain data integrity for trial subscriptions
ALTER TABLE public.subscriptions 
ADD CONSTRAINT check_trial_consistency 
CHECK (
  (trial_status IS NULL OR trial_status = 'none' OR trial_status = 'converted') OR 
  (trial_status IN ('active', 'expired') AND trial_start_date IS NOT NULL AND trial_end_date IS NOT NULL)
);