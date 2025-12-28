-- Supabaseリアルタイム同期の有効化
-- このスクリプトはSupabaseダッシュボードのSQL Editorで実行してください

-- リアルタイム同期を有効にするテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE task_tags;

-- 確認用クエリ（実行後に確認）
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- リアルタイム同期の設定確認
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 注意事項:
-- 1. このスクリプトはSupabaseプロジェクトの管理者権限で実行する必要があります
-- 2. リアルタイム機能はSupabaseの無料プランでも利用可能ですが、接続数に制限があります
-- 3. 本番環境では必要なテーブルのみを追加することを推奨します