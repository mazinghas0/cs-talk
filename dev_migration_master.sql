-- ==============================================
-- CS_talk DEV 환경 마스터 마이그레이션
-- cs-chat-dev (jyusmkrbmpnxyemrkskq)에 실행
-- ==============================================

-- ① 기본 스키마
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE TYPE IF NOT EXISTS ticket_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE IF NOT EXISTS ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'open' NOT NULL,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    image_url TEXT,
    pin TEXT,
    resolve_requested BOOLEAN DEFAULT FALSE NOT NULL,
    requesting_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can create tickets" ON tickets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tickets" ON tickets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Anonymous users can view tickets with PIN" ON tickets
    FOR SELECT USING (pin IS NOT NULL AND status != 'resolved');

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    is_internal_note BOOLEAN DEFAULT FALSE NOT NULL,
    is_resolution BOOLEAN DEFAULT FALSE NOT NULL,
    thread_parent_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    customer_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view messages" ON messages FOR SELECT USING (
  auth.role() = 'authenticated' AND
  (is_internal_note = FALSE OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
);
CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own messages" ON messages FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anonymous users can view messages for their ticket" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets
            WHERE tickets.id = messages.ticket_id
            AND tickets.pin IS NOT NULL
            AND tickets.status != 'resolved'
        ) AND is_internal_note = FALSE
    );
CREATE POLICY "Anonymous users can send messages to their ticket" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets
            WHERE tickets.id = messages.ticket_id
            AND tickets.pin IS NOT NULL
            AND tickets.status != 'resolved'
        )
    );

-- updated_at 자동 갱신 함수 및 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 신규 유저 가입 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 안읽음 추적 테이블
CREATE TABLE IF NOT EXISTS profiles_tickets_reads (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (profile_id, ticket_id)
);

ALTER TABLE profiles_tickets_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own read status." ON profiles_tickets_reads FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update their own read status." ON profiles_tickets_reads FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can modify their own read status update." ON profiles_tickets_reads FOR UPDATE USING (auth.uid() = profile_id);

-- Realtime 설정
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE tickets, messages, profiles_tickets_reads;
COMMIT;

-- ② 워크스페이스 마이그레이션
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    invite_code TEXT,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create workspaces." ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their workspaces." ON workspaces FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their workspaces." ON workspaces FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated users can lookup workspace by invite code." ON workspaces
    FOR SELECT USING (invite_code IS NOT NULL AND auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view other members in the same workspace." ON workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members AS me
            WHERE me.workspace_id = workspace_members.workspace_id AND me.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can join workspaces." ON workspace_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Workspaces are viewable by members." ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id AND user_id = auth.uid()
        ) OR owner_id = auth.uid()
    );

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;
CREATE POLICY "Users can view tickets in their workspaces" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = tickets.workspace_id AND user_id = auth.uid()
        )
    );

ALTER PUBLICATION supabase_realtime ADD TABLE workspaces, workspace_members;

-- 워크스페이스 생성 시 owner 자동 leader 등록 트리거
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'leader')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
    AFTER INSERT ON workspaces
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- 안읽음 일괄 조회 함수
CREATE OR REPLACE FUNCTION get_unread_counts(p_user_id UUID, p_ticket_ids UUID[])
RETURNS TABLE(ticket_id UUID, unread_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.ticket_id,
        COUNT(*)::BIGINT AS unread_count
    FROM messages m
    LEFT JOIN profiles_tickets_reads ptr
        ON ptr.ticket_id = m.ticket_id
        AND ptr.profile_id = p_user_id
    WHERE
        m.ticket_id = ANY(p_ticket_ids)
        AND m.user_id != p_user_id
        AND m.created_at > COALESCE(ptr.last_read_at, '1970-01-01T00:00:00Z'::timestamptz)
    GROUP BY m.ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ③ 메시지 리액션
CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reactions" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- ④ 메시지 북마크
CREATE TABLE IF NOT EXISTS message_bookmarks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_snapshot text NOT NULL DEFAULT '',
    ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id)
);

ALTER TABLE message_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookmarks" ON message_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add bookmarks" ON message_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own bookmarks" ON message_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ⑤ Push 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- ⑥ Storage 버킷 설정
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Authenticated Users Upload Access" ON storage.objects;
CREATE POLICY "Authenticated Users Upload Access" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- avatars 버킷 (프로필 사진)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
CREATE POLICY "Avatars Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars Authenticated Upload" ON storage.objects;
CREATE POLICY "Avatars Authenticated Upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Avatars Owner Update" ON storage.objects;
CREATE POLICY "Avatars Owner Update" ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() = owner);
