-- 15. CREATE TRIGGERS

-- Drop all existing triggers first to ensure clean state
DO $$
BEGIN
    -- Drop triggers on auth.users
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Drop triggers on public tables
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    DROP TRIGGER IF EXISTS update_gyms_updated_at ON public.gyms;
    DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
    DROP TRIGGER IF EXISTS update_gym_metrics_updated_at ON public.gym_metrics;
    DROP TRIGGER IF EXISTS update_member_activities_updated_at ON public.member_activities;
    DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
    DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
    DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
    DROP TRIGGER IF EXISTS update_subscription_events_updated_at ON public.subscription_events;
END $$;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gym_metrics_updated_at BEFORE UPDATE ON public.gym_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_events_updated_at BEFORE UPDATE ON public.subscription_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 