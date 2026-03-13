-- ==============================================
-- 초대 코드 조회 RLS 정책 추가
-- 버그: 비멤버가 초대 코드로 워크스페이스 조회 시 "유효하지 않은 초대 코드" 오류
-- 원인: 기존 SELECT 정책이 멤버/오너만 허용 → 초대받은 사람(비멤버)은 조회 불가
-- 해결: 인증된 사용자는 invite_code가 있는 워크스페이스 기본 정보 조회 허용
-- ==============================================

DROP POLICY IF EXISTS "Authenticated users can lookup workspace by invite code." ON workspaces;

CREATE POLICY "Authenticated users can lookup workspace by invite code." ON workspaces
    FOR SELECT USING (
        invite_code IS NOT NULL AND auth.role() = 'authenticated'
    );
