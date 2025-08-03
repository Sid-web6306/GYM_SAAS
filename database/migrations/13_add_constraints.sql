-- 13. ADD CONSTRAINTS

DO $$
BEGIN
    -- Unique constraints for subscription_plans
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_name_unique') THEN
        ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_name_unique UNIQUE (name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_razorpay_plan_id_unique') THEN
        ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_razorpay_plan_id_unique UNIQUE (razorpay_plan_id);
    END IF;

    -- Foreign key constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_gym_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_gym_id_fkey') THEN
        ALTER TABLE public.members ADD CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_activities_member_id_fkey') THEN
        ALTER TABLE public.member_activities ADD CONSTRAINT member_activities_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gym_metrics_gym_id_fkey') THEN
        ALTER TABLE public.gym_metrics ADD CONSTRAINT gym_metrics_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
    END IF;

    -- Status and type check constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_status_check') THEN
        ALTER TABLE public.members ADD CONSTRAINT members_status_check CHECK (status IN ('active', 'inactive', 'pending'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_activities_activity_type_check') THEN
        ALTER TABLE public.member_activities ADD CONSTRAINT member_activities_activity_type_check CHECK (activity_type IN ('check_in', 'check_out', 'visit', 'class_attended'));
    END IF;

    -- Subscription events event_type check constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_events_event_type_check') THEN
        ALTER TABLE public.subscription_events ADD CONSTRAINT subscription_events_event_type_check CHECK (event_type IN (
          'created', 'activated', 'paused', 'resumed', 'canceled', 
          'plan_changed', 'payment_succeeded', 'payment_failed',
          'trial_started', 'trial_extended', 'trial_converted', 'trial_expired',
          'payment_method_added', 'payment_method_removed', 'payment_method_updated'
        ));
    END IF;

    -- Feedback unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedback_unique') THEN
        ALTER TABLE public.feedback ADD CONSTRAINT feedback_unique UNIQUE (subscription_id);
    END IF;

END $$; 