-- 14. CREATE FUNCTIONS

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user function with social auth support and trial initialization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  user_email := NEW.email;
  
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data ? 'name' THEN
    user_full_name := NEW.raw_user_meta_data->>'name';
  ELSE
    user_full_name := SPLIT_PART(user_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (
    id, 
    full_name,
    email,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(user_full_name, 'User'),
    user_email,
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete user profile function
DROP FUNCTION IF EXISTS public.complete_user_profile(uuid, text);
DROP FUNCTION IF EXISTS public.complete_user_profile(text, text);
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  user_id uuid,
  gym_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym_id uuid;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  IF gym_name IS NULL OR trim(gym_name) = '' THEN
    RAISE EXCEPTION 'gym_name cannot be null or empty';
  END IF;

  -- Insert the gym and return the ID
  INSERT INTO public.gyms (name, owner_id, created_at, updated_at)
  VALUES (trim(gym_name), user_id, NOW(), NOW())
  RETURNING id INTO new_gym_id;

  -- Update the profile with the gym ID
  UPDATE public.profiles
  SET gym_id = new_gym_id, updated_at = NOW()
  WHERE id = user_id;

  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for user %', user_id;
  END IF;

  RETURN new_gym_id;
END;
$$;

-- Record member activity function
DROP FUNCTION IF EXISTS public.record_member_activity(uuid, text, text);
CREATE OR REPLACE FUNCTION public.record_member_activity(
  member_id uuid,
  activity_type text DEFAULT 'check_in',
  activity_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_id uuid;
  member_gym_id uuid;
BEGIN
  -- Get the gym_id from the member record
  SELECT gym_id INTO member_gym_id FROM public.members WHERE id = member_id;
  
  IF member_gym_id IS NULL THEN
    RAISE EXCEPTION 'Member not found or has no associated gym';
  END IF;

  -- Insert the activity
  INSERT INTO public.member_activities (
    member_id, 
    activity_type, 
    timestamp, 
    notes
  )
  VALUES (
    member_id, 
    activity_type, 
    NOW(), 
    activity_notes
  )
  RETURNING id INTO activity_id;

  -- Update gym metrics for today
  PERFORM public.update_gym_metrics(member_gym_id, CURRENT_DATE);

  RETURN activity_id;
END;
$$;

-- Update gym metrics function
DROP FUNCTION IF EXISTS public.update_gym_metrics(uuid, date);
CREATE OR REPLACE FUNCTION public.update_gym_metrics(
  gym_id_param uuid,
  date_param date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_members_count integer;
  active_members_count integer;
  checked_in_today_count integer;
  new_members_count integer;
  month_year_str text;
BEGIN
  month_year_str := TO_CHAR(date_param, 'YYYY-MM');

  -- Calculate metrics
  SELECT COUNT(*) INTO total_members_count
  FROM public.members 
  WHERE gym_id = gym_id_param;

  SELECT COUNT(*) INTO active_members_count
  FROM public.members 
  WHERE gym_id = gym_id_param AND status = 'active';

  -- Use timestamp field for activity queries
  SELECT COUNT(*) INTO checked_in_today_count
  FROM public.member_activities ma
  JOIN public.members m ON m.id = ma.member_id
  WHERE m.gym_id = gym_id_param 
    AND DATE(ma.timestamp) = date_param 
    AND ma.activity_type = 'check_in';

  SELECT COUNT(*) INTO new_members_count
  FROM public.members 
  WHERE gym_id = gym_id_param 
    AND DATE(created_at) = date_param;

  -- Upsert metrics
  INSERT INTO public.gym_metrics (
    gym_id, 
    metric_date, 
    month_year, 
    total_members, 
    active_members, 
    checked_in_today, 
    new_members,
    created_at,
    updated_at
  )
  VALUES (
    gym_id_param, 
    date_param, 
    month_year_str, 
    total_members_count, 
    active_members_count, 
    checked_in_today_count, 
    new_members_count,
    NOW(),
    NOW()
  )
  ON CONFLICT (gym_id, metric_date) 
  DO UPDATE SET
    total_members = EXCLUDED.total_members,
    active_members = EXCLUDED.active_members,
    checked_in_today = EXCLUDED.checked_in_today,
    new_members = EXCLUDED.new_members,
    updated_at = NOW();
END;
$$;

-- Enhanced subscription access check function
DROP FUNCTION IF EXISTS public.check_subscription_access(uuid);
CREATE OR REPLACE FUNCTION public.check_subscription_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_subscription boolean := false;
  has_active_trial boolean := false;
BEGIN
  -- Check for active paid subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active'
    AND current_period_end > now()
    AND (trial_status IS NULL OR trial_status = 'converted')
  ) INTO has_active_subscription;
  
  -- Check for active trial subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active'
    AND trial_status = 'active'
    AND trial_end_date > now()
  ) INTO has_active_trial;

  
  RETURN has_active_subscription OR has_active_trial;
END;
$$;

-- Create subscription function
DROP FUNCTION IF EXISTS public.create_subscription(uuid, uuid, text, text, text, text, integer, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.create_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_billing_cycle text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_stripe_price_id text,
  p_amount integer,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_id uuid;
BEGIN
  -- Create the subscription with trial status handling
  INSERT INTO public.subscriptions (
    user_id, subscription_plan_id, billing_cycle,
    stripe_customer_id, stripe_subscription_id, stripe_price_id,
    amount, current_period_start, current_period_end, status, trial_status, trial_end_date
  ) VALUES (
    p_user_id, p_plan_id, p_billing_cycle,
    p_stripe_customer_id, p_stripe_subscription_id, p_stripe_price_id,
    p_amount, p_current_period_start, p_current_period_end, 'active', 'converted', p_current_period_end
  ) RETURNING id INTO subscription_id;
  
  -- Log subscription event
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (subscription_id, 'created', jsonb_build_object(
    'plan_id', p_plan_id,
    'billing_cycle', p_billing_cycle,
    'amount', p_amount
  ));
  
  RETURN subscription_id;
END;
$$;

-- Schedule subscription change function
DROP FUNCTION IF EXISTS public.schedule_subscription_change(uuid, text, timestamptz, jsonb);
CREATE OR REPLACE FUNCTION public.schedule_subscription_change(
  p_subscription_id uuid,
  p_change_type text,
  p_effective_date timestamptz,
  p_change_data jsonb DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    scheduled_change_type = p_change_type,
    scheduled_change_effective_date = p_effective_date,
    scheduled_change_data = p_change_data,
    updated_at = now()
  WHERE id = p_subscription_id;
  
  -- Log the scheduled change
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (p_subscription_id, 'plan_changed', jsonb_build_object(
    'change_type', p_change_type,
    'effective_date', p_effective_date,
    'change_data', p_change_data
  ));
  
  RETURN FOUND;
END;
$$;

-- Cancel subscription function
DROP FUNCTION IF EXISTS public.cancel_subscription(uuid, boolean);
CREATE OR REPLACE FUNCTION public.cancel_subscription(
  p_subscription_id uuid,
  p_cancel_at_period_end boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period_end timestamptz;
BEGIN
  -- Get current period end
  SELECT s.current_period_end INTO current_period_end
  FROM public.subscriptions s
  WHERE s.id = p_subscription_id;
  
  IF p_cancel_at_period_end THEN
    -- Schedule cancellation at period end
    UPDATE public.subscriptions
    SET 
      scheduled_change_type = 'cancel',
      scheduled_change_effective_date = current_period_end,
      canceled_at = now(),
      updated_at = now()
    WHERE id = p_subscription_id;
  ELSE
    -- Cancel immediately
    UPDATE public.subscriptions
    SET 
      status = 'canceled',
      ends_at = now(),
      canceled_at = now(),
      updated_at = now()
    WHERE id = p_subscription_id;
  END IF;
  
  -- Log cancellation event
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (p_subscription_id, 'canceled', jsonb_build_object(
    'cancel_at_period_end', p_cancel_at_period_end,
    'canceled_at', now()
  ));
  
  RETURN FOUND;
END;
$$;

-- Pause subscription function
DROP FUNCTION IF EXISTS public.pause_subscription(uuid);
CREATE OR REPLACE FUNCTION public.pause_subscription(
  p_subscription_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    status = 'paused',
    paused_at = now(),
    updated_at = now()
  WHERE id = p_subscription_id
  AND status = 'active';
  
  -- Log pause event
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (p_subscription_id, 'paused', jsonb_build_object('paused_at', now()));
  
  RETURN FOUND;
END;
$$;

-- Resume subscription function
DROP FUNCTION IF EXISTS public.resume_subscription(uuid);
CREATE OR REPLACE FUNCTION public.resume_subscription(
  p_subscription_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    status = 'active',
    paused_at = NULL,
    updated_at = now()
  WHERE id = p_subscription_id
  AND status = 'paused';
  
  -- Log resume event
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (p_subscription_id, 'resumed', jsonb_build_object('resumed_at', now()));
  
  RETURN FOUND;
END;
$$;

-- Add payment method function
DROP FUNCTION IF EXISTS public.add_payment_method(uuid, text, text, text, text, integer, integer, boolean);
CREATE OR REPLACE FUNCTION public.add_payment_method(
  p_user_id uuid,
  p_stripe_payment_method_id text,
  p_type text DEFAULT 'card',
  p_card_brand text DEFAULT NULL,
  p_card_last4 text DEFAULT NULL,
  p_card_exp_month integer DEFAULT NULL,
  p_card_exp_year integer DEFAULT NULL,
  p_is_default boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_method_id uuid;
BEGIN
  -- If setting as default, remove default from other methods
  IF p_is_default THEN
    UPDATE public.payment_methods 
    SET is_default = false, updated_at = now()
    WHERE user_id = p_user_id AND is_default = true;
  END IF;
  
  -- Insert new payment method
  INSERT INTO public.payment_methods (
    user_id, stripe_payment_method_id, type, 
    card_brand, card_last4, card_exp_month, card_exp_year,
    is_default
  ) VALUES (
    p_user_id, p_stripe_payment_method_id, p_type,
    p_card_brand, p_card_last4, p_card_exp_month, p_card_exp_year,
    p_is_default
  ) RETURNING id INTO payment_method_id;
  
  -- Log event in subscription events if user has subscription
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  SELECT s.id, 'payment_method_added', jsonb_build_object(
    'payment_method_id', payment_method_id,
    'type', p_type,
    'is_default', p_is_default,
    'card_brand', p_card_brand,
    'card_last4', p_card_last4
  )
  FROM public.subscriptions s 
  WHERE s.user_id = p_user_id 
  AND s.status = 'active'
  LIMIT 1;
  
  RETURN payment_method_id;
END;
$$;

-- Remove payment method function
DROP FUNCTION IF EXISTS public.remove_payment_method(uuid, uuid);
CREATE OR REPLACE FUNCTION public.remove_payment_method(
  p_user_id uuid,
  p_payment_method_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_payment_method RECORD;
BEGIN
  -- Get payment method details before removal
  SELECT * INTO removed_payment_method
  FROM public.payment_methods 
  WHERE id = p_payment_method_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Soft delete the payment method
  UPDATE public.payment_methods 
  SET is_active = false, updated_at = now()
  WHERE id = p_payment_method_id AND user_id = p_user_id;
  
  -- Log event in subscription events if user has subscription
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  SELECT s.id, 'payment_method_removed', jsonb_build_object(
    'payment_method_id', p_payment_method_id,
    'stripe_payment_method_id', removed_payment_method.stripe_payment_method_id,
    'type', removed_payment_method.type,
    'was_default', removed_payment_method.is_default
  )
  FROM public.subscriptions s 
  WHERE s.user_id = p_user_id 
  AND s.status = 'active'
  LIMIT 1;
  
  RETURN FOUND;
END;
$$;

-- Set default payment method function
DROP FUNCTION IF EXISTS public.set_default_payment_method(uuid, uuid);
CREATE OR REPLACE FUNCTION public.set_default_payment_method(
  p_user_id uuid,
  p_payment_method_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove default from all payment methods for this user
  UPDATE public.payment_methods 
  SET is_default = false, updated_at = now()
  WHERE user_id = p_user_id AND is_default = true;
  
  -- Set the specified payment method as default
  UPDATE public.payment_methods 
  SET is_default = true, updated_at = now()
  WHERE id = p_payment_method_id AND user_id = p_user_id AND is_active = true;
  
  -- Log event in subscription events if user has subscription
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  SELECT s.id, 'payment_method_updated', jsonb_build_object(
    'payment_method_id', p_payment_method_id,
    'action', 'set_default'
  )
  FROM public.subscriptions s 
  WHERE s.user_id = p_user_id 
  AND s.status = 'active'
  LIMIT 1;
  
  RETURN FOUND;
END;
$$;

-- Create document function
DROP FUNCTION IF EXISTS public.create_document(uuid, text, text, text, text, text, text, integer, text, text, date, jsonb);
CREATE OR REPLACE FUNCTION public.create_document(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_stripe_id text DEFAULT NULL,
  p_download_url text DEFAULT NULL,
  p_hosted_url text DEFAULT NULL,
  p_amount integer DEFAULT NULL,
  p_currency text DEFAULT 'INR',
  p_status text DEFAULT NULL,
  p_document_date date DEFAULT CURRENT_DATE,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  document_id uuid;
BEGIN
  -- Insert the document
  INSERT INTO public.documents (
    user_id, type, title, description, stripe_id, 
    download_url, hosted_url, amount, currency, status, 
    document_date, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_description, p_stripe_id,
    p_download_url, p_hosted_url, p_amount, p_currency, p_status,
    p_document_date, p_metadata
  ) RETURNING id INTO document_id;
  
  RETURN document_id;
END;
$$;

-- Initialize trial subscription function
DROP FUNCTION IF EXISTS public.initialize_trial_subscription(uuid);
CREATE OR REPLACE FUNCTION public.initialize_trial_subscription(
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_subscription_id uuid;
  starter_plan_id uuid;
BEGIN
  -- Check if user already has a trial subscription
  IF EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id AND trial_status IN ('active', 'expired', 'converted')
  ) THEN
    RAISE EXCEPTION 'User already has a trial subscription';
  END IF;

  -- Get the starter plan ID (assuming it's the cheapest plan)
  SELECT id INTO starter_plan_id 
  FROM public.subscription_plans 
  WHERE is_active = true 
  ORDER BY price_monthly_inr ASC 
  LIMIT 1;

  -- Create trial subscription if starter plan exists
  IF starter_plan_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription plan found';
  END IF;

  INSERT INTO public.subscriptions (
    user_id,
    subscription_plan_id,
    billing_cycle,
    status,
    trial_status,
    trial_start_date,
    trial_end_date,
    current_period_start,
    current_period_end,
    amount,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    starter_plan_id,
    'monthly',
    'active',
    'active',
    NOW(),
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days',
    0, -- Trial is free
    NOW(),
    NOW()
  ) RETURNING id INTO trial_subscription_id;

  -- Log trial started event
  INSERT INTO public.subscription_events (
    subscription_id,
    event_type,
    event_data,
    created_at
  ) VALUES (
    trial_subscription_id,
    'trial_started',
    jsonb_build_object(
      'trial_duration_days', 14,
      'plan_id', starter_plan_id,
      'user_id', p_user_id
    ),
    NOW()
  );

  RETURN trial_subscription_id;
END;
$$;

-- Get user ID by email function for Stripe webhooks
DROP FUNCTION IF EXISTS public.get_user_id_by_email(text);
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return user ID from auth.users by email
  RETURN (
    SELECT id 
    FROM auth.users 
    WHERE email = p_email 
    LIMIT 1
  );
END;
$$; 