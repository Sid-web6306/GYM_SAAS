-- 10. CREATE VIEWS
-- Secure views for easy data access with proper RBAC integration

-- ========== USER PERMISSIONS VIEW ==========

-- Secure view showing user permissions with security_invoker=on
CREATE OR REPLACE VIEW user_permissions_view 
WITH (security_invoker=on) AS
SELECT 
  ur.user_id,
  ur.gym_id,
  r.name as role_name,
  r.display_name as role_display_name,
  r.level as role_level,
  ARRAY_AGG(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as role_permissions,
  ur.assigned_at,
  ur.expires_at,
  p_profile.custom_permissions,
  -- Merge role and custom permissions
  COALESCE(
    ARRAY_AGG(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), 
    ARRAY[]::text[]
  ) || 
  COALESCE(
    ARRAY(
      SELECT key 
      FROM jsonb_each(p_profile.custom_permissions) 
      WHERE value::boolean = true
    ), 
    ARRAY[]::text[]
  ) as all_permissions
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
LEFT JOIN public.profiles p_profile ON ur.user_id = p_profile.id AND ur.gym_id = p_profile.gym_id
WHERE ur.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
GROUP BY ur.user_id, ur.gym_id, r.name, r.display_name, r.level, ur.assigned_at, ur.expires_at, p_profile.custom_permissions;

-- Enable security invoker for the view
ALTER VIEW user_permissions_view SET (security_invoker=on);

-- Grant access to the view for authenticated users
GRANT SELECT ON user_permissions_view TO authenticated;

-- ========== GYM SUMMARY VIEW ==========

-- View for gym dashboard with key metrics
CREATE OR REPLACE VIEW gym_summary_view AS
SELECT 
  g.id,
  g.name,
  g.description,
  g.address,
  g.phone,
  g.email,
  g.website,
  g.logo_url,
  g.owner_id,
  g.is_active,
  g.created_at,
  -- Member counts
  COALESCE(member_stats.total_members, 0) as total_members,
  COALESCE(member_stats.active_members, 0) as active_members,
  COALESCE(member_stats.new_members_this_month, 0) as new_members_this_month,
  -- Activity counts
  COALESCE(activity_stats.checkins_today, 0) as checkins_today,
  COALESCE(activity_stats.checkins_this_month, 0) as checkins_this_month,
  -- Staff count
  COALESCE(staff_stats.total_staff, 0) as total_staff,
  -- Subscription info
  sub.subscription_plan_id,
  sp.name as subscription_plan_name,
  sp.display_name as subscription_plan_display_name,
  sub.status as subscription_status,
  sub.current_period_end as subscription_expires_at
FROM public.gyms g
LEFT JOIN (
  SELECT 
    gym_id,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE status = 'active') as active_members,
    COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as new_members_this_month
  FROM public.members 
  GROUP BY gym_id
) member_stats ON g.id = member_stats.gym_id
LEFT JOIN (
  SELECT 
    m.gym_id,
    COUNT(*) FILTER (WHERE DATE(ma.timestamp) = CURRENT_DATE AND ma.activity_type = 'check_in') as checkins_today,
    COUNT(*) FILTER (WHERE DATE_TRUNC('month', ma.timestamp) = DATE_TRUNC('month', CURRENT_DATE) AND ma.activity_type = 'check_in') as checkins_this_month
  FROM public.member_activities ma
  JOIN public.members m ON ma.member_id = m.id
  GROUP BY m.gym_id
) activity_stats ON g.id = activity_stats.gym_id
LEFT JOIN (
  SELECT 
    ur.gym_id,
    COUNT(*) as total_staff
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.is_active = true 
    AND r.name IN ('manager', 'staff', 'trainer')
  GROUP BY ur.gym_id
) staff_stats ON g.id = staff_stats.gym_id
LEFT JOIN public.profiles owner_profile ON g.owner_id = owner_profile.id
LEFT JOIN public.subscriptions sub ON owner_profile.id = sub.user_id AND sub.status = 'active'
LEFT JOIN public.subscription_plans sp ON sub.subscription_plan_id = sp.id;

-- Grant access to gym summary view
GRANT SELECT ON gym_summary_view TO authenticated;

-- ========== MEMBER ACTIVITIES SUMMARY VIEW ==========

-- View for member activity analytics
CREATE OR REPLACE VIEW member_activity_summary_view AS
SELECT 
  m.id as member_id,
  m.gym_id,
  m.full_name,
  m.email,
  m.membership_type,
  m.status,
  -- Activity counts
  COALESCE(activity_stats.total_checkins, 0) as total_checkins,
  COALESCE(activity_stats.checkins_this_month, 0) as checkins_this_month,
  COALESCE(activity_stats.checkins_this_week, 0) as checkins_this_week,
  activity_stats.last_checkin,
  activity_stats.first_checkin,
  -- Calculate days since last checkin
  CASE 
    WHEN activity_stats.last_checkin IS NOT NULL 
    THEN EXTRACT(days FROM now() - activity_stats.last_checkin)::integer
    ELSE NULL 
  END as days_since_last_checkin,
  -- Member status
  CASE 
    WHEN activity_stats.last_checkin IS NULL THEN 'never_visited'
    WHEN activity_stats.last_checkin > (now() - interval '7 days') THEN 'active'
    WHEN activity_stats.last_checkin > (now() - interval '30 days') THEN 'inactive'
    ELSE 'dormant'
  END as activity_status
FROM public.members m
LEFT JOIN (
  SELECT 
    member_id,
    COUNT(*) FILTER (WHERE activity_type = 'check_in') as total_checkins,
    COUNT(*) FILTER (WHERE activity_type = 'check_in' AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)) as checkins_this_month,
    COUNT(*) FILTER (WHERE activity_type = 'check_in' AND DATE_TRUNC('week', timestamp) = DATE_TRUNC('week', CURRENT_DATE)) as checkins_this_week,
    MAX(timestamp) FILTER (WHERE activity_type = 'check_in') as last_checkin,
    MIN(timestamp) FILTER (WHERE activity_type = 'check_in') as first_checkin
  FROM public.member_activities
  GROUP BY member_id
) activity_stats ON m.id = activity_stats.member_id;

-- Grant access to member activity summary view
GRANT SELECT ON member_activity_summary_view TO authenticated;

-- ========== SUBSCRIPTION ANALYTICS VIEW ==========

-- View for subscription and revenue analytics
CREATE OR REPLACE VIEW subscription_analytics_view AS
SELECT 
  sp.id as plan_id,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  sp.price_monthly,
  sp.price_yearly,
  -- Subscription counts
  COALESCE(sub_stats.active_subscriptions, 0) as active_subscriptions,
  COALESCE(sub_stats.trial_subscriptions, 0) as trial_subscriptions,
  COALESCE(sub_stats.cancelled_subscriptions, 0) as cancelled_subscriptions,
  -- Revenue calculations (monthly)
  COALESCE(sub_stats.monthly_revenue, 0) as monthly_revenue,
  COALESCE(sub_stats.yearly_revenue, 0) as yearly_revenue,
  COALESCE(sub_stats.total_revenue, 0) as total_revenue,
  -- Growth metrics
  COALESCE(sub_stats.new_subscriptions_this_month, 0) as new_subscriptions_this_month,
  COALESCE(sub_stats.cancelled_this_month, 0) as cancelled_this_month
FROM public.subscription_plans sp
LEFT JOIN (
  SELECT 
    subscription_plan_id,
    COUNT(*) FILTER (WHERE status = 'active' AND (trial_status IS NULL OR trial_status = 'converted')) as active_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active' AND trial_status = 'active') as trial_subscriptions,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_subscriptions,
    -- Revenue calculations
    SUM(amount) FILTER (WHERE status = 'active' AND billing_cycle = 'monthly') / 100.0 as monthly_revenue,
    SUM(amount) FILTER (WHERE status = 'active' AND billing_cycle = 'yearly') / 100.0 as yearly_revenue,
    SUM(amount) FILTER (WHERE status = 'active') / 100.0 as total_revenue,
    -- Growth metrics
    COUNT(*) FILTER (WHERE status = 'active' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)) as new_subscriptions_this_month,
    COUNT(*) FILTER (WHERE status = 'cancelled' AND DATE_TRUNC('month', cancelled_at) = DATE_TRUNC('month', CURRENT_DATE)) as cancelled_this_month
  FROM public.subscriptions
  GROUP BY subscription_plan_id
) sub_stats ON sp.id = sub_stats.subscription_plan_id
WHERE sp.is_active = true;

-- Grant access to subscription analytics view
GRANT SELECT ON subscription_analytics_view TO authenticated;

-- ========== RECENT ACTIVITIES VIEW ==========

-- View for recent activities across the system
CREATE OR REPLACE VIEW recent_activities_view AS
SELECT 
  'member_activity' as activity_source,
  ma.id::text as activity_id,
  m.gym_id,
  ma.timestamp as activity_timestamp,
  ma.activity_type,
  json_build_object(
    'member_id', m.id,
    'member_name', m.full_name,
    'activity_type', ma.activity_type,
    'notes', ma.notes,
    'duration_minutes', ma.duration_minutes
  ) as activity_data
FROM public.member_activities ma
JOIN public.members m ON ma.member_id = m.id
WHERE ma.timestamp > (now() - interval '7 days')

UNION ALL

SELECT 
  'member_registration' as activity_source,
  m.id::text as activity_id,
  m.gym_id,
  m.created_at as activity_timestamp,
  'member_joined' as activity_type,
  json_build_object(
    'member_id', m.id,
    'member_name', m.full_name,
    'membership_type', m.membership_type,
    'email', m.email
  ) as activity_data
FROM public.members m
WHERE m.created_at > (now() - interval '7 days')

UNION ALL

SELECT 
  'subscription_event' as activity_source,
  se.id::text as activity_id,
  p.gym_id,
  se.created_at as activity_timestamp,
  se.event_type as activity_type,
  json_build_object(
    'subscription_id', s.id,
    'user_id', s.user_id,
    'event_type', se.event_type,
    'event_data', se.event_data
  ) as activity_data
FROM public.subscription_events se
JOIN public.subscriptions s ON se.subscription_id = s.id
JOIN public.profiles p ON s.user_id = p.id
WHERE se.created_at > (now() - interval '7 days')

ORDER BY activity_timestamp DESC;

-- Grant access to recent activities view
GRANT SELECT ON recent_activities_view TO authenticated;

-- ========== COMMENTS AND DOCUMENTATION ==========

COMMENT ON VIEW user_permissions_view IS 'Secure view showing user permissions with security_invoker=on for proper access control. Users can only see their own permissions or permissions within gyms they manage.';

COMMENT ON VIEW gym_summary_view IS 'Comprehensive view providing gym dashboard metrics including member counts, activities, staff, and subscription information.';

COMMENT ON VIEW member_activity_summary_view IS 'Analytics view for member engagement showing checkin patterns and activity status.';

COMMENT ON VIEW subscription_analytics_view IS 'Revenue and subscription analytics view for business intelligence and reporting.';

COMMENT ON VIEW recent_activities_view IS 'Unified view of recent activities across the platform for activity feeds and monitoring.';

-- ========== VIEW USAGE EXAMPLES ==========

/*
-- Example queries for the views:

-- Get user permissions for current gym
SELECT * FROM user_permissions_view 
WHERE user_id = auth.uid() AND gym_id = 'your-gym-id';

-- Get gym dashboard data
SELECT * FROM gym_summary_view 
WHERE id = 'your-gym-id';

-- Get member engagement analytics
SELECT * FROM member_activity_summary_view 
WHERE gym_id = 'your-gym-id' 
ORDER BY days_since_last_checkin DESC;

-- Get subscription revenue metrics
SELECT * FROM subscription_analytics_view 
ORDER BY active_subscriptions DESC;

-- Get recent activity feed
SELECT * FROM recent_activities_view 
WHERE gym_id = 'your-gym-id' 
ORDER BY activity_timestamp DESC 
LIMIT 50;
*/