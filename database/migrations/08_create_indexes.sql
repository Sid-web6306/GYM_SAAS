-- 08. CREATE INDEXES
-- Additional performance indexes for complex queries and joins

-- ========== COMPOSITE INDEXES FOR COMMON QUERIES ==========

-- Multi-table joins for RBAC permission checking
CREATE INDEX IF NOT EXISTS idx_user_roles_permission_check ON public.user_roles(user_id, gym_id, is_active, role_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON public.role_permissions(role_id, permission_id);

-- Member activity queries
CREATE INDEX IF NOT EXISTS idx_member_activities_gym_date ON public.member_activities(
  (SELECT gym_id FROM public.members WHERE id = member_id), 
  DATE(timestamp), 
  activity_type
);

-- Member management queries
CREATE INDEX IF NOT EXISTS idx_members_gym_status_type ON public.members(gym_id, status, membership_type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_members_dates_status ON public.members(membership_start_date, membership_end_date, status);

-- Analytics and reporting indexes
CREATE INDEX IF NOT EXISTS idx_gym_metrics_reporting ON public.gym_metrics(gym_id, month_year, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_activities_analytics ON public.member_activities(
  DATE(timestamp), 
  activity_type,
  (SELECT gym_id FROM public.members WHERE id = member_id)
);

-- ========== SUBSCRIPTION SYSTEM INDEXES ==========

-- Subscription management
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_period ON public.subscriptions(user_id, status, current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON public.subscriptions(current_period_end, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_expiry ON public.subscriptions(trial_end_date, trial_status) WHERE trial_status = 'active';

-- Payment processing
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_default ON public.payment_methods(user_id, is_default, is_verified) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_subscription_events_processing ON public.subscription_events(created_at DESC, event_type, processed_at);

-- ========== SEARCH AND FILTERING INDEXES ==========

-- Text search indexes for members
CREATE INDEX IF NOT EXISTS idx_members_name_search ON public.members USING gin(to_tsvector('english', full_name));
CREATE INDEX IF NOT EXISTS idx_members_email_search ON public.members USING gin(to_tsvector('english', email));

-- Gym search
CREATE INDEX IF NOT EXISTS idx_gyms_name_search ON public.gyms USING gin(to_tsvector('english', name));

-- Document search
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON public.documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_gym_category ON public.documents(gym_id, category, is_public);

-- ========== TEMPORAL INDEXES FOR TIME-BASED QUERIES ==========

-- Activity timeline indexes
CREATE INDEX IF NOT EXISTS idx_member_activities_timeline ON public.member_activities(timestamp DESC, member_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_member_activities_hourly ON public.member_activities(DATE_TRUNC('hour', timestamp), activity_type);

-- Member lifecycle indexes
CREATE INDEX IF NOT EXISTS idx_members_created_timeline ON public.members(created_at DESC, gym_id, status);
CREATE INDEX IF NOT EXISTS idx_members_membership_timeline ON public.members(membership_start_date DESC, gym_id);

-- Subscription lifecycle
CREATE INDEX IF NOT EXISTS idx_subscriptions_timeline ON public.subscriptions(created_at DESC, user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_events_timeline ON public.subscription_events(created_at DESC, subscription_id, event_type);

-- ========== RBAC PERFORMANCE INDEXES ==========

-- Permission lookup optimization
CREATE INDEX IF NOT EXISTS idx_permissions_resource_lookup ON public.permissions(resource, action, name);
CREATE INDEX IF NOT EXISTS idx_user_roles_active_lookup ON public.user_roles(user_id, is_active, gym_id, role_id) WHERE is_active = true;

-- Role hierarchy queries
CREATE INDEX IF NOT EXISTS idx_roles_level_lookup ON public.roles(level DESC, name, is_system_role);
CREATE INDEX IF NOT EXISTS idx_user_roles_level_check ON public.user_roles(
  user_id, 
  gym_id, 
  (SELECT level FROM public.roles WHERE id = role_id)
) WHERE is_active = true;

-- ========== JSONB INDEXES FOR METADATA QUERIES ==========

-- Profile preferences and custom permissions
CREATE INDEX IF NOT EXISTS idx_profiles_custom_permissions ON public.profiles USING gin(custom_permissions);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON public.profiles USING gin(preferences);

-- Gym settings
CREATE INDEX IF NOT EXISTS idx_gyms_settings ON public.gyms USING gin(settings);

-- Member preferences and metadata
CREATE INDEX IF NOT EXISTS idx_members_preferences ON public.members USING gin(preferences);
CREATE INDEX IF NOT EXISTS idx_member_activities_metadata ON public.member_activities USING gin(metadata);

-- Subscription and payment metadata
CREATE INDEX IF NOT EXISTS idx_subscriptions_metadata ON public.subscriptions USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_payment_methods_metadata ON public.payment_methods USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_subscription_events_data ON public.subscription_events USING gin(event_data);

-- ========== PARTIAL INDEXES FOR COMMON FILTERS ==========

-- Active records only
CREATE INDEX IF NOT EXISTS idx_gyms_active_only ON public.gyms(id, name, owner_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_members_active_only ON public.members(id, gym_id, full_name) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_only ON public.subscriptions(id, user_id, current_period_end) WHERE status = 'active';

-- Recent activities (last 30 days)
CREATE INDEX IF NOT EXISTS idx_member_activities_recent ON public.member_activities(member_id, timestamp DESC, activity_type) 
  WHERE timestamp > (now() - interval '30 days');

-- Expiring trials and subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiring_trials ON public.subscriptions(trial_end_date, user_id) 
  WHERE trial_status = 'active' AND trial_end_date BETWEEN now() AND (now() + interval '7 days');

CREATE INDEX IF NOT EXISTS idx_subscriptions_expiring_soon ON public.subscriptions(current_period_end, user_id) 
  WHERE status = 'active' AND current_period_end BETWEEN now() AND (now() + interval '7 days');

-- ========== COVERING INDEXES FOR FREQUENT QUERIES ==========

-- Member list with essential info
CREATE INDEX IF NOT EXISTS idx_members_list_covering ON public.members(gym_id, status) 
  INCLUDE (id, full_name, email, membership_type, created_at);

-- Subscription status with plan details
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_covering ON public.subscriptions(user_id, status) 
  INCLUDE (id, subscription_plan_id, current_period_end, amount);

-- User roles with role details
CREATE INDEX IF NOT EXISTS idx_user_roles_covering ON public.user_roles(user_id, gym_id, is_active) 
  INCLUDE (role_id, assigned_at) WHERE is_active = true;

-- ========== CONSTRAINT INDEXES (ALREADY CREATED BY CONSTRAINTS) ==========
-- These are automatically created by PostgreSQL for constraints:
-- - Primary key indexes
-- - Unique constraint indexes  
-- - Foreign key indexes
-- 
-- Additional constraints for data integrity:

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_one_default_per_user 
  ON public.payment_methods(user_id) WHERE is_default = true;

-- Ensure unique active subscription per user (business rule)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_active_per_user 
  ON public.subscriptions(user_id) WHERE status = 'active';

-- Ensure unique gym owner (one owner per gym)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_one_owner_per_gym 
  ON public.profiles(gym_id) WHERE is_gym_owner = true;