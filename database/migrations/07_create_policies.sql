-- 07. CREATE POLICIES
-- Row Level Security policies using RBAC system

-- ========== RBAC SYSTEM POLICIES ==========

-- Roles table policies
CREATE POLICY "Authenticated users can view all roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- Permissions table policies
CREATE POLICY "Authenticated users can view all permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- Role permissions table policies
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- User roles table policies
CREATE POLICY "Users can view own roles and gym roles they manage" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    -- Gym owners can view roles within their gym (using profile check to avoid recursion)
    gym_id IN (
      SELECT p.gym_id 
      FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.is_gym_owner = true
    ) OR
    -- Managers can view roles within their gym (using direct role level check)
    gym_id IN (
      SELECT g.id 
      FROM public.gyms g
      JOIN public.profiles p ON p.gym_id = g.id
      WHERE p.id = auth.uid()
        AND (p.default_role IN ('owner', 'manager') OR p.is_gym_owner = true)
    )
  );

-- Gym owners and managers can manage user roles within their gym
CREATE POLICY "Gym owners and managers can manage user roles" ON public.user_roles
  FOR ALL USING (
    -- Gym owners can manage roles in their gym
    gym_id IN (
      SELECT p.gym_id 
      FROM public.profiles p
      WHERE p.id = auth.uid() 
        AND p.is_gym_owner = true
    ) OR
    -- Managers can manage roles in their gym
    gym_id IN (
      SELECT g.id 
      FROM public.gyms g
      JOIN public.profiles p ON p.gym_id = g.id
      WHERE p.id = auth.uid()
        AND p.default_role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    -- Can only assign roles within gyms they manage
    (
      gym_id IN (
        SELECT p.gym_id 
        FROM public.profiles p
        WHERE p.id = auth.uid() 
          AND p.is_gym_owner = true
      ) OR
      gym_id IN (
        SELECT g.id 
        FROM public.gyms g
        JOIN public.profiles p ON p.gym_id = g.id
        WHERE p.id = auth.uid()
          AND p.default_role IN ('owner', 'manager')
      )
    )
    AND
    -- Cannot assign owner role unless you are the gym owner
    (
      role_id NOT IN (SELECT id FROM public.roles WHERE name = 'owner')
      OR 
      gym_id IN (
        SELECT p.gym_id 
        FROM public.profiles p
        WHERE p.id = auth.uid() 
          AND p.is_gym_owner = true
      )
    )
  );

-- System can insert user roles during registration/profile updates
CREATE POLICY "System can manage user roles during profile operations" ON public.user_roles
  FOR INSERT WITH CHECK (
    -- Allow if it's the user assigning themselves a role (during profile update)
    assigned_by = auth.uid() AND user_id = auth.uid()
  );

-- ========== GYMS TABLE POLICIES ==========

-- Anyone with gym access can view basic gym info
CREATE POLICY "RBAC: View gym with access" ON public.gyms
  FOR SELECT USING (
    -- Allow if user has profile in this gym (avoids circular dependency)
    id IN (
      SELECT p.gym_id 
      FROM public.profiles p 
      WHERE p.id = auth.uid()
    )
  );

-- Only owners and managers can update gym settings
CREATE POLICY "RBAC: Update gym with permission" ON public.gyms
  FOR UPDATE USING (
    -- Allow if user is manager or owner in profile
    id IN (
      SELECT p.gym_id 
      FROM public.profiles p 
      WHERE p.id = auth.uid() 
        AND (p.is_gym_owner = true OR p.default_role IN ('owner', 'manager'))
    )
  );

-- Users can create gyms (during onboarding)
CREATE POLICY "Users can create gyms" ON public.gyms
  FOR INSERT WITH CHECK (true); -- Any authenticated user can create a gym

-- ========== PROFILES TABLE POLICIES ==========

-- Users can view own profile and staff can view member profiles
CREATE POLICY "RBAC: View profiles with access" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );

-- Users can update own profile and managers can update member profiles
CREATE POLICY "RBAC: Update profiles with permission" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR -- Own profile
    (
      -- Check if user has manager+ level role in the same gym (using profile default_role)
      gym_id IN (
        SELECT p2.gym_id 
        FROM public.profiles p2
        WHERE p2.id = auth.uid() 
          AND p2.gym_id = profiles.gym_id
          AND p2.default_role IN ('owner', 'manager')
      )
    )
  );

-- Users can create their own profile (during registration)
CREATE POLICY "Users can create own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== MEMBERS TABLE POLICIES ==========

-- Staff and above can view members
CREATE POLICY "RBAC: View members with permission" ON public.members
  FOR SELECT USING (
    has_permission(auth.uid(), gym_id, 'members.read')
  );

-- Staff and above can create members
CREATE POLICY "RBAC: Create members with permission" ON public.members
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), gym_id, 'members.create')
  );

-- Staff and above can update members
CREATE POLICY "RBAC: Update members with permission" ON public.members
  FOR UPDATE USING (
    has_permission(auth.uid(), gym_id, 'members.update')
  );

-- Managers and above can delete members
CREATE POLICY "RBAC: Delete members with permission" ON public.members
  FOR DELETE USING (
    has_permission(auth.uid(), gym_id, 'members.delete')
  );

-- ========== MEMBER ACTIVITIES TABLE POLICIES ==========

-- Anyone with activities.read permission can view activities
CREATE POLICY "RBAC: View activities with permission" ON public.member_activities
  FOR SELECT USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.read')
    )
  );

-- Staff and above can log activities
CREATE POLICY "RBAC: Create activities with permission" ON public.member_activities
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.create')
    )
  );

-- Staff and above can update activities
CREATE POLICY "RBAC: Update activities with permission" ON public.member_activities
  FOR UPDATE USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.update')
    )
  );

-- Managers and above can delete activities
CREATE POLICY "RBAC: Delete activities with permission" ON public.member_activities
  FOR DELETE USING (
    member_id IN (
      SELECT m.id FROM public.members m 
      WHERE has_permission(auth.uid(), m.gym_id, 'activities.delete')
    )
  );

-- ========== GYM METRICS TABLE POLICIES ==========

-- Managers and above can view analytics
CREATE POLICY "RBAC: View metrics with permission" ON public.gym_metrics
  FOR SELECT USING (
    has_permission(auth.uid(), gym_id, 'analytics.read')
  );

-- System and managers can insert metrics
CREATE POLICY "RBAC: Create metrics with permission" ON public.gym_metrics
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), gym_id, 'analytics.read') -- Read permission allows metric generation
  );

-- Managers and above can update metrics
CREATE POLICY "RBAC: Update metrics with permission" ON public.gym_metrics
  FOR UPDATE USING (
    has_permission(auth.uid(), gym_id, 'analytics.read')
  );

-- ========== SUBSCRIPTIONS TABLE POLICIES ==========

-- View own subscriptions or with billing permission
CREATE POLICY "RBAC: View subscriptions with permission" ON public.subscriptions
  FOR SELECT USING (
    auth.uid() = user_id OR -- Own subscriptions
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.read')
  );

-- Update own subscriptions or with billing permission
CREATE POLICY "RBAC: Update subscriptions with permission" ON public.subscriptions
  FOR UPDATE USING (
    auth.uid() = user_id OR -- Own subscriptions
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.update')
  );

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== PAYMENT METHODS TABLE POLICIES ==========

-- View own payment methods or with billing permission
CREATE POLICY "RBAC: View payment methods with permission" ON public.payment_methods
  FOR SELECT USING (
    auth.uid() = user_id OR -- Own payment methods
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.read')
  );

-- Update own payment methods or with billing permission
CREATE POLICY "RBAC: Update payment methods with permission" ON public.payment_methods
  FOR UPDATE USING (
    auth.uid() = user_id OR -- Own payment methods
    has_permission(auth.uid(), (
      SELECT gym_id FROM public.profiles WHERE id = user_id
    ), 'billing.update')
  );

-- Users can create their own payment methods
CREATE POLICY "Users can create own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== SUBSCRIPTION PLANS TABLE POLICIES ==========

-- Everyone can view active subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- ========== SUBSCRIPTION EVENTS TABLE POLICIES ==========

-- View subscription events for own subscriptions or with billing permission
CREATE POLICY "RBAC: View subscription events with permission" ON public.subscription_events
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions 
      WHERE user_id = auth.uid()
    ) OR
    subscription_id IN (
      SELECT s.id FROM public.subscriptions s
      WHERE has_permission(auth.uid(), (
        SELECT gym_id FROM public.profiles WHERE id = s.user_id
      ), 'billing.read')
    )
  );

-- System can create subscription events
CREATE POLICY "System can create subscription events" ON public.subscription_events
  FOR INSERT WITH CHECK (true); -- Events are created by system/webhooks

-- ========== DOCUMENTS TABLE POLICIES ==========

-- View documents in accessible gyms
CREATE POLICY "RBAC: View documents with gym access" ON public.documents
  FOR SELECT USING (
    is_public = true OR
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.is_active = true
    )
  );

-- Staff and above can create documents
CREATE POLICY "RBAC: Create documents with staff access" ON public.documents
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true 
        AND r.level >= 50 -- Staff level and above
    )
  );

-- Document uploader and managers can update documents
CREATE POLICY "RBAC: Update own documents or with manager access" ON public.documents
  FOR UPDATE USING (
    auth.uid() = uploaded_by OR
    has_role_level(auth.uid(), gym_id, 75) -- Manager level
  );

-- ========== FEEDBACK TABLE POLICIES ==========

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create feedback
CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback" ON public.feedback
  FOR DELETE USING (auth.uid() = user_id);


  CREATE POLICY "Staff can view gym member profiles" ON public.profiles                    
  FOR SELECT USING (                                                                     
    auth.uid() IN (                                                                      
      SELECT ur.user_id                                                                  
      FROM public.user_roles ur                                                          
      JOIN public.roles r ON ur.role_id = r.id                                           
      WHERE ur.gym_id = profiles.gym_id                                                  
      AND ur.is_active = true                                                          
      AND r.name IN ('owner', 'manager', 'staff', 'trainer')                           
      )                                                                                    
   );                                                                                     