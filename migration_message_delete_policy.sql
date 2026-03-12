-- 메시지 삭제 RLS 정책 추가
-- 자신이 보낸 메시지만 삭제 가능
CREATE POLICY "Users can delete their own messages"
ON messages
FOR DELETE
USING (auth.uid() = user_id);
