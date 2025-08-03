-- 12. CREATE INDEXES

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON public.documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_user_type_date ON public.documents(user_id, type, document_date);
CREATE INDEX IF NOT EXISTS idx_documents_razorpay_id ON public.documents(razorpay_id) WHERE razorpay_id IS NOT NULL;

-- Subscription events indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_id ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON public.subscription_events(created_at);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_subscription_id ON public.feedback(subscription_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reason ON public.feedback(reason);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default) WHERE is_default = true;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial ON public.subscriptions(user_id, trial_status) WHERE trial_status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription_id ON public.subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_customer_id ON public.subscriptions(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_scheduled_changes ON public.subscriptions(scheduled_change_effective_date) WHERE scheduled_change_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Subscription plans indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_razorpay_plan_id ON public.subscription_plans(razorpay_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type_billing_cycle ON public.subscription_plans(plan_type, billing_cycle);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier_level ON public.subscription_plans(tier_level);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON public.members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_status_gym_id ON public.members(gym_id, status);

-- Gyms indexes
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id ON public.gyms(owner_id);

-- Member activities indexes
-- Remove old activity_time indexes to prevent bloat and planner confusion
DROP INDEX IF EXISTS public.idx_member_activities_activity_time;
DROP INDEX IF EXISTS public.idx_member_activities_member_time_activity_time;
DROP INDEX IF EXISTS public.idx_member_activities_type_time_activity_time;

CREATE INDEX IF NOT EXISTS idx_member_activities_member_id ON public.member_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_timestamp ON public.member_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_member_activities_type ON public.member_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_member_activities_member_time ON public.member_activities(member_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_member_activities_type_time ON public.member_activities(activity_type, timestamp);

-- Gym metrics indexes
CREATE INDEX IF NOT EXISTS idx_gym_metrics_gym_id ON public.gym_metrics(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_metric_date ON public.gym_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_month_year ON public.gym_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_gym_metrics_gym_month ON public.gym_metrics(gym_id, month_year);

-- Unique constraints as indexes
CREATE UNIQUE INDEX IF NOT EXISTS members_gym_email_idx ON public.members USING btree (gym_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS gym_metrics_gym_date_idx ON public.gym_metrics USING btree (gym_id, metric_date); 