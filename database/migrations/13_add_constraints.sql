-- 13. ADD CONSTRAINTS

-- Unique constraints
ALTER TABLE public.subscription_plans ADD CONSTRAINT IF NOT EXISTS subscription_plans_name_unique UNIQUE (name);
ALTER TABLE public.subscription_plans ADD CONSTRAINT IF NOT EXISTS subscription_plans_stripe_product_id_unique UNIQUE (stripe_product_id);

-- Foreign key constraints
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT IF NOT EXISTS profiles_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD CONSTRAINT IF NOT EXISTS members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
ALTER TABLE public.member_activities ADD CONSTRAINT IF NOT EXISTS member_activities_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.gym_metrics ADD CONSTRAINT IF NOT EXISTS gym_metrics_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;

-- Status and type check constraints
ALTER TABLE public.members ADD CONSTRAINT IF NOT EXISTS members_status_check CHECK (status IN ('active', 'inactive', 'pending'));
ALTER TABLE public.member_activities ADD CONSTRAINT IF NOT EXISTS member_activities_activity_type_check CHECK (activity_type IN ('check_in', 'check_out', 'visit', 'class_attended'));

-- Subscription events event_type check constraint
ALTER TABLE public.subscription_events ADD CONSTRAINT IF NOT EXISTS subscription_events_event_type_check CHECK (event_type IN (
  'created', 'activated', 'paused', 'resumed', 'canceled', 
  'plan_changed', 'payment_succeeded', 'payment_failed',
  'trial_started', 'trial_extended', 'trial_converted', 'trial_expired',
  'payment_method_added', 'payment_method_removed', 'payment_method_updated'
));

-- Feedback unique constraint
ALTER TABLE public.feedback ADD CONSTRAINT IF NOT EXISTS feedback_unique UNIQUE (subscription_id); 