-- ==============================================
-- CS_talk Database Schema
-- ==============================================

-- 0. Clean up existing schema for clean install (Optional but recommended for dev)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS ticket_status;
DROP TYPE IF EXISTS ticket_priority;

-- 1. Profiles Table (Extends Supabase Auth Auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Tickets Table
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'open' NOT NULL,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    image_url TEXT,
    resolve_requested BOOLEAN DEFAULT FALSE NOT NULL,
    requesting_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS for tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
-- For now, all authenticated users can view and create open tickets.
CREATE POLICY "Authenticated users can view tickets" ON tickets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can create tickets" ON tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tickets" ON tickets FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Messages Table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_internal_note BOOLEAN DEFAULT FALSE NOT NULL, -- Admin only notes
    is_resolution BOOLEAN DEFAULT FALSE NOT NULL, -- Official answer
    thread_parent_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- All authenticated users can read normal messages. Admins only for internal notes. (Simplified for initial MVP: authenticated users can read)
CREATE POLICY "Authenticated users can view messages" ON messages FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  (is_internal_note = FALSE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
);
CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Functions and Triggers
-- Auto update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Auth User Trigger (Auto-create profile on signup)
-- This ensures that when a user signs up via Supabase Auth, they get a corresponding record in the 'profiles' table.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================
-- 5. Storage Buckets (File Attachments)
-- ==============================================

-- Create a public bucket named 'attachments'
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure RLS is enabled for storage objects
-- NOTE: In Supabase, storage.objects already has RLS enabled by default.

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
-- Policy: allow public to read any image in the attachments bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

DROP POLICY IF EXISTS "Authenticated Users Upload Access" ON storage.objects;
-- Policy: allow authenticated users to upload new files
CREATE POLICY "Authenticated Users Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'attachments' AND auth.role() = 'authenticated' );

-- ==============================================
-- 6. Backfill Existing Users (Fix for Foreign Key Error)
-- ==============================================
-- If the profiles table was dropped and recreated, but auth.users still exists,
-- this will sync existing users back into the newly created profiles table 
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- 7. Add Column for Resolve Request Feature (Non-destructive)
-- ==============================================
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolve_requested BOOLEAN DEFAULT FALSE NOT NULL;
