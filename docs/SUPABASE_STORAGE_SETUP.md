# Supabase Storage Setup for Avatar Uploads

## 1. Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. Click **"Create bucket"**
4. Set bucket name: `user-uploads`
5. Set as **Public bucket** (recommended for avatars)
6. Click **"Create bucket"**

## 2. Set Up Storage Policies (RLS)

### Option A: Supabase Dashboard (Recommended)

1. Go to **Storage** → **Policies** in your Supabase dashboard
2. Click **"New Policy"** and create these 4 policies:

#### Policy 1: Upload Permission
- **Action**: `INSERT`
- **Target roles**: `authenticated` 
- **Policy name**: `Allow authenticated users to upload avatars`
- **Policy definition**: `bucket_id = 'user-uploads'`

#### Policy 2: Public Read
- **Action**: `SELECT`
- **Target roles**: `public`
- **Policy name**: `Allow public read access to avatars` 
- **Policy definition**: `bucket_id = 'user-uploads'`

#### Policy 3: User Updates
- **Action**: `UPDATE`
- **Target roles**: `authenticated`
- **Policy name**: `Allow users to update their own avatars`
- **Policy definition**: `bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`

#### Policy 4: User Deletes  
- **Action**: `DELETE`
- **Target roles**: `authenticated`
- **Policy name**: `Allow users to delete their own avatars`
- **Policy definition**: `bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]`

### Option B: SQL (Alternative)

Execute these SQL commands in your Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-uploads');

-- Policy 2: Allow public read access to avatars  
CREATE POLICY "Allow public read access to avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'user-uploads');

-- Policy 3: Allow users to update their own files
CREATE POLICY "Allow users to update their own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Allow users to delete their own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 3. Enable RLS on Bucket (Important)

Make sure Row Level Security is enabled on your bucket:

1. Go to **Storage** → **Settings** 
2. Find your `user-uploads` bucket
3. Ensure **"Restrict access to bucket"** is **enabled**
4. This activates the policies you created above

## 4. Test Storage Setup

Run this test query to verify bucket creation:

```sql
SELECT * FROM storage.buckets WHERE name = 'user-uploads';
```

Or use the debug tool at: `http://localhost:3002/debug/storage`

## 5. Environment Variables (Optional)

If you want to make the bucket name configurable, add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=user-uploads
```
