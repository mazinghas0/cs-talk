-- 메시지 공감(이모지 리액션) 테이블
CREATE TABLE IF NOT EXISTS message_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- 누구나 리액션 조회 가능
CREATE POLICY "Anyone can view reactions"
ON message_reactions FOR SELECT USING (true);

-- 본인 리액션만 추가 가능
CREATE POLICY "Users can add reactions"
ON message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 본인 리액션만 삭제 가능
CREATE POLICY "Users can remove their reactions"
ON message_reactions FOR DELETE
USING (auth.uid() = user_id);
