-- ==============================================
-- 고객 접근용 PIN 및 공유 기능 확장 마이그레이션
-- ==============================================

-- 1. tickets 테이블에 PIN 컬럼 추가
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS pin TEXT;

-- 2. PIN 생성을 위한 랜덤 문자열 생성 함수 (필요시)
-- 간단하게 숫자 4자리 또는 영문/숫자 조합 사용

-- 3. 익명 사용자의 티켓 조회 권한 추가 (PIN 기반)
-- 이 정책은 고객이 가입 없이 PIN만으로 해당 티켓을 볼 수 있게 합니다.
DROP POLICY IF EXISTS "Anonymous users can view tickets with PIN" ON tickets;
CREATE POLICY "Anonymous users can view tickets with PIN" ON tickets
    FOR SELECT USING (
        pin IS NOT NULL AND status != 'resolved' -- 해결된 티켓은 접근 불가 (퇴장 로직)
    );

-- 4. 익명 사용자의 메시지 조회 권한 추가
DROP POLICY IF EXISTS "Anonymous users can view messages for their ticket" ON messages;
CREATE POLICY "Anonymous users can view messages for their ticket" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = messages.ticket_id 
            AND tickets.pin IS NOT NULL
            AND tickets.status != 'resolved'
        ) AND is_internal_note = FALSE -- 내부 메모는 절대 유출 금지
    );

-- 5. 익명 사용자의 메시지 작성 권한 추가
DROP POLICY IF EXISTS "Anonymous users can send messages to their ticket" ON messages;
CREATE POLICY "Anonymous users can send messages to their ticket" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets 
            WHERE tickets.id = messages.ticket_id 
            AND tickets.pin IS NOT NULL
            AND tickets.status != 'resolved'
        )
    );
