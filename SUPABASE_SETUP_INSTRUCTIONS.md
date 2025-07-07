# Supabase Setup Instructions for Gym SaaS MVP

This document provides comprehensive setup instructions for Supabase to work with the new TanStack Query + Zustand architecture.

## 📋 Overview

The new architecture uses:
- **TanStack Query** for all server state management
- **Supabase Realtime** for live updates across components
- **Zustand** only for client-side UI state
- **Optimistic updates** for better UX

## 🗄️ Database Schema

### Required Tables

Make sure your Supabase database has these tables with the correct structure:

#### 1. Profiles Table
```sql
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  gym_id uuid REFERENCES gyms(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

#### 2. Gyms Table
```sql
CREATE TABLE gyms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their gym" ON gyms
  FOR SELECT USING (
    id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their gym" ON gyms
  FOR UPDATE USING (
    id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gyms" ON gyms
  FOR INSERT WITH CHECK (true);
```

#### 3. Members Table
```sql
CREATE TABLE members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid REFERENCES gyms(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone_number text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  join_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view members from their gym" ON members
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their gym" ON members
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update members from their gym" ON members
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete members from their gym" ON members
  FOR DELETE USING (
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );
```

### Database Functions and Triggers

#### Updated At Trigger Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔐 Authentication Setup

### 1. Configure Auth Settings

In your Supabase dashboard:

1. **Go to Authentication → Settings**
2. **Site URL**: Set to your production domain
3. **Additional URLs**: Add localhost URLs for development:
   ```
   http://localhost:3000
   http://localhost:3000/**
   ```

### 2. Email Templates (Optional)

Customize email templates in **Authentication → Email Templates** for:
- Confirm signup
- Reset password
- Magic link

### 3. OAuth Providers (Optional)

Enable social login providers in **Authentication → Providers**:
- Google OAuth
- GitHub OAuth
- etc.

## 🔄 Real-time Setup

### 1. Enable Realtime

In your Supabase dashboard:

1. **Go to Database → Replication**
2. **Enable replication** for the following tables:
   - `profiles`
   - `gyms`
   - `members`

### 2. Configure Realtime Policies

```sql
-- Enable realtime for authenticated users on their data
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE gyms;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
```

### 3. Test Realtime Subscriptions

The application automatically sets up realtime subscriptions for:

- **Gym updates**: Listens for changes to gym data
- **Member changes**: Listens for member additions, updates, deletions
- **Profile updates**: Listens for profile changes

These are configured in the TanStack Query hooks:
- `src/hooks/use-gym-data.ts` - Gym realtime subscriptions
- `src/hooks/use-members-data.ts` - Members realtime subscriptions

## 🔧 Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: For server-side operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 Testing the Setup

### 1. Test Authentication

1. **Sign up** a new user
2. **Verify** profile creation
3. **Complete onboarding** (gym setup)
4. **Test logout/login**

### 2. Test Real-time Features

1. **Open two browser tabs** with the same user
2. **Add a member** in one tab
3. **Verify** the member appears in the other tab instantly
4. **Update member status** and confirm real-time sync
5. **Delete a member** and verify removal

### 3. Test Multi-tab Sync

1. **Login** in one tab
2. **Open** another tab to the same site
3. **Logout** from the first tab
4. **Verify** the second tab redirects to login

## 🚀 Production Deployment

### 1. Database Performance

```sql
-- Add indexes for better performance
CREATE INDEX idx_members_gym_id ON members(gym_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_created_at ON members(created_at);
CREATE INDEX idx_profiles_gym_id ON profiles(gym_id);
```

### 2. Security Checklist

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Policies properly restrict data access
- [ ] Service role key kept secure
- [ ] CORS settings configured for production domain
- [ ] Email rate limiting configured

### 3. Monitoring

Set up monitoring for:
- **Database performance**
- **Realtime connection count**
- **Auth API usage**
- **Storage usage**

## 🐛 Troubleshooting

### Common Issues

#### 1. Realtime Not Working

**Symptoms**: Changes don't appear in real-time across tabs

**Solutions**:
```typescript
// Check if realtime is enabled in your component
const { data: members, error } = useMembers(gymId)

// Verify subscription in browser dev tools
// Look for WebSocket connections to your Supabase project
```

#### 2. RLS Blocking Queries

**Symptoms**: Getting permission denied errors

**Solutions**:
- Check RLS policies match your auth pattern
- Verify `auth.uid()` returns expected user ID
- Test policies in Supabase SQL editor

#### 3. Hydration Errors

**Symptoms**: React hydration mismatches

**Solutions**:
- The new architecture should prevent these
- If they occur, check for client-only state in Zustand stores
- Ensure TanStack Query is handling all server state

### Debug Tools

#### 1. React Query DevTools

Already included in development. Access via the floating icon in the bottom-left corner.

#### 2. Supabase Logs

Check real-time logs in your Supabase dashboard:
- **Logs & Analytics → Logs**
- Filter by table or operation type

#### 3. Network Tab

Monitor WebSocket connections and API calls in browser dev tools.

## 📈 Performance Optimization

### 1. Query Optimization

The new architecture includes:
- **Automatic caching** with configurable stale times
- **Background refetching** on window focus
- **Optimistic updates** for immediate UI feedback
- **Intelligent invalidation** of related queries

### 2. Real-time Optimization

- Subscriptions are automatically cleaned up
- Filters are applied to reduce unnecessary updates
- Batched updates prevent UI thrashing

### 3. Bundle Size

The migration removes:
- Unnecessary Zustand server state stores
- Legacy adapter code
- Unused dependencies

## 🔮 Future Enhancements

Consider implementing:

1. **Offline Support**: Using TanStack Query's offline capabilities
2. **Infinite Queries**: For large member lists with pagination
3. **Mutation Queuing**: For robust offline-first experience
4. **Advanced Caching**: Custom cache strategies based on data sensitivity
5. **Analytics Integration**: Track user engagement and feature usage

## 📚 Additional Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## ✅ Setup Verification Checklist

- [ ] Database tables created with correct schema
- [ ] Row Level Security enabled and policies configured
- [ ] Realtime enabled for all tables
- [ ] Environment variables configured
- [ ] Authentication working (signup/login/logout)
- [ ] Profile creation and gym onboarding working
- [ ] Members CRUD operations working
- [ ] Real-time updates working across tabs
- [ ] Multi-tab auth synchronization working
- [ ] No console errors in browser dev tools
- [ ] TanStack Query DevTools showing cached data
- [ ] WebSocket connections visible in Network tab

**Your Gym SaaS MVP is now ready with a robust, real-time architecture! 🎉** 