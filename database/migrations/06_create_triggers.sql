-- 06. CREATE TRIGGERS
-- Triggers for automatic updates, RBAC sync, and business logic

-- ========== UPDATED_AT TRIGGERS ==========

-- Trigger for gyms table
CREATE TRIGGER update_gyms_updated_at 
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for members table
CREATE TRIGGER update_members_updated_at 
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for gym_metrics table
CREATE TRIGGER update_gym_metrics_updated_at 
  BEFORE UPDATE ON public.gym_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at 
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payment_methods table
CREATE TRIGGER update_payment_methods_updated_at 
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_roles table
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for roles table
CREATE TRIGGER update_roles_updated_at 
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for documents table
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for feedback table
CREATE TRIGGER update_feedback_updated_at 
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for subscription_plans table
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== AUTH USER TRIGGER ==========

-- Trigger to create profile when user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========== RBAC SYNC TRIGGERS ==========

-- Function to automatically assign owner role when gym is created
CREATE OR REPLACE FUNCTION assign_gym_owner_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile to mark as gym owner
  UPDATE public.profiles 
  SET is_gym_owner = true, 
      default_role = 'owner',
      last_role_sync = now()
  WHERE id = NEW.owner_id;
  
  -- Insert owner role in user_roles table
  INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
  SELECT 
    NEW.owner_id,
    r.id,
    NEW.id,
    NEW.owner_id, -- Self-assigned
    now()
  FROM public.roles r
  WHERE r.name = 'owner'
  ON CONFLICT (user_id, gym_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    updated_at = now(),
    is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically assign owner role when gym is created
CREATE TRIGGER trigger_assign_gym_owner_role
  AFTER INSERT ON public.gyms
  FOR EACH ROW
  EXECUTE FUNCTION assign_gym_owner_role();

-- Function to sync user roles when profile is updated
CREATE OR REPLACE FUNCTION sync_user_role_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If gym_id changed or default_role changed, update user_roles
  IF (OLD.gym_id IS DISTINCT FROM NEW.gym_id) OR (OLD.default_role IS DISTINCT FROM NEW.default_role) THEN
    
    -- If gym_id changed, deactivate old role
    IF OLD.gym_id IS DISTINCT FROM NEW.gym_id AND OLD.gym_id IS NOT NULL THEN
      UPDATE public.user_roles 
      SET is_active = false, updated_at = now()
      WHERE user_id = NEW.id AND gym_id = OLD.gym_id;
    END IF;
    
    -- If user has a gym and a role, ensure user_roles entry exists
    IF NEW.gym_id IS NOT NULL AND NEW.default_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
      SELECT 
        NEW.id,
        r.id,
        NEW.gym_id,
        NEW.id, -- Self-assigned for profile updates
        now()
      FROM public.roles r
      WHERE r.name = NEW.default_role
      ON CONFLICT (user_id, gym_id) DO UPDATE SET
        role_id = EXCLUDED.role_id,
        updated_at = now(),
        is_active = true;
    END IF;
    
    -- Update last_role_sync timestamp
    NEW.last_role_sync = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for profile updates to sync roles
CREATE TRIGGER trigger_sync_user_role_on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_on_profile_update();

-- ========== BUSINESS LOGIC TRIGGERS ==========

-- Function to update gym metrics when member activities are recorded
CREATE OR REPLACE FUNCTION update_metrics_on_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_gym_id uuid;
BEGIN
  -- Get gym_id from member
  SELECT gym_id INTO activity_gym_id 
  FROM public.members 
  WHERE id = NEW.member_id;
  
  -- Update gym metrics for today
  IF activity_gym_id IS NOT NULL THEN
    PERFORM public.update_gym_metrics(activity_gym_id, CURRENT_DATE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update metrics when activities are recorded
CREATE TRIGGER trigger_update_metrics_on_activity
  AFTER INSERT ON public.member_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics_on_activity();

-- Function to update gym metrics when member status changes
CREATE OR REPLACE FUNCTION update_metrics_on_member_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update gym metrics for today when member is added/updated
  PERFORM public.update_gym_metrics(NEW.gym_id, CURRENT_DATE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update metrics when members are added or updated
CREATE TRIGGER trigger_update_metrics_on_member_insert
  AFTER INSERT ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION update_metrics_on_member_change();

CREATE TRIGGER trigger_update_metrics_on_member_update
  AFTER UPDATE ON public.members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_metrics_on_member_change();

-- ========== SUBSCRIPTION EVENT TRIGGERS ==========

-- Function to log subscription events on status changes
CREATE OR REPLACE FUNCTION log_subscription_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log subscription status changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
    VALUES (NEW.id, 'created', jsonb_build_object(
      'status', NEW.status,
      'plan_id', NEW.subscription_plan_id,
      'billing_cycle', NEW.billing_cycle
    ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.subscription_events (subscription_id, event_type, event_data)
    VALUES (NEW.id, 'updated', jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', now()
    ));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log subscription events
CREATE TRIGGER trigger_log_subscription_events
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION log_subscription_event();