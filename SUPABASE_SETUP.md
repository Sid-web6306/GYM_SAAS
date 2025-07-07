# 🚀 Enhanced Supabase Setup Guide for Gym SaaS MVP

This guide provides comprehensive setup instructions for Supabase with enhanced social authentication support (Google & Facebook OAuth).

## 📋 Prerequisites

- [Supabase Account](https://supabase.com)
- [Google Cloud Console Account](https://console.cloud.google.com) (for Google OAuth)
- [Facebook Developer Account](https://developers.facebook.com) (for Facebook OAuth)
- Node.js 18+ and npm/yarn installed

---

## 🏗️ 1. Database Schema Setup

### Core Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Create profiles table with enhanced social auth support
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  gym_id UUID REFERENCES gyms(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create gyms table
CREATE TABLE gyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create members table
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  membership_type TEXT DEFAULT 'basic',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add foreign key constraint after gyms table is created
ALTER TABLE profiles 
ADD CONSTRAINT profiles_gym_id_fkey 
FOREIGN KEY (gym_id) REFERENCES gyms(id);
```

### Indexes for Performance

```sql
-- Create indexes for better query performance
CREATE INDEX idx_profiles_gym_id ON profiles(gym_id);
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_gyms_owner_id ON gyms(owner_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Gyms policies  
CREATE POLICY "Gym owners can view their gym" ON gyms
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Gym owners can update their gym" ON gyms
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create gyms" ON gyms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Gym owners can manage members" ON members
  FOR ALL USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );
```

### Database Triggers for Auto-Profile Creation

```sql
-- Function to handle new user profile creation with social auth support
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Extract name from social metadata or email
  user_email := NEW.email;
  
  -- Try to get full name from social metadata
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data ? 'name' THEN
    user_full_name := NEW.raw_user_meta_data->>'name';
  ELSE
    -- Fallback to email username
    user_full_name := SPLIT_PART(user_email, '@', 1);
  END IF;

  -- Insert profile with social data
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(user_full_name, 'User'),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 🔐 2. Enhanced Social Authentication Setup

### Google OAuth Configuration

#### Step 1: Google Cloud Console Setup

1. **Create/Select Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable the Google+ API

2. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields:
     - App name: "Your Gym SaaS App"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if in testing mode

3. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Gym SaaS Web Client"
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/callback
     https://your-domain.com/auth/callback
     ```

#### Step 2: Supabase Google Configuration

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Configure additional settings:
   - **Scopes**: `email profile openid`
   - **Skip nonce check**: Disabled (recommended)

### Facebook OAuth Configuration

#### Step 1: Facebook Developer Setup

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Click "Create App" → "Consumer" → "Next"
   - App name: "Your Gym SaaS App"
   - Contact email: your email

2. **Configure Facebook Login**:
   - In app dashboard, add "Facebook Login" product
   - Go to "Facebook Login" → "Settings"
   - Add Valid OAuth Redirect URIs:
     ```
     http://localhost:3000/auth/callback
     https://your-domain.com/auth/callback
     ```

3. **App Review & Permissions**:
   - Request `email` and `public_profile` permissions
   - For production, submit app for review

#### Step 2: Supabase Facebook Configuration

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Facebook provider
3. Enter your Facebook credentials:
   - **App ID**: From Facebook Developer Console
   - **App Secret**: From Facebook Developer Console
4. Configure additional settings:
   - **Scopes**: `email public_profile`

---

## 🔧 3. Environment Variables Setup

Update your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Social OAuth (Optional - handled by Supabase)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_FACEBOOK_APP_ID=your_facebook_app_id

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key
```

---

## 🧪 4. Testing Social Authentication

### Manual Testing Checklist

#### Google OAuth Testing:
- [ ] Click "Continue with Google" on signup page
- [ ] Redirected to Google OAuth consent screen
- [ ] After approval, redirected back to app
- [ ] Profile created with Google name and email
- [ ] Can complete gym setup process
- [ ] Login/logout works correctly
- [ ] Cross-tab session sync works

#### Facebook OAuth Testing:
- [ ] Click "Continue with Facebook" on signup page
- [ ] Redirected to Facebook OAuth dialog
- [ ] After approval, redirected back to app
- [ ] Profile created with Facebook name and email
- [ ] Can complete gym setup process
- [ ] Login/logout works correctly

#### Error Scenarios Testing:
- [ ] OAuth cancelled by user → proper error message
- [ ] Invalid OAuth configuration → error handling
- [ ] Network timeout → graceful fallback
- [ ] Existing email conflict → proper messaging

### Test Users

Create test users for each provider:

```sql
-- Insert test data for development
INSERT INTO gyms (id, name, owner_id, created_at) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'Test Gym', 'user_id_from_auth', NOW());

INSERT INTO members (gym_id, full_name, email, membership_type, status) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'John Doe', 'john@example.com', 'premium', 'active'),
('123e4567-e89b-12d3-a456-426614174000', 'Jane Smith', 'jane@example.com', 'basic', 'active');
```

---

## 🚀 5. Production Deployment

### Supabase Production Checklist

#### Database Configuration:
- [ ] All RLS policies enabled and tested
- [ ] Proper indexes created for performance
- [ ] Database triggers working correctly
- [ ] Connection pooling configured

#### Authentication Settings:
- [ ] Production OAuth apps configured
- [ ] Redirect URIs updated for production domain
- [ ] Rate limiting enabled
- [ ] Email templates customized
- [ ] SMTP configured for emails

#### Security Configuration:
- [ ] JWT expiry times configured appropriately
- [ ] Refresh token rotation enabled
- [ ] CORS origins properly configured
- [ ] API keys restricted appropriately

### OAuth Production Setup

#### Google OAuth:
1. **Domain Verification**:
   - Verify your production domain in Google Console
   - Update authorized origins and redirect URIs
   - Submit for OAuth verification if needed

2. **Production Settings**:
   - Remove localhost from authorized origins
   - Add production domain
   - Configure proper privacy policy and terms of service URLs

#### Facebook OAuth:
1. **App Review**:
   - Submit app for Facebook review
   - Provide required documentation
   - Test with Facebook's review team

2. **Production Mode**:
   - Switch app from development to live mode
   - Update privacy policy and terms of service
   - Configure proper app domains

---

## 🛠️ 6. Advanced Configuration

### Enhanced Security Features

```sql
-- Additional security functions
CREATE OR REPLACE FUNCTION check_user_gym_access(target_gym_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gyms 
    WHERE id = target_gym_id 
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting for social signups
CREATE TABLE auth_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, action_type)
);
```

### Performance Optimizations

```sql
-- Materialized view for dashboard analytics
CREATE MATERIALIZED VIEW gym_analytics AS
SELECT 
  g.id as gym_id,
  g.name as gym_name,
  COUNT(m.id) as total_members,
  COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_members,
  COUNT(CASE WHEN m.join_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30d
FROM gyms g
LEFT JOIN members m ON g.id = m.gym_id
GROUP BY g.id, g.name;

-- Refresh function for analytics
CREATE OR REPLACE FUNCTION refresh_gym_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gym_analytics;
END;
$$ LANGUAGE plpgsql;

-- Schedule analytics refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-analytics', '0 0 * * *', 'SELECT refresh_gym_analytics();');
```

### Real-time Subscriptions

```sql
-- Enable real-time for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE gyms;

-- Selective real-time policies
CREATE POLICY "Gym owners can subscribe to their members" ON members
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
    )
  );
```

---

## 🐛 7. Troubleshooting Guide

### Common Issues & Solutions

#### Social OAuth Issues:

**"OAuth redirect URI mismatch"**:
```
Solution: Ensure redirect URIs in OAuth provider match exactly:
- Google: https://your-domain.com/auth/callback
- Facebook: https://your-domain.com/auth/callback
- Supabase: Auto-configured, but verify in Auth settings
```

**"Invalid OAuth configuration"**:
```
Solution:
1. Verify client IDs and secrets in Supabase
2. Check OAuth app is enabled and approved
3. Ensure proper scopes are requested
4. Test with Supabase's test mode first
```

**"Profile creation failed"**:
```
Solution:
1. Check database triggers are working
2. Verify RLS policies allow profile insertion
3. Check handle_new_user() function logs
4. Ensure profiles table exists with correct schema
```

#### Database Issues:

**"Permission denied for table"**:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'gyms', 'members');

-- Test policies
SELECT auth.uid(); -- Should return your user ID
```

**"Function handle_new_user() not found"**:
```sql
-- Recreate the trigger function
-- (Copy the function from step 1 above)
```

#### Performance Issues:

**Slow queries**:
```sql
-- Check index usage
EXPLAIN ANALYZE SELECT * FROM members WHERE gym_id = 'your-gym-id';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_missing_column ON table_name(column_name);
```

### Debug Mode

Enable debug logging in your application:

```typescript
// In your development environment
if (process.env.NODE_ENV === 'development') {
  console.log('Auth callback data:', {
    user: user,
    provider: user.app_metadata?.provider,
    metadata: user.user_metadata
  });
}
```

### Support Resources

- [Supabase Discord](https://discord.supabase.io)
- [Supabase Documentation](https://supabase.com/docs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)

---

## ✅ 8. Success Checklist

### Pre-Launch Verification:

- [ ] **Database Setup Complete**
  - [ ] All tables created with proper schema
  - [ ] RLS policies active and tested
  - [ ] Triggers working for profile creation
  - [ ] Indexes created for performance

- [ ] **Authentication Working**
  - [ ] Email/password signup and login
  - [ ] Google OAuth signup and login
  - [ ] Facebook OAuth signup and login
  - [ ] Social onboarding flow complete
  - [ ] Session management across tabs

- [ ] **Security Verified**
  - [ ] RLS protecting user data
  - [ ] OAuth apps configured securely
  - [ ] Production domains whitelisted
  - [ ] Rate limiting in place

- [ ] **Performance Optimized**
  - [ ] Database queries optimized
  - [ ] Proper indexing strategy
  - [ ] Real-time subscriptions configured
  - [ ] Analytics views created

- [ ] **Production Ready**
  - [ ] Environment variables set
  - [ ] OAuth apps approved for production
  - [ ] Error handling implemented
  - [ ] Monitoring and logging configured

### Post-Launch Monitoring:

- Monitor authentication success rates
- Track social login adoption
- Watch for OAuth errors
- Monitor database performance
- Check user onboarding completion rates

---

## 🎯 Next Steps

1. **Monitor Usage**: Set up analytics to track social auth adoption
2. **A/B Testing**: Test different social login button designs
3. **Additional Providers**: Consider adding Twitter, LinkedIn, Apple OAuth
4. **Advanced Features**: Implement social profile sync, avatar uploads
5. **Compliance**: Ensure GDPR/CCPA compliance for social data handling

Your Gym SaaS MVP now has enterprise-grade social authentication! 🚀💪

---

*Need help? Check our troubleshooting guide above or reach out to the development team.* 