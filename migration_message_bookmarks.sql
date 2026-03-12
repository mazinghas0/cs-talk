-- message_bookmarks 테이블
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

CREATE POLICY "Users can view own bookmarks"
    ON message_bookmarks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add bookmarks"
    ON message_bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own bookmarks"
    ON message_bookmarks FOR DELETE
    USING (auth.uid() = user_id);
