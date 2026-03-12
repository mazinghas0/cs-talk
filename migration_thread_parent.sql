-- thread_parent_id 컬럼이 없는 경우에만 추가 (이미 있으면 오류 없이 스킵)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS thread_parent_id uuid REFERENCES messages(id) ON DELETE SET NULL;
