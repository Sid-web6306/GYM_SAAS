-- 16. CREATE POLICIES

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Gyms policies
CREATE POLICY "Gym owners can view their gym" ON public.gyms
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Gym owners can update their gym" ON public.gyms
  FOR UPDATE USING (
    auth.uid() = owner_id OR 
    id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create gyms" ON public.gyms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Users can view members from their gym" ON public.members
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their gym" ON public.members
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update members from their gym" ON public.members
  FOR UPDATE USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete members from their gym" ON public.members
  FOR DELETE USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Member activities policies (optimized - use member_id JOIN instead of gym_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_activities' AND policyname = 'Users can view activities from their gym') THEN
    CREATE POLICY "Users can view activities from their gym" ON public.member_activities
      FOR SELECT USING (
        member_id IN (
          SELECT m.id FROM public.members m 
          WHERE m.gym_id IN (
            SELECT id FROM public.gyms WHERE owner_id = auth.uid()
            UNION
            SELECT gym_id FROM public.profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_activities' AND policyname = 'Users can insert activities to their gym') THEN
    CREATE POLICY "Users can insert activities to their gym" ON public.member_activities
      FOR INSERT WITH CHECK (
        member_id IN (
          SELECT m.id FROM public.members m 
          WHERE m.gym_id IN (
            SELECT id FROM public.gyms WHERE owner_id = auth.uid()
            UNION
            SELECT gym_id FROM public.profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_activities' AND policyname = 'Users can update activities from their gym') THEN
    CREATE POLICY "Users can update activities from their gym" ON public.member_activities
      FOR UPDATE USING (
        member_id IN (
          SELECT m.id FROM public.members m 
          WHERE m.gym_id IN (
            SELECT id FROM public.gyms WHERE owner_id = auth.uid()
            UNION
            SELECT gym_id FROM public.profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'member_activities' AND policyname = 'Users can delete activities from their gym') THEN
    CREATE POLICY "Users can delete activities from their gym" ON public.member_activities
      FOR DELETE USING (
        member_id IN (
          SELECT m.id FROM public.members m 
          WHERE m.gym_id IN (
            SELECT id FROM public.gyms WHERE owner_id = auth.uid()
            UNION
            SELECT gym_id FROM public.profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

-- Gym metrics policies
CREATE POLICY "Users can view metrics from their gym" ON public.gym_metrics
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics to their gym" ON public.gym_metrics
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics from their gym" ON public.gym_metrics
  FOR UPDATE USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Subscription plans policies (public read access)
CREATE POLICY "Allow authenticated users to view subscription plans" ON public.subscription_plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow anonymous users to view subscription plans" ON public.subscription_plans
  FOR SELECT TO anon
  USING (true);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscription events policies
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert subscription events" ON public.subscription_events
  FOR INSERT WITH CHECK (true); -- Events are created by system functions

-- Payment methods policies
CREATE POLICY "Users can view own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id); 