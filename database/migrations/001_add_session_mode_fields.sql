-- セッションテーブルにモードとセッション名フィールドを追加
-- マイグレーション: 001_add_session_mode_fields.sql

-- modeフィールドを追加（デフォルトは'task-based'）
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'task-based' 
CHECK (mode IN ('task-based', 'standalone'));

-- session_nameフィールドを追加（スタンドアロンモード時のセッション名）
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS session_name VARCHAR(100);

-- 既存のデータに対してデフォルト値を設定
UPDATE sessions 
SET mode = 'task-based' 
WHERE mode IS NULL;

-- インデックスを追加（モード別の検索を高速化）
CREATE INDEX IF NOT EXISTS idx_sessions_user_mode ON sessions(user_id, mode);

-- コメントを追加
COMMENT ON COLUMN sessions.mode IS 'セッションモード: task-based（タスクベース）またはstandalone（スタンドアロン）';
COMMENT ON COLUMN sessions.session_name IS 'スタンドアロンモード時のセッション名（例：「集中時間」「休憩」）';

-- スキーマバージョンを更新
INSERT INTO schema_version (version, description) VALUES 
  ('1.1.0', 'Add mode and session_name fields to sessions table for standalone timer support')
ON CONFLICT (version) DO NOTHING;