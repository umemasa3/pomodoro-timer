# バックアップ・復旧手順書

## 概要

Pomodoroタイマーアプリケーションのデータ保護とビジネス継続性を確保するためのバックアップ・復旧手順を定義します。

## バックアップ戦略

### データ分類

#### 重要度レベル

**Critical（最重要）**

- ユーザーアカウント情報
- セッション履歴データ
- ユーザー設定・プリファレンス
- **RPO**: 1時間以内
- **RTO**: 2時間以内

**Important（重要）**

- 統計・分析データ
- 目標設定データ
- アプリケーション設定
- **RPO**: 4時間以内
- **RTO**: 8時間以内

**Standard（標準）**

- ログデータ
- 一時的なセッションデータ
- キャッシュデータ
- **RPO**: 24時間以内
- **RTO**: 24時間以内

### バックアップ頻度

```yaml
データベース（Supabase）:
  フル バックアップ: 毎日 02:00 UTC
  増分バックアップ: 4時間毎
  ポイントインタイム復旧: 7日間保持

アプリケーションコード:
  Git リポジトリ: リアルタイム（GitHub）
  ビルド成果物: デプロイ毎（Vercel）
  設定ファイル: 変更時

ユーザーファイル:
  プロファイル画像: リアルタイム（Supabase Storage）
  エクスポートデータ: 生成時
```

## バックアップ実装

### 1. データベースバックアップ

#### Supabase自動バックアップ

```sql
-- バックアップ設定の確認
SELECT
  schemaname,
  tablename,
  tableowner,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 手動バックアップスクリプト

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

# 環境変数の設定
source .env.production

# バックアップディレクトリの作成
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# データベースダンプの作成
echo "Creating database backup..."
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  > "$BACKUP_DIR/database.sql"

# 重要テーブルの個別バックアップ
echo "Backing up critical tables..."
psql "$DATABASE_URL" -c "\copy users TO '$BACKUP_DIR/users.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy sessions TO '$BACKUP_DIR/sessions.csv' CSV HEADER"
psql "$DATABASE_URL" -c "\copy user_settings TO '$BACKUP_DIR/user_settings.csv' CSV HEADER"

# バックアップファイルの圧縮
echo "Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

# クラウドストレージへのアップロード（オプション）
if [ "$UPLOAD_TO_CLOUD" = "true" ]; then
  echo "Uploading to cloud storage..."
  # AWS S3の例
  aws s3 cp "$BACKUP_DIR.tar.gz" "s3://$BACKUP_BUCKET/database/"
fi

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

#### 自動バックアップの設定

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *' # 毎日 02:00 UTC
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BACKUP_BUCKET: ${{ secrets.BACKUP_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          chmod +x scripts/backup-database.sh
          ./scripts/backup-database.sh
```

### 2. アプリケーションバックアップ

#### コードリポジトリ

```bash
# Git リポジトリのミラーリング
git clone --mirror https://github.com/username/pomodoro-timer.git
cd pomodoro-timer.git
git remote set-url --push origin https://backup-repo-url.git
git push --mirror
```

#### 設定ファイルのバックアップ

```bash
#!/bin/bash
# scripts/backup-config.sh

# 重要な設定ファイルのバックアップ
CONFIG_BACKUP_DIR="config-backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$CONFIG_BACKUP_DIR"

# 環境設定
cp .env.production "$CONFIG_BACKUP_DIR/"
cp .env.staging "$CONFIG_BACKUP_DIR/"

# Vercel設定
cp vercel.json "$CONFIG_BACKUP_DIR/"
cp vercel.staging.json "$CONFIG_BACKUP_DIR/"

# ビルド設定
cp package.json "$CONFIG_BACKUP_DIR/"
cp pnpm-lock.yaml "$CONFIG_BACKUP_DIR/"
cp vite.config.ts "$CONFIG_BACKUP_DIR/"
cp tsconfig.json "$CONFIG_BACKUP_DIR/"

# 圧縮とアップロード
tar -czf "$CONFIG_BACKUP_DIR.tar.gz" "$CONFIG_BACKUP_DIR"
rm -rf "$CONFIG_BACKUP_DIR"

echo "Configuration backup completed: $CONFIG_BACKUP_DIR.tar.gz"
```

### 3. ユーザーデータバックアップ

#### Supabase Storageバックアップ

```javascript
// scripts/backup-storage.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupStorage() {
  const backupDir = `storage-backup/${new Date().toISOString().split('T')[0]}`;

  // バケット一覧の取得
  const { data: buckets } = await supabase.storage.listBuckets();

  for (const bucket of buckets) {
    console.log(`Backing up bucket: ${bucket.name}`);

    // ファイル一覧の取得
    const { data: files } = await supabase.storage
      .from(bucket.name)
      .list('', { limit: 1000 });

    // 各ファイルのダウンロード
    for (const file of files) {
      const { data } = await supabase.storage
        .from(bucket.name)
        .download(file.name);

      if (data) {
        const filePath = path.join(backupDir, bucket.name, file.name);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(await data.arrayBuffer()));
      }
    }
  }

  console.log(`Storage backup completed: ${backupDir}`);
}

backupStorage().catch(console.error);
```

## 復旧手順

### 1. 緊急時復旧（災害復旧）

#### データベース復旧

```bash
#!/bin/bash
# scripts/restore-database.sh

set -e

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

echo "Restoring database from: $BACKUP_FILE"

# バックアップファイルの展開
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
  tar -xzf "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE%.tar.gz}/database.sql"
fi

# データベースの復旧
echo "Dropping existing database..."
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restoring database..."
psql "$DATABASE_URL" < "$BACKUP_FILE"

echo "Verifying restoration..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM sessions;"

echo "Database restoration completed successfully"
```

#### アプリケーション復旧

```bash
#!/bin/bash
# scripts/restore-application.sh

set -e

echo "Starting application restoration..."

# 最新の安定版コードの取得
git fetch origin
git checkout main
git reset --hard origin/main

# 依存関係のインストール
pnpm install --frozen-lockfile

# 設定ファイルの復元
if [ -f "config-backup/latest/.env.production" ]; then
  cp "config-backup/latest/.env.production" .env.production
fi

# ビルドとテスト
pnpm build
pnpm test:unit

# デプロイ
vercel --prod --force

echo "Application restoration completed"
```

### 2. 部分復旧（データ復旧）

#### 特定テーブルの復旧

```sql
-- 特定のテーブルのみ復旧
BEGIN;

-- 既存データのバックアップ
CREATE TABLE users_backup AS SELECT * FROM users;

-- データの復旧
TRUNCATE users;
\copy users FROM 'backups/users.csv' CSV HEADER;

-- 整合性チェック
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users_backup;

-- 問題がなければコミット
COMMIT;
```

#### ポイントインタイム復旧

```bash
# Supabaseでのポイントインタイム復旧
# 管理画面から実行：
# 1. Project Settings > Database > Point in Time Recovery
# 2. 復旧したい時点を選択
# 3. 新しいプロジェクトとして復旧実行
# 4. データの検証後、本番環境に反映
```

### 3. 復旧検証

#### データ整合性チェック

```sql
-- ユーザーデータの整合性確認
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_users
FROM users;

-- セッションデータの整合性確認
SELECT
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN duration > 0 THEN 1 END) as valid_sessions,
  MAX(created_at) as latest_session
FROM sessions;

-- 外部キー制約の確認
SELECT
  conname,
  conrelid::regclass,
  confrelid::regclass
FROM pg_constraint
WHERE contype = 'f';
```

#### 機能テスト

```bash
# 自動テストの実行
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# 手動確認項目
echo "Manual verification checklist:"
echo "1. User registration and login"
echo "2. Timer functionality"
echo "3. Data synchronization"
echo "4. Statistics display"
echo "5. Settings persistence"
```

## 監視・アラート

### バックアップ監視

```bash
#!/bin/bash
# scripts/monitor-backups.sh

# 最新バックアップの確認
LATEST_BACKUP=$(ls -t backups/*.tar.gz | head -1)
BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
CURRENT_TIME=$(date +%s)
AGE_HOURS=$(( (CURRENT_TIME - BACKUP_AGE) / 3600 ))

if [ $AGE_HOURS -gt 25 ]; then
  echo "ALERT: Latest backup is $AGE_HOURS hours old"
  # Slack通知やメール送信
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Backup Alert: Latest backup is '$AGE_HOURS' hours old"}' \
    "$SLACK_WEBHOOK_URL"
fi
```

### 復旧テスト

```yaml
# .github/workflows/disaster-recovery-test.yml
name: Disaster Recovery Test

on:
  schedule:
    - cron: '0 6 1 * *' # 毎月1日 06:00 UTC
  workflow_dispatch:

jobs:
  dr-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create test environment
        run: |
          # テスト用データベースの作成
          # バックアップからの復旧テスト
          # 機能テストの実行

      - name: Cleanup test environment
        if: always()
        run: |
          # テスト環境のクリーンアップ
```

## 定期メンテナンス

### 月次タスク

```bash
# バックアップファイルのクリーンアップ
find backups/ -name "*.tar.gz" -mtime +30 -delete

# バックアップサイズの確認
du -sh backups/

# 復旧手順の確認
./scripts/test-restore.sh
```

### 四半期タスク

- 災害復旧訓練の実施
- バックアップ戦略の見直し
- RPO/RTOの評価と調整

## 緊急連絡先

```yaml
技術チーム:
  - データベース管理者: dba@example.com
  - インフラエンジニア: infra@example.com
  - セキュリティ担当: security@example.com

外部ベンダー:
  - Supabase サポート: https://supabase.com/support
  - Vercel サポート: https://vercel.com/support
  - AWS サポート: https://aws.amazon.com/support/
```

## 関連ドキュメント

- [インシデント対応手順](./incident-response.md)
- [監視・アラート設定](./monitoring-guide.md)
- [デプロイメント手順](./deployment-guide.md)
- [アーキテクチャ概要](./architecture.md)

---

**最終更新**: 2024年12月30日  
**次回レビュー**: 2025年3月30日  
**承認者**: Infrastructure Team Lead
