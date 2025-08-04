-- 22. UPDATE EXISTING POLICIES WITH RBAC

-- Drop existing policies that we'll replace with RBAC-aware versions
DROP POLICY IF EXISTS "Users can view members from their gym" ON public.members;
DROP POLICY IF EXISTS "Users can insert members to their gym" ON public.members;
DROP POLICY IF EXISTS "Users can update members from their gym" ON public.members;
DROP POLICY IF EXISTS "Users can delete members from their gym" ON public.members;

DROP POLICY IF EXISTS "Gym owners can view their gym" ON public.gyms;
DROP POLICY IF EXISTS "Gym owners can update their gym" ON public.gyms;

DROP POLICY IF EXISTS "Users can view activities from their gym" ON public.member_activities;
DROP POLICY IF EXISTS "Users can insert activities to their gym" ON public.member_activities;
DROP POLICY IF EXISTS "Users can update activities from their gym" ON public.member_activities;
DROP POLICY IF EXISTS "Users can delete activities from their gym" ON public.member_activities;

DROP POLICY IF EXISTS "Users can view metrics from their gym" ON public.gym_metrics;
DROP POLICY IF EXISTS "Users can insert metrics to their gym" ON public.gym_metrics;
DROP POLICY IF EXISTS "Users can update metrics from their gym" ON public.gym_metrics;

-- ========== ENHANCED MEMBERS POLICIES WITH RBAC ==========

-- Members READ: Staff and above can view members
CREATE POLICY "RBAC: View members with read permission" ON public.members
  FOR SELECT USING (
    has_permission(auth.uid(), gym_id, 'members.read')
  );

-- Members CREATE: Staff and above can create members
CREATE POLICY "RBAC: Create members with create permission" ON public.members
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), gym_id, 'members.create')
  );

-- Members UPDATE: Staff and above can update members
CREATE POLICY "RBAC: Update members with update permission" ON public.members
  FOR UPDATE USING (
    has_permission(auth.uid(), gym_id, 'members.update')
  );

-- Members DELETE: Managers and above can delete members
CREATE POLICY "RBAC: Delete members with delete permission" ON public.members
  FOR DELETE USING (
    has_permission(auth.uid(), gym_id, 'members.delete')
  );

-- ========== ENHANCED GYMS POLICIES WITH RBAC ==========

-- Gyms READ: Anyone with gym access can view basic gym info
CREATE POLICY "RBAC: View gym with read permission" ON public.gyms
  FOR SELECT USING (
    has_permission(auth.uid(), id, 'gym.read') OR
    -- Allow if user has any role in the gym
    id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  );

-- Gyms UPDATE: Only owners and managers can update gym settings
CREATE POLICY "RBAC: Update gym with update permission" ON public.gyms
  FOR UPDATE USING (
    has_permission(auth.uid(), id, 'gym.update')
  );

-- ========== ENHANCED MEMBER ACTIVITIES POLICIES WITH RBAC ==========

-- Activities READ: Anyone with activities.read permission
CREATE POLICY "RBAC: View activities with read permission" ON public.member_activities
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.read')
    )
  );

-- Activities CREATE: Staff and above can log activities
CREATE POLICY "RBAC: Create activities with create permission" ON public.member_activities
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.create')
    )
  );

-- Activities UPDATE: Staff and above can update activities
CREATE POLICY "RBAC: Update activities with update permission" ON public.member_activities
  FOR UPDATE USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.update')
    )
  );

-- Activities DELETE: Managers and above can delete activities
CREATE POLICY "RBAC: Delete activities with delete permission" ON public.member_activities
  FOR DELETE USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.delete')
    )
  );

-- ========== ENHANCED GYM METRICS POLICIES WITH RBAC ==========

-- Metrics READ: Managers and above can view analytics
CREATE POLICY "RBAC: View metrics with analytics permission" ON public.gym_metrics
  FOR SELECT USING (
    has_permission(auth.uid(), gym_id, 'analytics.read')
  );

-- Metrics INSERT: System and managers can insert metrics
CREATE POLICY "RBAC: Create metrics with analytics permission" ON public.gym_metrics
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), gym_id, 'analytics.read') -- Read permission allows metric generation
  );

-- Metrics UPDATE: Managers and above can update metrics
CREATE POLICY "RBAC: Update metrics with analytics permission" ON public.gym_metrics
  FOR UPDATE USING (
    has_permission(auth.uid(), gym_id, 'analytics.read')
  );

-- ========== ENHANCED PROFILES POLICIES WITH RBAC ==========

-- Drop and recreate profile policies with RBAC awareness
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Enhanced profile policies
CREATE POLICY "RBAC: Users can view own profile and staff can view member profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR -- Own profile
    (
      gym_id IN (
        SELECT ur.gym_id 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND ur.is_active = true 
          AND r.level >= 50 -- Staff level and above
      )
    )
  );

CREATE POLICY "RBAC: Users can update own profile and managers can update member profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR -- Own profile
    (
      gym_id IN (
        SELECT ur.gym_id 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() 
          AND ur.is_active = true 
          AND r.level >= 75 -- Manager level and above
      )
    )
  );

-- ========== SUBSCRIPTIONS POLICIES WITH RBAC ==========

-- Enhanced subscription policies (owners and managers can view gym subscriptions)
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;

CREATE POLICY "RBAC: View subscriptions with billing permission" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR -- Own subscriptions
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.read')
  );

CREATE POLICY "RBAC: Update subscriptions with billing permission" ON public.subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id OR -- Own subscriptions
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.update')
  );

-- ========== PAYMENT METHODS POLICIES WITH RBAC ==========

-- Enhanced payment methods policies
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can update own payment methods" ON public.payment_methods;

CREATE POLICY "RBAC: View payment methods with billing permission" ON public.payment_methods
  FOR SELECT USING (
    auth.uid() = user_id OR -- Own payment methods
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.read')
  );

CREATE POLICY "RBAC: Update payment methods with billing permission" ON public.payment_methods
  FOR UPDATE USING (
    auth.uid() = user_id OR -- Own payment methods
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.update')
  );

-- ========== CREATE VIEW FOR EASY RBAC QUERIES ==========

-- Note: user_permissions_view is created in migration 23_secure_views.sql 
-- with proper security_invoker=on configuration for enhanced security