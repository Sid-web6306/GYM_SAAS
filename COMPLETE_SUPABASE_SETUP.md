# 🚀 Complete Supabase Setup Guide for Gym SaaS MVP

This comprehensive guide consolidates all Supabase setup requirements for your Gym SaaS MVP with TanStack Query architecture, social authentication, and real-time features.

## 📋 Prerequisites

- [Supabase Account](https://supabase.com)
- [Google Cloud Console Account](https://console.cloud.google.com) (for Google OAuth)
- [Facebook Developer Account](https://developers.facebook.com) (for Facebook OAuth)
- Node.js 18+ and npm/yarn installed

---

## 🗄️ 1. Database Schema Setup

### Core Tables

Run these SQL commands in your Supabase SQL Editor:

```sql
-- 1. Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create gyms table
CREATE TABLE gyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create members table
CREATE TABLE members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  phone_number TEXT,
  membership_type TEXT DEFAULT 'basic',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  join_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add foreign key constraint for profiles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_gym_id_fkey 
FOREIGN KEY (gym_id) REFERENCES gyms(id);
```

### Performance Indexes

```sql
-- Create indexes for better query performance
CREATE INDEX idx_profiles_gym_id ON profiles(gym_id);
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_created_at ON members(created_at);
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
  FOR SELECT USING (auth.uid() = owner_id OR id IN (
    SELECT gym_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Gym owners can update their gym" ON gyms
  FOR UPDATE USING (auth.uid() = owner_id OR id IN (
    SELECT gym_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create gyms" ON gyms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Users can view members from their gym" ON members
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their gym" ON members
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update members from their gym" ON members
  FOR UPDATE USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete members from their gym" ON members
  FOR DELETE USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Database Functions and Triggers

```sql
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

## 🔐 2. Authentication Configuration

### Basic Auth Settings

In your Supabase Dashboard → Authentication → Settings:

1. **Site URL**: 
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

2. **Additional Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/
   https://yourdomain.com/auth/callback
   https://yourdomain.com/
   ```

3. **JWT Settings**:
   - JWT expiry: 3600 seconds (1 hour)
   - Refresh token expiry: 604800 seconds (7 days)

### Email Configuration

#### Email Templates

In Authentication → Email Templates, update the **Confirm signup** template:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup">Confirm your email address</a></p>
```

#### SMTP Configuration (Production)

For production, configure SMTP in Authentication → Settings → SMTP Settings:
- Use your preferred email service (SendGrid, Mailgun, etc.)
- Configure proper sender email and credentials

---

## 🌐 3. Social Authentication Setup

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

### Facebook OAuth Configuration

#### Step 1: Facebook Developer Setup

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com)
   - Click "Create App" → "Consumer" → "Next"
   - App name: "Your Gym SaaS App"

2. **Configure Facebook Login**:
   - Add "Facebook Login" product
   - Go to "Facebook Login" → "Settings"
   - Add Valid OAuth Redirect URIs:
     ```
     http://localhost:3000/auth/callback
     https://your-domain.com/auth/callback
     ```

#### Step 2: Supabase Facebook Configuration

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Facebook provider
3. Enter your Facebook credentials:
   - **App ID**: From Facebook Developer Console
   - **App Secret**: From Facebook Developer Console

---

## 🔄 4. Real-time Setup

### Enable Real-time Replication

In your Supabase Dashboard → Database → Replication:

1. **Enable replication** for these tables:
   - `profiles`
   - `gyms` 
   - `members`

### Configure Real-time Publications

```sql
-- Enable realtime for authenticated users on their data
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE gyms;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
```

### Real-time Security Policies

```sql
-- Selective real-time policies for members
CREATE POLICY "Gym owners can subscribe to their members" ON members
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## 🔧 5. Environment Variables

Create a `.env.local` file in your project root:

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

## 🧪 6. Testing Your Setup

### Authentication Flow Testing

1. **Email/Password Auth**:
   - [ ] Sign up with email → receives confirmation email
   - [ ] Click confirmation link → redirects properly
   - [ ] Login/logout works
   - [ ] Password reset works

2. **Social Auth Testing**:
   - [ ] Google OAuth signup/login works
   - [ ] Facebook OAuth signup/login works
   - [ ] Profile created with correct social data
   - [ ] Cross-tab session sync works

3. **Onboarding Flow**:
   - [ ] New users directed to onboarding
   - [ ] Gym creation works
   - [ ] Profile updated with gym association

### Real-time Features Testing

1. **Open two browser tabs** with the same user
2. **Add a member** in one tab
3. **Verify** the member appears in the other tab instantly
4. **Update member status** and confirm real-time sync
5. **Delete a member** and verify removal across tabs

### Database Testing

```sql
-- Test data insertion
INSERT INTO gyms (name, owner_id) VALUES ('Test Gym', auth.uid());

-- Verify RLS policies work
SELECT * FROM members; -- Should only show members from your gym

-- Test real-time subscriptions
UPDATE members SET status = 'inactive' WHERE id = 'some-member-id';
```

---

## 🚀 7. Production Deployment

### Security Checklist

- [ ] **RLS enabled** on all tables with proper policies
- [ ] **Environment variables** set in production
- [ ] **OAuth apps** configured for production domains
- [ ] **CORS settings** configured properly
- [ ] **Rate limiting** enabled for auth endpoints
- [ ] **SMTP configured** for production emails

### Performance Optimization

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

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_gym_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gym_analytics;
END;
$$ LANGUAGE plpgsql;
```

### Monitoring Setup

Monitor these metrics:
- Authentication success rates
- Database query performance
- Real-time connection count
- API usage and rate limits

---

## 🐛 8. Troubleshooting

### Common Issues

#### "OAuth redirect URI mismatch"
**Solution**: Ensure redirect URIs match exactly in OAuth provider and Supabase

#### "Permission denied for table"
**Solution**: 
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'gyms', 'members');
```

#### "Real-time not working"
**Solution**:
- Verify replication is enabled for tables
- Check WebSocket connections in browser dev tools
- Ensure RLS policies allow SELECT access

#### "Email confirmation redirects to /"
**Solution**: This is handled by the current implementation - the home page processes auth codes automatically

### Debug Tools

1. **TanStack Query DevTools**: Available in development mode
2. **Supabase Logs**: Check Dashboard → Logs & Analytics
3. **Browser Network Tab**: Monitor WebSocket connections

---

## ✅ 9. Final Verification Checklist

### Database Setup:
- [ ] All tables created with correct schema
- [ ] RLS policies enabled and tested
- [ ] Triggers working for profile creation
- [ ] Indexes created for performance
- [ ] Real-time replication enabled

### Authentication:
- [ ] Email/password signup and login working
- [ ] Google OAuth configured and tested
- [ ] Facebook OAuth configured and tested
- [ ] Email confirmation flow working
- [ ] Session management across tabs working

### Real-time Features:
- [ ] Multi-tab sync working
- [ ] Member changes sync in real-time
- [ ] Gym updates propagate instantly
- [ ] WebSocket connections established

### Production Ready:
- [ ] Environment variables configured
- [ ] OAuth apps approved for production
- [ ] Security policies verified
- [ ] Performance optimizations applied
- [ ] Monitoring configured

---

## 🎯 Next Steps

1. **Test thoroughly** in development
2. **Deploy to staging** environment first
3. **Monitor performance** and user feedback
4. **Scale database** resources as needed
5. **Add advanced features** like analytics, notifications

Your Gym SaaS MVP now has a complete, production-ready Supabase setup! 🚀💪

---

*Need help? Check the troubleshooting section above or contact the development team.* 