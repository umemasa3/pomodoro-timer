# Vercelデプロイガイド

このドキュメントでは、ポモドーロタイマーアプリケーションをVercelにデプロイする手順を説明します。

## 前提条件

- [Vercel CLI](https://vercel.com/cli)がインストールされていること
- [Supabase](https://supabase.com)プロジェクトが作成されていること
- GitHubリポジトリが準備されていること

## 1. 環境変数の設定

### 1.1 Supabaseプロジェクトの情報取得

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. プロジェクトを選択
3. Settings > API から以下の情報を取得：
   - `Project URL`
   - `anon public` key

### 1.2 Vercelでの環境変数設定

#### 方法1: Vercel Dashboard（推奨）

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. プロジェクトを選択
3. Settings > Environment Variables に移動
4. 以下の環境変数を追加：

```bash
# 必須環境変数
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# アプリケーション設定
VITE_APP_ENV=production
VITE_APP_NAME=ポモドーロタイマー
VITE_APP_VERSION=1.0.0

# 機能フラグ
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_DEVTOOLS=false
VITE_FEATURE_OFFLINE_MODE=true
VITE_FEATURE_PUSH_NOTIFICATIONS=true
VITE_FEATURE_EXPORT_DATA=true

# キャッシュ設定
VITE_CACHE_VERSION=1
```

#### 方法2: Vercel CLI

```bash
# プロジェクトディレクトリで実行
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# ... 他の環境変数も同様に追加
```

## 2. デプロイ手順

### 2.1 初回デプロイ

```bash
# プロジェクトディレクトリに移動
cd pomodoro-timer

# Vercelにログイン
vercel login

# プロジェクトをデプロイ
vercel

# プロンプトに従って設定：
# ? Set up and deploy "~/pomodoro-timer"? [Y/n] y
# ? Which scope do you want to deploy to? [your-team]
# ? Link to existing project? [y/N] n
# ? What's your project's name? pomodoro-timer
# ? In which directory is your code located? ./
```

### 2.2 本番環境へのデプロイ

```bash
# 本番環境にデプロイ
vercel --prod
```

### 2.3 GitHub連携による自動デプロイ

1. Vercel Dashboardでプロジェクトを選択
2. Settings > Git に移動
3. GitHubリポジトリを連携
4. 以降、`main`ブランチへのプッシュで自動デプロイ

## 3. ドメイン設定

### 3.1 カスタムドメインの追加

1. Vercel Dashboard > Settings > Domains
2. カスタムドメインを入力
3. DNS設定を更新（CNAMEレコードを追加）

### 3.2 SSL証明書

Vercelは自動的にSSL証明書を発行・更新します。

## 4. パフォーマンス最適化

### 4.1 ビルド設定の確認

`vercel.json`で以下が設定されています：

- 静的アセットの長期キャッシュ
- セキュリティヘッダーの追加
- Service Workerの適切なキャッシュ設定

### 4.2 分析とモニタリング

```bash
# Lighthouseでパフォーマンス測定
pnpm run lighthouse

# バンドルサイズの確認
pnpm run size-check
```

## 5. トラブルシューティング

### 5.1 ビルドエラー

```bash
# ローカルでビルドテスト
pnpm run build:production

# 型チェック
pnpm run type-check

# リンティング
pnpm run lint
```

### 5.2 環境変数エラー

```bash
# 環境変数の確認
vercel env ls

# 特定の環境変数の値確認
vercel env pull .env.vercel
```

### 5.3 Supabase接続エラー

1. Supabase Dashboard > Settings > API でURL/Keyを確認
2. Row Level Security (RLS) の設定を確認
3. ネットワークの制限設定を確認

## 6. 監視とメンテナンス

### 6.1 ログの確認

```bash
# デプロイログの確認
vercel logs

# 関数ログの確認（該当する場合）
vercel logs --follow
```

### 6.2 パフォーマンス監視

- Vercel Analytics（有料プランで利用可能）
- Google Analytics（設定済み）
- Core Web Vitalsの監視

### 6.3 定期メンテナンス

- 依存関係の更新
- セキュリティパッチの適用
- パフォーマンスメトリクスの確認

## 7. セキュリティ設定

### 7.1 セキュリティヘッダー

`vercel.json`で以下のセキュリティヘッダーが設定されています：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### 7.2 環境変数の管理

- 本番環境の環境変数は暗号化されて保存
- 開発環境とは分離して管理
- 定期的なキーローテーション

## 8. スケーリング

### 8.1 トラフィック増加への対応

Vercelは自動スケーリングに対応していますが、以下の点に注意：

- 関数の実行時間制限（Hobby: 10秒、Pro: 60秒）
- 帯域幅制限（プランに依存）
- 同時実行数の制限

### 8.2 コスト最適化

- 不要な関数の削除
- 静的アセットの最適化
- キャッシュ戦略の見直し

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [PWA Best Practices](https://web.dev/pwa-checklist/)
