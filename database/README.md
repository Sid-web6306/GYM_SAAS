# Database Migrations - Gym SaaS

This directory contains the consolidated database migrations for the Gym SaaS application with built-in RBAC (Role-Based Access Control) support.

## Migration Files Overview

The migrations have been consolidated from 23+ fragmented files into 10 clean, sequential files:

### 01_create_base_schema.sql
- **Core tables**: `gyms`, `profiles` (with RBAC fields), `documents`, `feedback`
- **RBAC integration**: Profiles table includes RBAC fields from the start
- **Row Level Security**: Enabled on all tables
- **Base indexes**: Essential performance indexes

### 02_create_rbac_system.sql
- **RBAC tables**: `roles`, `permissions`, `role_permissions`, `user_roles`
- **Helper functions**: Permission checking functions
- **Multi-tenant support**: Gym-scoped role assignments
- **Role hierarchy**: Level-based permission system

### 03_create_member_system.sql
- **Member management**: `members`, `member_activities`, `gym_metrics`
- **Activity tracking**: Check-ins, workouts, training sessions
- **Analytics support**: Metrics and reporting tables
- **Performance indexes**: Optimized for common queries

### 04_create_subscription_system.sql
- **Subscription management**: `subscription_plans`, `subscriptions`
- **Payment processing**: `payment_methods`, `subscription_events`
- **Razorpay integration**: Support for Indian payment gateway
- **Billing lifecycle**: Trial, active, cancelled states

### 05_create_functions.sql
- **Business logic functions**: User profile completion, activity recording
- **RBAC-aware functions**: Integrated permission checking
- **Subscription functions**: Payment and billing operations
- **Metrics functions**: Automated analytics updates

### 06_create_triggers.sql
- **Automatic updates**: `updated_at` timestamps
- **RBAC synchronization**: Role assignment triggers
- **Business logic**: Auto-update metrics on activity
- **Auth integration**: Profile creation on user signup

### 07_create_policies.sql
- **Row Level Security**: RBAC-based access control
- **Permission-based policies**: Granular access control  
- **Multi-tenant isolation**: Gym-scoped data access
- **Secure by default**: Comprehensive policy coverage

### 08_create_indexes.sql
- **Performance optimization**: Composite and covering indexes
- **Search indexes**: Full-text search capabilities
- **Analytics indexes**: Optimized for reporting queries
- **Constraint indexes**: Data integrity enforcement

### 09_insert_seed_data.sql
- **RBAC seed data**: Predefined roles and permissions
- **Subscription plans**: Starter, Professional, Enterprise tiers
- **System configuration**: Essential reference data
- **Development data**: Optional sample data for testing

### 10_create_views.sql
- **Secure views**: RBAC-aware data access
- **Analytics views**: Pre-computed metrics and summaries
- **Dashboard views**: Optimized for UI components
- **Security invoker**: Proper access control

## RBAC System Overview

### Roles (with hierarchy levels)
- **Owner (Level 100)**: Full gym access, cannot be removed
- **Manager (Level 75)**: Operations, staff management, analytics
- **Personal Trainer (Level 60)**: Member training, activity logging
- **Staff Member (Level 50)**: Basic member management
- **Member (Level 25)**: Personal profile and activities only

### Permission Categories
- **Member Management**: Create, read, update, delete members
- **Analytics**: View reports, export data
- **Gym Settings**: View/update gym information
- **Staff Management**: Manage roles and permissions
- **Financial**: Billing and subscription management
- **Activities**: Log and manage member activities
- **Personal**: Profile management

### Key Features
- **Multi-tenant**: Roles scoped to specific gyms
- **Hierarchical**: Higher-level roles can manage lower levels
- **Custom permissions**: Individual user permission overrides
- **Secure by default**: RLS policies enforce access control

## Running Migrations

### Fresh Installation
```bash
# Run migrations in order
psql -d your_database -f 01_create_base_schema.sql
psql -d your_database -f 02_create_rbac_system.sql
psql -d your_database -f 03_create_member_system.sql
psql -d your_database -f 04_create_subscription_system.sql
psql -d your_database -f 05_create_functions.sql
psql -d your_database -f 06_create_triggers.sql
psql -d your_database -f 07_create_policies.sql
psql -d your_database -f 08_create_indexes.sql
psql -d your_database -f 09_insert_seed_data.sql
psql -d your_database -f 10_create_views.sql
```

### Automated Script
```bash
#!/bin/bash
for i in {01..10}; do
  echo "Running migration ${i}..."
  psql -d your_database -f ${i}_*.sql
done
echo "All migrations completed!"
```

## Legacy Files

The original 23+ migration files have been moved to `legacy/` folder as backup. These files contain the historical evolution of the schema but should not be used for new installations.

## Environment Variables Required

```env
# Supabase/PostgreSQL
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Razorpay (for payments)
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
```

## Post-Migration Setup

After running migrations:

1. **Verify seed data**: Check roles and permissions are created
2. **Test RBAC functions**: Ensure permission checking works
3. **Create first gym owner**: Register and complete onboarding
4. **Configure subscription plans**: Update pricing if needed
5. **Test RLS policies**: Verify data isolation works

## Key Improvements

### From Legacy System
- ✅ **Consolidated**: 10 files instead of 23+
- ✅ **RBAC native**: Built-in from start, not bolted on
- ✅ **No race conditions**: Proper trigger handling
- ✅ **Better performance**: Optimized indexes
- ✅ **Clean dependencies**: Clear execution order

### RBAC Integration
- ✅ **Permission-based policies**: Granular access control
- ✅ **Multi-tenant safe**: Gym-scoped isolation
- ✅ **Role hierarchy**: Level-based permissions
- ✅ **Custom permissions**: User-specific overrides
- ✅ **Secure functions**: Permission checking built-in

### Performance Optimizations
- ✅ **Composite indexes**: Multi-column queries
- ✅ **Covering indexes**: Reduce table lookups
- ✅ **Partial indexes**: Filter common conditions
- ✅ **JSONB indexes**: Fast metadata queries
- ✅ **Text search**: Full-text search capabilities

## Troubleshooting

### Common Issues

**Permission Denied Errors**:
- Check RLS policies are correctly applied
- Verify user has required role in gym
- Test with `has_permission()` function

**Slow Queries**:
- Check if appropriate indexes exist
- Use `EXPLAIN ANALYZE` to identify bottlenecks
- Consider adding covering indexes

**Migration Failures**:
- Ensure migrations run in order (01-10)
- Check PostgreSQL version compatibility
- Verify database permissions

### Testing RBAC

```sql
-- Test permission checking
SELECT has_permission(
  'user-uuid'::uuid, 
  'gym-uuid'::uuid, 
  'members.read'
);

-- Check user role
SELECT get_user_role(
  'user-uuid'::uuid,
  'gym-uuid'::uuid
);

-- View user permissions
SELECT * FROM user_permissions_view 
WHERE user_id = 'user-uuid' 
AND gym_id = 'gym-uuid';
```

## Contributing

When modifying the database schema:

1. **Never edit existing migrations** - create new migration files
2. **Test RBAC impact** - ensure policies still work
3. **Update views** - modify affected views
4. **Add indexes** - consider performance impact
5. **Document changes** - update this README

## Support

For issues with migrations or RBAC system:
- Check the troubleshooting section above
- Review RLS policies in `07_create_policies.sql`
- Test with development data from `09_insert_seed_data.sql`
- Verify functions work with direct SQL testing