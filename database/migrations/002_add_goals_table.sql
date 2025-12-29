-- 目標設定機能のためのGoalsテーブル追加
-- 要件2.3: 目標設定システムの実装

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  metric VARCHAR(20) NOT NULL CHECK (metric IN ('sessions', 'minutes', 'tasks')),
  target_value INTEGER NOT NULL CHECK (target_value > 0),
  current_value INTEGER DEFAULT 0 CHECK (current_value >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tags JSONB DEFAULT '[]', -- 特定タグの目標の場合のタグIDリスト
  is_active BOOLEAN DEFAULT TRUE,
  achieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- データ整合性制約
  CONSTRAINT valid_period CHECK (period_end >= period_start),
  CONSTRAINT current_not_exceed_target CHECK (current_value <= target_value),
  CONSTRAINT achieved_when_target_reached 
    CHECK ((current_value >= target_value AND achieved_at IS NOT NULL) OR (current_value < target_value))
);

-- Row Level Security設定
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の目標のみアクセス可能
CREATE POLICY "Users can only see their own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX IF NOT EXISTS idx_goals_user_active ON goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_goals_user_period ON goals(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_goals_user_type ON goals(user_id, type);

-- updated_atトリガーの設定
CREATE TRIGGER update_goals_updated_at 
  BEFORE UPDATE ON goals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 目標達成時のachieved_at自動設定用トリガー関数
CREATE OR REPLACE FUNCTION set_goal_achieved_at()
RETURNS TRIGGER AS $
BEGIN
    -- 目標達成時
    IF NEW.current_value >= NEW.target_value AND (OLD.current_value IS NULL OR OLD.current_value < NEW.target_value) THEN
        NEW.achieved_at = NOW();
    -- 目標未達成に戻った場合
    ELSIF NEW.current_value < NEW.target_value AND OLD.current_value >= OLD.target_value THEN
        NEW.achieved_at = NULL;
    END IF;
    RETURN NEW;
END;
$ language 'plpgsql';

-- 目標達成日時自動設定トリガー
CREATE TRIGGER set_goal_achieved_at_trigger
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION set_goal_achieved_at();

-- 目標進捗更新用の関数
CREATE OR REPLACE FUNCTION update_goal_progress(goal_id UUID)
RETURNS VOID AS $
DECLARE
    goal_record goals%ROWTYPE;
    calculated_value INTEGER := 0;
BEGIN
    -- 目標レコードを取得
    SELECT * INTO goal_record FROM goals WHERE id = goal_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- メトリクスに応じて現在値を計算
    CASE goal_record.metric
        WHEN 'sessions' THEN
            -- 完了セッション数を計算
            SELECT COUNT(*) INTO calculated_value
            FROM sessions 
            WHERE user_id = goal_record.user_id 
              AND completed = TRUE 
              AND type = 'pomodoro'
              AND DATE(started_at) BETWEEN goal_record.period_start AND goal_record.period_end
              AND (
                -- タグ指定がない場合は全セッション
                jsonb_array_length(goal_record.tags) = 0 
                OR 
                -- タグ指定がある場合は該当タグのタスクのセッションのみ
                task_id IN (
                  SELECT DISTINCT t.id 
                  FROM tasks t
                  JOIN task_tags tt ON t.id = tt.task_id
                  WHERE tt.tag_id::text = ANY(SELECT jsonb_array_elements_text(goal_record.tags))
                )
              );
              
        WHEN 'minutes' THEN
            -- 作業時間（分）を計算
            SELECT COALESCE(SUM(actual_duration), 0) INTO calculated_value
            FROM sessions 
            WHERE user_id = goal_record.user_id 
              AND completed = TRUE 
              AND type = 'pomodoro'
              AND DATE(started_at) BETWEEN goal_record.period_start AND goal_record.period_end
              AND (
                jsonb_array_length(goal_record.tags) = 0 
                OR 
                task_id IN (
                  SELECT DISTINCT t.id 
                  FROM tasks t
                  JOIN task_tags tt ON t.id = tt.task_id
                  WHERE tt.tag_id::text = ANY(SELECT jsonb_array_elements_text(goal_record.tags))
                )
              );
              
        WHEN 'tasks' THEN
            -- 完了タスク数を計算
            SELECT COUNT(*) INTO calculated_value
            FROM tasks 
            WHERE user_id = goal_record.user_id 
              AND status = 'completed'
              AND DATE(completed_at) BETWEEN goal_record.period_start AND goal_record.period_end
              AND (
                jsonb_array_length(goal_record.tags) = 0 
                OR 
                id IN (
                  SELECT DISTINCT t.id 
                  FROM tasks t
                  JOIN task_tags tt ON t.id = tt.task_id
                  WHERE tt.tag_id::text = ANY(SELECT jsonb_array_elements_text(goal_record.tags))
                )
              );
    END CASE;
    
    -- 目標の現在値を更新
    UPDATE goals 
    SET current_value = calculated_value
    WHERE id = goal_id;
END;
$ language 'plpgsql';

-- コメント追加
COMMENT ON TABLE goals IS '目標設定テーブル';
COMMENT ON COLUMN goals.type IS '目標期間タイプ（daily/weekly/monthly）';
COMMENT ON COLUMN goals.metric IS '目標メトリクス（sessions/minutes/tasks）';
COMMENT ON COLUMN goals.target_value IS '目標値';
COMMENT ON COLUMN goals.current_value IS '現在の進捗値';
COMMENT ON COLUMN goals.tags IS '対象タグのIDリスト（JSON配列）';
COMMENT ON COLUMN goals.achieved_at IS '目標達成日時';