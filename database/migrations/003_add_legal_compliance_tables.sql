-- 法的コンプライアンス関連テーブルの追加
-- Migration 003: Legal Compliance Tables

-- 法的文書テーブル（利用規約、プライバシーポリシー等）
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('terms', 'privacy', 'cookie')),
  version VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  previous_version VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じタイプで同じバージョンは一つのみ
  UNIQUE(type, version)
);

-- 法的文書のインデックス
CREATE INDEX IF NOT EXISTS idx_legal_documents_type_active ON legal_documents(type, is_active);
CREATE INDEX IF NOT EXISTS idx_legal_documents_effective_date ON legal_documents(effective_date);

-- 同意記録テーブル
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  documents JSONB NOT NULL, -- [{"type": "terms", "version": "1.0"}, ...]
  consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45), -- IPv6対応
  user_agent TEXT,
  method VARCHAR(20) DEFAULT 'update' CHECK (method IN ('signup', 'update', 'renewal', 'revocation')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security設定
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の同意記録のみアクセス可能
CREATE POLICY "Users can only see their own consent records" ON consent_records
  FOR ALL USING (auth.uid() = user_id);

-- 同意記録のインデックス
CREATE INDEX IF NOT EXISTS idx_consent_records_user_date ON consent_records(user_id, consent_date DESC);
CREATE INDEX IF NOT EXISTS idx_consent_records_method ON consent_records(method);

-- プライバシー設定テーブル
CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data_processing_consent BOOLEAN DEFAULT TRUE,
  analytics_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consent_version VARCHAR(20) DEFAULT '1.0',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユーザーごとに一つの設定のみ
  UNIQUE(user_id)
);

-- Row Level Security設定
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプライバシー設定のみアクセス可能
CREATE POLICY "Users can only see their own privacy settings" ON privacy_settings
  FOR ALL USING (auth.uid() = user_id);

-- プライバシー設定のインデックス
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user ON privacy_settings(user_id);

-- データエクスポートログテーブル
CREATE TABLE IF NOT EXISTS data_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  export_type VARCHAR(50) DEFAULT 'full_data',
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  file_size_bytes BIGINT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security設定
ALTER TABLE data_export_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のエクスポートログのみアクセス可能
CREATE POLICY "Users can only see their own export logs" ON data_export_logs
  FOR ALL USING (auth.uid() = user_id);

-- データエクスポートログのインデックス
CREATE INDEX IF NOT EXISTS idx_data_export_logs_user_date ON data_export_logs(user_id, exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_logs_status ON data_export_logs(status);

-- アカウント削除要求テーブル
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'error')),
  cancellation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_occurred_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユーザーごとに一つのアクティブな削除要求のみ
  UNIQUE(user_id) WHERE status = 'pending'
);

-- Row Level Security設定
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の削除要求のみアクセス可能
CREATE POLICY "Users can only see their own deletion requests" ON account_deletion_requests
  FOR ALL USING (auth.uid() = user_id);

-- アカウント削除要求のインデックス
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_status ON account_deletion_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_scheduled ON account_deletion_requests(scheduled_deletion_at) WHERE status = 'pending';

-- updated_atトリガーの追加
CREATE TRIGGER update_legal_documents_updated_at 
  BEFORE UPDATE ON legal_documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_privacy_settings_updated_at 
  BEFORE UPDATE ON privacy_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_deletion_requests_updated_at 
  BEFORE UPDATE ON account_deletion_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ユーザーデータ完全削除用の関数
CREATE OR REPLACE FUNCTION delete_user_data_completely(target_user_id UUID)
RETURNS VOID AS $
DECLARE
  table_name TEXT;
  tables_to_clean TEXT[] := ARRAY[
    'sessions',
    'task_tags', 
    'tasks',
    'tags',
    'consent_records',
    'privacy_settings',
    'data_export_logs',
    'account_deletion_requests'
  ];
BEGIN
  -- 依存関係の順序で削除
  FOREACH table_name IN ARRAY tables_to_clean
  LOOP
    EXECUTE format('DELETE FROM %I WHERE user_id = $1', table_name) USING target_user_id;
  END LOOP;
  
  -- 最後にユーザー自体を削除
  DELETE FROM users WHERE id = target_user_id;
  
  -- ログ出力
  RAISE NOTICE 'User % and all related data have been deleted', target_user_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- デフォルトの法的文書を挿入
INSERT INTO legal_documents (type, version, title, content, effective_date, is_active) VALUES 
(
  'terms',
  '1.0',
  '利用規約',
  '# 利用規約

## 第1条（適用）
本規約は、当社が提供するポモドーロタイマーサービス（以下「本サービス」）の利用条件を定めるものです。

## 第2条（利用登録）
本サービスの利用を希望する方は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。

## 第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
1. 法令または公序良俗に違反する行為
2. 犯罪行為に関連する行為
3. 本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為
4. 本サービスの運営を妨害するおそれのある行為
5. その他、当社が不適切と判断する行為

## 第4条（本サービスの提供の停止等）
当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。

## 第5条（著作権）
本サービスおよび本サービスに関連する一切の情報についての著作権およびその他の知的財産権は、当社または当社にその利用を許諾した権利者に帰属し、ユーザーは無断で複製、譲渡、貸与、翻訳、改変、転載、公衆送信（送信可能化を含みます。）、伝送、配布、出版、営業使用等をしてはならないものとします。

## 第6条（免責事項）
当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。

## 第7条（サービス内容の変更等）
当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。

## 第8条（利用規約の変更）
当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。

## 第9条（準拠法・裁判管轄）
本規約の解釈にあたっては、日本法を準拠法とします。
本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

以上

制定日：2024年12月31日',
  NOW(),
  TRUE
),
(
  'privacy',
  '1.0', 
  'プライバシーポリシー',
  '# プライバシーポリシー

## 1. 基本方針
当社は、ユーザーの個人情報の重要性を認識し、個人情報の保護に関する法律、その他の関係法令等を遵守し、ユーザーの個人情報を適切に取り扱います。

## 2. 収集する情報
当社は、本サービスの提供にあたり、以下の情報を収集いたします。

### 2.1 ユーザーが提供する情報
- メールアドレス
- 表示名
- タイムゾーン設定
- その他ユーザーが任意で入力する情報

### 2.2 サービス利用により生成される情報
- タスクデータ（タイトル、説明、優先度等）
- セッション履歴（作業時間、休憩時間等）
- 統計情報（生産性データ等）
- 設定情報（タイマー設定、通知設定等）

### 2.3 技術的情報
- IPアドレス
- ブラウザの種類とバージョン
- オペレーティングシステム
- アクセス日時
- 利用状況に関する情報

## 3. 利用目的
収集した個人情報は、以下の目的で利用いたします。
1. 本サービスの提供・運営
2. ユーザーサポートの提供
3. サービスの改善・新機能の開発
4. 利用状況の分析
5. セキュリティの確保
6. 法令に基づく対応

## 4. 第三者への提供
当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
1. 法令に基づく場合
2. 人の生命、身体または財産の保護のために必要がある場合
3. 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
4. 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合

## 5. データの保存場所と期間
### 5.1 保存場所
個人情報は、Supabase Inc.が提供するクラウドサービスに保存されます。
データセンターの所在地：米国、シンガポール等

### 5.2 保存期間
- アカウント情報：アカウント削除まで
- 利用履歴：最後のアクセスから3年間
- ログ情報：収集から1年間

## 6. セキュリティ
当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
- データの暗号化（AES-256）
- アクセス制御
- 定期的なセキュリティ監査
- 従業員への教育・研修

## 7. ユーザーの権利
ユーザーは、自己の個人情報について、以下の権利を有します。
1. 開示請求権
2. 訂正・追加・削除請求権
3. 利用停止・消去請求権
4. データポータビリティの権利

## 8. Cookie等の利用
本サービスでは、サービスの利便性向上のためCookieを使用しています。
Cookieの利用を希望されない場合は、ブラウザの設定により無効にすることができます。

## 9. 個人情報の取扱いに関するお問い合わせ
個人情報の取扱いに関するご質問やご意見は、以下までご連絡ください。
メールアドレス：privacy@example.com

## 10. プライバシーポリシーの変更
当社は、必要に応じて本プライバシーポリシーを変更することがあります。
変更後のプライバシーポリシーは、本サービス上に掲載したときから効力を生じるものとします。

## 11. 適用法令・管轄裁判所
本プライバシーポリシーは日本法に準拠し、個人情報に関する紛争については、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

以上

制定日：2024年12月31日
最終更新日：2024年12月31日',
  NOW(),
  TRUE
),
(
  'cookie',
  '1.0',
  'Cookie ポリシー',
  '# Cookie ポリシー

## 1. Cookieとは
Cookieとは、ウェブサイトがユーザーのコンピューターに保存する小さなテキストファイルです。
Cookieにより、ウェブサイトはユーザーの設定や行動を記憶することができます。

## 2. 当サービスでのCookieの利用
当サービスでは、以下の目的でCookieを使用しています。

### 2.1 必須Cookie
サービスの基本機能を提供するために必要なCookieです。
- ログイン状態の維持
- セッション管理
- セキュリティの確保

### 2.2 機能Cookie
ユーザーの利便性を向上させるためのCookieです。
- 言語設定の記憶
- テーマ設定の記憶
- その他のユーザー設定

### 2.3 分析Cookie（オプション）
サービスの改善のために使用統計を収集するCookieです。
- ページビューの測定
- 利用パターンの分析
- パフォーマンスの監視

## 3. 第三者Cookie
当サービスでは、以下の第三者サービスのCookieを使用する場合があります。
- Google Analytics（分析目的）
- Sentry（エラー監視目的）

## 4. Cookieの管理
ユーザーは、ブラウザの設定によりCookieを管理することができます。

### 4.1 Cookieの無効化
ブラウザの設定でCookieを無効にすることができますが、一部の機能が正常に動作しない場合があります。

### 4.2 Cookieの削除
ブラウザの設定で既存のCookieを削除することができます。

## 5. Cookieポリシーの変更
当社は、必要に応じて本Cookieポリシーを変更することがあります。
変更後のポリシーは、本サービス上に掲載したときから効力を生じるものとします。

## 6. お問い合わせ
Cookieの利用に関するご質問は、以下までご連絡ください。
メールアドレス：privacy@example.com

以上

制定日：2024年12月31日',
  NOW(),
  TRUE
)
ON CONFLICT (type, version) DO NOTHING;

-- コメント追加
COMMENT ON TABLE legal_documents IS '法的文書管理テーブル（利用規約、プライバシーポリシー等）';
COMMENT ON TABLE consent_records IS 'ユーザーの同意記録テーブル';
COMMENT ON TABLE privacy_settings IS 'ユーザーのプライバシー設定テーブル';
COMMENT ON TABLE data_export_logs IS 'データエクスポートログテーブル';
COMMENT ON TABLE account_deletion_requests IS 'アカウント削除要求テーブル';

COMMENT ON COLUMN consent_records.documents IS '同意した文書のリスト（JSON形式）';
COMMENT ON COLUMN consent_records.method IS '同意方法（signup: 登録時, update: 更新時, renewal: 更新時, revocation: 撤回時）';
COMMENT ON COLUMN privacy_settings.data_processing_consent IS 'データ処理への同意（必須）';
COMMENT ON COLUMN privacy_settings.analytics_consent IS '分析データ使用への同意（任意）';
COMMENT ON COLUMN privacy_settings.marketing_consent IS 'マーケティング情報受信への同意（任意）';
COMMENT ON COLUMN account_deletion_requests.cancellation_deadline IS 'キャンセル可能期限';

-- マイグレーション完了の記録
INSERT INTO schema_version (version, description) VALUES 
  ('1.1.0', 'Added legal compliance tables: legal_documents, consent_records, privacy_settings, data_export_logs, account_deletion_requests')
ON CONFLICT (version) DO NOTHING;