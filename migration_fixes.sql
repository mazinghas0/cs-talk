-- ==============================================
-- CS_talk 버그 수정 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ==============================================

-- 1. workspace_members INSERT 권한 추가 (누락된 RLS 정책)
-- 이 정책이 없어서 워크스페이스 생성 후 멤버 등록이 차단되고 있었음
DROP POLICY IF EXISTS "Users can join workspaces." ON workspace_members;
CREATE POLICY "Users can join workspaces." ON workspace_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. 워크스페이스 생성 시 owner를 자동으로 멤버(leader)로 추가하는 트리거
-- 코드에서 별도로 멤버를 등록하지 않아도 DB가 자동으로 처리함
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

-- 3. 안읽음 개수 일괄 조회 함수 (N+1 쿼리 문제 해결)
-- 기존: 티켓 1개당 DB 요청 1번 → 티켓 100개면 100번 요청
-- 개선: 모든 티켓의 안읽음 개수를 DB 요청 1번으로 처리
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

-- 4. 워크스페이스 수정 권한 추가 (owner만 이름 변경 가능)
DROP POLICY IF EXISTS "Owners can update their workspaces." ON workspaces;
CREATE POLICY "Owners can update their workspaces." ON workspaces
    FOR UPDATE USING (auth.uid() = owner_id);
