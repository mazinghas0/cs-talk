-- ==============================================
-- CS_talk 워크스페이스(멀티 테넌시) 확장 마이그레이션
-- ==============================================

-- 1. 워크스페이스 테이블 생성
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 워크스페이스 RLS 설정
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces are viewable by members." ON workspaces
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspaces.id AND user_id = auth.uid()
        ) OR owner_id = auth.uid()
    );

CREATE POLICY "Users can create workspaces." ON workspaces
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 2. 워크스페이스 멤버 테이블 생성 (N:M 관계)
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

-- 워크스페이스 멤버 RLS 설정
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view other members in the same workspace." ON workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members AS me
            WHERE me.workspace_id = workspace_members.workspace_id AND me.user_id = auth.uid()
        )
    );

-- 3. 기존 테이블에 workspace_id 추가 및 연동
-- tickets 테이블 확장
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 4. 티켓 RLS 정책 상향 조정 (워크스페이스 기반 격리)
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON tickets;
CREATE POLICY "Users can view tickets in their workspaces" ON tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = tickets.workspace_id AND user_id = auth.uid()
        )
    );

-- 5. 실시간 구독 설정 확장
ALTER PUBLICATION supabase_realtime ADD TABLE workspaces, workspace_members;
