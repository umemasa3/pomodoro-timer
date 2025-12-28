-- ポモドーロタイマーアプリケーション データベーススキーマ
-- Supabase PostgreSQL用

-- PostgreSQL拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  settings JSONB DEFAULT '{
    "pomodoro_minutes": 25,
    "short_break_minutes": 5,
    "long_break_minutes": 15,
    "sessions_until_long_break": 4,
    "sound_enabled": true,
    "sound_type": "bell",
    "theme": "auto",
    "notifications": {
      "desktop": true,
      "sound": true,
      "vibration": false
    }
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security設定
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can only see their own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_pomodoros INTEGER DEFAULT 1 CHECK (estimated_pomodoros > 0),
  completed_pomodoros INTEGER DEFAULT 0 CHECK (completed_pomodoros >= 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- データ整合性制約
  CONSTRAINT completed_pomodoros_not_exceed_estimated 
    CHECK (completed_pomodoros <= estimated_pomodoros),
  CONSTRAINT completed_at_when_completed 
    CHECK ((status = 'completed' AND completed_at IS NOT NULL) OR (status != 'completed'))
);

-- Row Level Security設定
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクのみアクセス可能
CREATE POLICY "Users can only see their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$')$'),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユーザーごとにタグ名は一意
  UNIQUE(user_id, name)
);

-- Row Level Security設定
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタグのみアクセス可能
CREATE POLICY "Users can only see their own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_tags_user_usage ON tags(user_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

-- Task-Tag relationship（多対多）
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (task_id, tag_id)
);

-- Row Level Security設定
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクに関連するタグ関係のみアクセス可能
CREATE POLICY "Users can only see their own task_tags" ON task_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_tags.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pomodoro', 'short_break', 'long_break')),
  planned_duration INTEGER NOT NULL CHECK (planned_duration > 0),
  actual_duration INTEGER CHECK (actual_duration > 0),
  completed BOOLEAN DEFAULT FALSE,
  task_completion_status VARCHAR(20) CHECK (task_completion_status IN ('completed', 'continued', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- データ整合性制約
  CONSTRAINT completed_at_when_completed_session 
    CHECK ((completed = TRUE AND completed_at IS NOT NULL) OR (completed = FALSE)),
  CONSTRAINT actual_duration_when_completed 
    CHECK ((completed = TRUE AND actual_duration IS NOT NULL) OR (completed = FALSE))
);

-- Row Level Security設定
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッションのみアクセス可能
CREATE POLICY "Users can only see their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- 分析クエリ用のインデックス
CREATE INDEX IF NOT EXISTS idx_sessions_user_completed_at ON sessions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_type_completed ON sessions(user_id, type, completed);
CREATE INDEX IF NOT EXISTS idx_sessions_user_started_at ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id) WHERE task_id IS NOT NULL;

-- updated_atカラムの自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーの設定
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- タグ使用回数の自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- タグ使用回数更新トリガーの設定
CREATE TRIGGER update_tag_usage_on_task_tag_change
  AFTER INSERT OR DELETE ON task_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- 完了タスクのcompleted_at自動設定用トリガー関数
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスがcompletedに変更された場合
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at = NOW();
    -- ステータスがcompletedから他に変更された場合
    ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- タスク完了日時自動設定トリガー
CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- セッション完了時のcompleted_at自動設定用トリガー関数
CREATE OR REPLACE FUNCTION set_session_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- completedがtrueに変更された場合
    IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
        NEW.completed_at = NOW();
    -- completedがfalseに変更された場合
    ELSIF NEW.completed = FALSE AND OLD.completed = TRUE THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- セッション完了日時自動設定トリガー
CREATE TRIGGER set_session_completed_at_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_session_completed_at();

-- リアルタイム同期の有効化（Supabaseでの設定）
-- 注意: これらのコマンドはSupabaseダッシュボードまたはSupabase CLIで実行する必要があります
-- ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tags;
-- ALTER PUBLICATION supabase_realtime ADD TABLE task_tags;

-- 初期データの挿入（開発用）
-- 注意: 本番環境では削除してください
INSERT INTO users (id, email, display_name, timezone) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'テストユーザー', 'Asia/Tokyo')
ON CONFLICT (email) DO NOTHING;

-- 開発用のサンプルタスク
INSERT INTO tasks (user_id, title, description, estimated_pomodoros, priority) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'プロジェクト設計書の作成', 'ポモドーロタイマーアプリの設計書を作成する', 3, 'high'),
  ('00000000-0000-0000-0000-000000000001', 'データベーススキーマの実装', 'Supabaseでデータベーススキーマを実装する', 2, 'high'),
  ('00000000-0000-0000-0000-000000000001', 'UIコンポーネントの作成', 'React コンポーネントを作成する', 4, 'medium')
ON CONFLICT DO NOTHING;

-- 開発用のサンプルタグ
INSERT INTO tags (user_id, name, color) VALUES 
  ('00000000-0000-0000-0000-000000000001', '開発', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000001', '設計', '#10B981'),
  ('00000000-0000-0000-0000-000000000001', 'テスト', '#F59E0B')
ON CONFLICT (user_id, name) DO NOTHING;

-- データベーススキーマのバージョン情報
CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(20) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES 
  ('1.0.0', 'Initial database schema for Pomodoro Timer application')
ON CONFLICT (version) DO NOTHING;

-- 統計用のビュー（パフォーマンス最適化）
CREATE OR REPLACE VIEW user_session_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE completed = TRUE) as completed_sessions,
  COUNT(*) FILTER (WHERE type = 'pomodoro' AND completed = TRUE) as completed_pomodoros,
  SUM(actual_duration) FILTER (WHERE completed = TRUE) as total_work_minutes,
  AVG(actual_duration) FILTER (WHERE completed = TRUE AND type = 'pomodoro') as avg_pomodoro_duration,
  DATE_TRUNC('day', started_at) as session_date
FROM sessions
GROUP BY user_id, DATE_TRUNC('day', started_at);

-- タスク統計用のビュー
CREATE OR REPLACE VIEW user_task_stats AS
SELECT 
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_tasks,
  COUNT(*) FILTER (WHERE priority = 'low') as low_priority_tasks,
  AVG(completed_pomodoros::FLOAT / NULLIF(estimated_pomodoros, 0)) as avg_completion_rate
FROM tasks
GROUP BY user_id;

-- コメント追加（ドキュメント化）
COMMENT ON TABLE users IS 'ユーザー情報テーブル（Supabase Authと連携）';
COMMENT ON TABLE tasks IS 'タスク管理テーブル';
COMMENT ON TABLE tags IS 'タグ管理テーブル';
COMMENT ON TABLE task_tags IS 'タスクとタグの多対多関係テーブル';
COMMENT ON TABLE sessions IS 'ポモドーロセッション記録テーブル';
COMMENT ON TABLE schema_version IS 'データベーススキーマのバージョン管理テーブル';

COMMENT ON COLUMN users.settings IS 'ユーザー設定（JSON形式）';
COMMENT ON COLUMN tasks.estimated_pomodoros IS '見積もりポモドーロ数';
COMMENT ON COLUMN tasks.completed_pomodoros IS '完了済みポモドーロ数';
COMMENT ON COLUMN sessions.planned_duration IS '計画時間（分）';
COMMENT ON COLUMN sessions.actual_duration IS '実際の時間（分）';
COMMENT ON COLUMN sessions.task_completion_status IS 'セッション終了時のタスク完了状態';
,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユーザーごとにタグ名は一意
  UNIQUE(user_id, name)
);

-- Row Level Security設定
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタグのみアクセス可能
CREATE POLICY "Users can only see their own tags" ON tags
  FOR ALL USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_tags_user_usage ON tags(user_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

-- Task-Tag relationship（多対多）
CREATE TABLE IF NOT EXISTS task_tags (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (task_id, tag_id)
);

-- Row Level Security設定
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のタスクに関連するタグ関係のみアクセス可能
CREATE POLICY "Users can only see their own task_tags" ON task_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_tags.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('pomodoro', 'short_break', 'long_break')),
  planned_duration INTEGER NOT NULL CHECK (planned_duration > 0),
  actual_duration INTEGER CHECK (actual_duration > 0),
  completed BOOLEAN DEFAULT FALSE,
  task_completion_status VARCHAR(20) CHECK (task_completion_status IN ('completed', 'continued', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- データ整合性制約
  CONSTRAINT completed_at_when_completed_session 
    CHECK ((completed = TRUE AND completed_at IS NOT NULL) OR (completed = FALSE)),
  CONSTRAINT actual_duration_when_completed 
    CHECK ((completed = TRUE AND actual_duration IS NOT NULL) OR (completed = FALSE))
);

-- Row Level Security設定
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッションのみアクセス可能
CREATE POLICY "Users can only see their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- 分析クエリ用のインデックス
CREATE INDEX IF NOT EXISTS idx_sessions_user_completed_at ON sessions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_type_completed ON sessions(user_id, type, completed);
CREATE INDEX IF NOT EXISTS idx_sessions_user_started_at ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON sessions(task_id) WHERE task_id IS NOT NULL;

-- updated_atカラムの自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーの設定
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- タグ使用回数の自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- タグ使用回数更新トリガーの設定
CREATE TRIGGER update_tag_usage_on_task_tag_change
  AFTER INSERT OR DELETE ON task_tags
  FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- 完了タスクのcompleted_at自動設定用トリガー関数
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスがcompletedに変更された場合
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at = NOW();
    -- ステータスがcompletedから他に変更された場合
    ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- タスク完了日時自動設定トリガー
CREATE TRIGGER set_task_completed_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();

-- セッション完了時のcompleted_at自動設定用トリガー関数
CREATE OR REPLACE FUNCTION set_session_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- completedがtrueに変更された場合
    IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
        NEW.completed_at = NOW();
    -- completedがfalseに変更された場合
    ELSIF NEW.completed = FALSE AND OLD.completed = TRUE THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- セッション完了日時自動設定トリガー
CREATE TRIGGER set_session_completed_at_trigger
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_session_completed_at();

-- リアルタイム同期の有効化（Supabaseでの設定）
-- 注意: これらのコマンドはSupabaseダッシュボードまたはSupabase CLIで実行する必要があります
-- ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tags;
-- ALTER PUBLICATION supabase_realtime ADD TABLE task_tags;

-- 初期データの挿入（開発用）
-- 注意: 本番環境では削除してください
INSERT INTO users (id, email, display_name, timezone) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'テストユーザー', 'Asia/Tokyo')
ON CONFLICT (email) DO NOTHING;

-- 開発用のサンプルタスク
INSERT INTO tasks (user_id, title, description, estimated_pomodoros, priority) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'プロジェクト設計書の作成', 'ポモドーロタイマーアプリの設計書を作成する', 3, 'high'),
  ('00000000-0000-0000-0000-000000000001', 'データベーススキーマの実装', 'Supabaseでデータベーススキーマを実装する', 2, 'high'),
  ('00000000-0000-0000-0000-000000000001', 'UIコンポーネントの作成', 'React コンポーネントを作成する', 4, 'medium')
ON CONFLICT DO NOTHING;

-- 開発用のサンプルタグ
INSERT INTO tags (user_id, name, color) VALUES 
  ('00000000-0000-0000-0000-000000000001', '開発', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000001', '設計', '#10B981'),
  ('00000000-0000-0000-0000-000000000001', 'テスト', '#F59E0B')
ON CONFLICT (user_id, name) DO NOTHING;

-- データベーススキーマのバージョン情報
CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(20) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description) VALUES 
  ('1.0.0', 'Initial database schema for Pomodoro Timer application')
ON CONFLICT (version) DO NOTHING;

-- 統計用のビュー（パフォーマンス最適化）
CREATE OR REPLACE VIEW user_session_stats AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE completed = TRUE) as completed_sessions,
  COUNT(*) FILTER (WHERE type = 'pomodoro' AND completed = TRUE) as completed_pomodoros,
  SUM(actual_duration) FILTER (WHERE completed = TRUE) as total_work_minutes,
  AVG(actual_duration) FILTER (WHERE completed = TRUE AND type = 'pomodoro') as avg_pomodoro_duration,
  DATE_TRUNC('day', started_at) as session_date
FROM sessions
GROUP BY user_id, DATE_TRUNC('day', started_at);

-- タスク統計用のビュー
CREATE OR REPLACE VIEW user_task_stats AS
SELECT 
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_tasks,
  COUNT(*) FILTER (WHERE priority = 'low') as low_priority_tasks,
  AVG(completed_pomodoros::FLOAT / NULLIF(estimated_pomodoros, 0)) as avg_completion_rate
FROM tasks
GROUP BY user_id;

-- コメント追加（ドキュメント化）
COMMENT ON TABLE users IS 'ユーザー情報テーブル（Supabase Authと連携）';
COMMENT ON TABLE tasks IS 'タスク管理テーブル';
COMMENT ON TABLE tags IS 'タグ管理テーブル';
COMMENT ON TABLE task_tags IS 'タスクとタグの多対多関係テーブル';
COMMENT ON TABLE sessions IS 'ポモドーロセッション記録テーブル';
COMMENT ON TABLE schema_version IS 'データベーススキーマのバージョン管理テーブル';

COMMENT ON COLUMN users.settings IS 'ユーザー設定（JSON形式）';
COMMENT ON COLUMN tasks.estimated_pomodoros IS '見積もりポモドーロ数';
COMMENT ON COLUMN tasks.completed_pomodoros IS '完了済みポモドーロ数';
COMMENT ON COLUMN sessions.planned_duration IS '計画時間（分）';
COMMENT ON COLUMN sessions.actual_duration IS '実際の時間（分）';
COMMENT ON COLUMN sessions.task_completion_status IS 'セッション終了時のタスク完了状態';