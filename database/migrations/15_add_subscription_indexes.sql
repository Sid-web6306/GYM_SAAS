-- 15. ADD SUBSCRIPTION PERFORMANCE INDEXES

-- Index for user subscription lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions (user_id, status);

-- Index for subscription access checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period_end 
ON public.subscriptions (status, current_period_end);

-- Index for trial subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_active 
ON public.subscriptions (user_id, trial_status, trial_end_date) 
WHERE trial_status = 'active';

-- Index for Razorpay integration lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id 
ON public.subscriptions (razorpay_subscription_id) 
WHERE razorpay_subscription_id IS NOT NULL;

-- Index for subscription events foreign key
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id 
ON public.subscription_events (subscription_id);

-- Index for scheduled changes
CREATE INDEX IF NOT EXISTS idx_subscriptions_scheduled_changes 
ON public.subscriptions (scheduled_change_effective_date) 
WHERE scheduled_change_type IS NOT NULL;