# 本番環境デプロイチェックリスト

## 概要

ポモドーロタイマーアプリケーションの本番環境デプロイ準備状況と必要な設定項目のチェックリスト。

## 1. 本番データベースの準備

### Supabase本番環境設定

- [x] 本番用Supabaseプロジェクトの作成
- [x] データベーススキーマの適用
- [x] Row Level Security (RLS) ポリシーの設定
- [x] 認証設定の確認
- [x] リアルタイム機能の有効化
- [ ] **要対応**: 本番用環境変数の設定
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### データベース最適化

- [x] インデックスの最適化
- [x] バックアップ設定
- [x] 監視設定
- [x] パフォーマンス監視

## 2. 環境変数の設定確認

### 必須環境変数

- [ ] **要設定**: `VITE_SUPABASE_URL` - 本番用SupabaseプロジェクトURL
- [ ] **要設定**: `VITE_SUPABASE_ANON_KEY` - 本番用匿名キー
- [ ] **要設定**: `VITE_SENTRY_DSN` - Sentryプロジェクト設定
- [ ] **要設定**: `VITE_VERCEL_ANALYTICS_ID` - Vercel Analytics ID

### オプション環境変数

- [x] `VITE_APP_ENV=production`
- [x] `VITE_APP_VERSION=1.0.0`
- [x] `VITE_APP_NAME="Pomodoro Timer"`
- [x] `VITE_ENABLE_PWA=true`
- [x] `VITE_ENABLE_OFFLINE_MODE=true`
- [x] `VITE_ENABLE_ANALYTICS=true`
- [x] `VITE_ENABLE_ERROR_REPORTING=true`

### セキュリティ設定

- [x] `VITE_ENABLE_CSP=true`
- [x] `VITE_ENABLE_SOURCE_MAPS=false`
- [x] `VITE_ALLOWED_DOMAINS` - 許可ドメインリスト

## 3. SSL証明書とセキュリティ設定

### SSL/TLS設定

- [x] Vercel自動SSL証明書
- [x] HTTPS強制リダイレクト
- [x] HSTS (HTTP Strict Transport Security)
- [x] セキュリティヘッダーの設定

### セキュリティヘッダー

- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- [x] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- [x] Content Security Policy (CSP)

### CSP設定詳細

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.supabase.co https://*.sentry.io;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co;
worker-src 'self' blob:;
manifest-src 'self'
```

## 4. 監視システムの動作確認

### Sentry エラー監視

- [x] Sentry設定ファイル作成
- [x] エラーフィルタリング設定
- [x] パフォーマンス監視設定
- [x] セッション記録設定
- [x] プライバシー保護設定
- [ ] **要対応**: Sentryプロジェクト作成と設定

### Vercel Analytics

- [x] Vercel Analytics統合準備
- [ ] **要対応**: Analytics ID設定

### カスタム監視

- [x] ヘルスチェックエンドポイント (`/api/health-check`)
- [x] Cronジョブ設定（5分間隔）
- [x] パフォーマンスメトリクス収集
- [x] Core Web Vitals監視

## 5. ビルドとデプロイ設定

### Vercel設定

- [x] `vercel.json` 設定完了
- [x] ビルドコマンド: `pnpm build:production`
- [x] 出力ディレクトリ: `dist`
- [x] インストールコマンド: `pnpm install --frozen-lockfile`
- [x] Node.js 18.x ランタイム
- [x] 東京リージョン (nrt1) 設定

### ビルド最適化

- [x] コード分割 (Code Splitting)
- [x] Tree Shaking
- [x] 圧縮設定 (Terser)
- [x] アセット最適化
- [x] キャッシュ戦略
- [x] PWA設定

### キャッシュ設定

- [x] 静的アセット: 1年キャッシュ
- [x] API レスポンス: キャッシュ無効
- [x] Service Worker: 即座更新
- [x] マニフェスト: 1日キャッシュ

## 6. パフォーマンス最適化

### Core Web Vitals目標値

- [ ] **要測定**: LCP (Largest Contentful Paint) < 2.5秒
- [ ] **要測定**: FID (First Input Delay) < 100ms
- [ ] **要測定**: CLS (Cumulative Layout Shift) < 0.1

### 最適化設定

- [x] 画像最適化
- [x] フォント最適化
- [x] JavaScript分割
- [x] CSS最適化
- [x] Service Worker キャッシュ

## 7. 法的コンプライアンス

### プライバシー・法的文書

- [x] プライバシーポリシー実装
- [x] 利用規約実装
- [x] Cookie ポリシー
- [x] データエクスポート機能
- [x] アカウント削除機能

### GDPR/CCPA対応

- [x] 同意管理システム
- [x] データ処理記録
- [x] ユーザー権利対応
- [x] データ保護影響評価

## 8. 品質ゲート確認

### テスト結果（現在の状況）

- ❌ 単体テスト: 77.1% (目標: 90%以上)
- ❌ プロパティテスト: 63.6% (目標: 100%)
- ❌ E2Eテスト: 実行不可 (目標: 95%以上)

### 重要な修正が必要な項目

1. **構文エラー修正**:
   - `src/stores/auth-store.ts`: try-catch文の構文エラー
   - `src/components/onboarding/feature-tooltip.tsx`: 重複変数宣言

2. **プロパティテスト修正**:
   - エラー回復機能の自動保存検証
   - 目標設定機能のデータ構造エラー
   - パフォーマンス監視の記録精度

3. **統計コンポーネント修正**:
   - ComparisonAnalysis、CSVExport、GoalProgress

## 9. デプロイ前最終チェック

### 必須確認項目

- [ ] 全ての環境変数が設定済み
- [ ] Sentryプロジェクトが作成・設定済み
- [ ] 本番用Supabaseプロジェクトが準備済み
- [ ] 構文エラーが全て修正済み
- [ ] 品質ゲートを満たすテスト通過率
- [ ] Core Web Vitals基準値クリア

### デプロイ手順

1. 環境変数をVercelに設定
2. 構文エラーの修正
3. テスト修正と品質ゲート達成
4. 本番ビルドテスト
5. ステージング環境でのテスト
6. 本番デプロイ実行
7. デプロイ後動作確認

## 10. 運用開始後の監視項目

### 継続監視項目

- エラー率 < 1%
- 応答時間 < 2秒
- 稼働率 > 99.9%
- Core Web Vitals基準値維持
- セキュリティアラート監視

### 定期メンテナンス

- 依存関係更新（月次）
- セキュリティパッチ適用（即座）
- パフォーマンス最適化（四半期）
- バックアップ確認（週次）

---

**最終更新**: 2024年12月31日
**次回レビュー**: 本番デプロイ後1週間以内
