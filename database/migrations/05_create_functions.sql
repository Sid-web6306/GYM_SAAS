-- 05. CREATE FUNCTIONS
-- Business logic functions including RBAC-aware user handling

-- ========== UTILITY FUNCTIONS ==========

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== RBAC-AWARE USER HANDLING ==========

-- Handle new user function with RBAC integration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  user_email := NEW.email;
  
  -- Extract name from metadata (for social auth)
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data ? 'name' THEN
    user_full_name := NEW.raw_user_meta_data->>'name';
  ELSE
    user_full_name := SPLIT_PART(user_email, '@', 1);
  END IF;

  -- Create profile with RBAC fields initialized
  INSERT INTO public.profiles (
    id, 
    full_name,
    email,
    default_role,
    is_gym_owner,
    custom_permissions,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(user_full_name, 'User'),
    user_email,
    'owner', -- Default role for new users (will be updated during onboarding)
    false, -- Will be set to true when they create a gym
    '{}', -- Empty custom permissions initially
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== GYM MANAGEMENT FUNCTIONS ==========

-- Complete user profile and create gym with RBAC integration
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
  owner_role_id uuid;
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

  -- Update the profile with the gym ID and mark as gym owner
  UPDATE public.profiles
  SET 
    gym_id = new_gym_id, 
    is_gym_owner = true,
    default_role = 'owner',
    last_role_sync = NOW(),
    updated_at = NOW()
  WHERE id = user_id;

  -- Get the owner role ID
  SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner';

  -- Assign owner role to user for this gym
  INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
  VALUES (user_id, owner_role_id, new_gym_id, user_id, NOW())
  ON CONFLICT (user_id, gym_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    updated_at = NOW(),
    is_active = true;

  RETURN new_gym_id;
END;
$$;

-- ========== MEMBER ACTIVITY FUNCTIONS ==========

-- Record member activity function
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
    notes,
    created_by
  )
  VALUES (
    member_id, 
    activity_type, 
    NOW(), 
    activity_notes,
    auth.uid()
  )
  RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$;

-- ========== GYM METRICS FUNCTIONS ==========

-- Update gym metrics function
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

-- ========== SUBSCRIPTION FUNCTIONS ==========

-- Check if user has active subscription or trial
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
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
CREATE OR REPLACE FUNCTION public.create_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_billing_cycle text,
  p_razorpay_customer_id text,
  p_razorpay_subscription_id text,
  p_razorpay_price_id text,
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
    razorpay_customer_id, razorpay_subscription_id, razorpay_price_id,
    amount, current_period_start, current_period_end, status, trial_status, trial_end_date
  ) VALUES (
    p_user_id, p_plan_id, p_billing_cycle,
    p_razorpay_customer_id, p_razorpay_subscription_id, p_razorpay_price_id,
    p_amount, p_current_period_start, p_current_period_end, 'active', 'converted', p_current_period_end
  ) RETURNING id INTO subscription_id;
  
  -- Log subscription event
  INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
  VALUES (subscription_id, 'created', jsonb_build_object(
    'plan_id', p_plan_id,
    'billing_cycle', p_billing_cycle,
    'amount', p_amount,
    'payment_provider', 'razorpay'
  ));
  
  RETURN subscription_id;
END;
$$;