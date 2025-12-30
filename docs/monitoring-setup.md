# 監視ツール設定ガイド

このドキュメントでは、ポモドーロタイマーアプリケーションの監視ツール（Sentry、Vercel Analytics、Lighthouse CI）の設定方法を説明します。

## 1. Sentry（エラー監視）

### 1.1 Sentryプロジェクトの作成

1. [Sentry](https://sentry.io)にアカウント作成・ログイン
2. 新しいプロジェクトを作成（React を選択）
3. DSN（Data Source Name）を取得

### 1.2 環境変数の設定

```bash
# 本番環境
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=1.0.0

# ビルド時（ソースマップアップロード用）
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
```

### 1.3 Sentryの機能

- **エラー追跡**: JavaScript例外の自動キャッチ
- **パフォーマンス監視**: ページロード時間、API応答時間
- **セッション記録**: ユーザーの操作履歴（エラー時のみ）
- **リアルタイムアラート**: Slack、メール通知

### 1.4 カスタムエラー報告

```typescript
import { reportError, reportMessage } from './sentry.client.config';

// エラーの手動報告
try {
  // 何らかの処理
} catch (error) {
  reportError(error, { context: 'timer-operation' });
}

// カスタムメッセージの報告
reportMessage('User completed pomodoro session', 'info', {
  sessionDuration: 1500,
  taskId: 'task-123'
});
```

## 2. Vercel Analytics

### 2.1 Vercel Analyticsの有効化

1. Vercel Dashboardでプロジェクトを選択
2. Analytics タブに移動
3. Enable Analytics をクリック
4. Analytics IDを取得

### 2.2 環境変数の設定

```bash
VITE_VERCEL_ANALYTICS_ID=your-analytics-id
VITE_ENABLE_ANALYTICS=true
```

### 2.3 カスタムイベント追跡

```typescript
import { useVercelAnalytics } from '@/components/analytics/vercel-analytics';

function TimerComponent() {
  const { trackEvent, trackConversion } = useVercelAnalytics();

  const handleTimerStart = () => {
    trackEvent('timer_started', {
      sessionType: 'pomodoro',
      duration: 1500
    });
  };

  const handleSessionComplete = () => {
    trackConversion('session_completed', 1);
  };

  // ...
}
```

### 2.4 追跡可能なメトリクス

- **Core Web Vitals**: LCP、FID、CLS
- **ページビュー**: ページ別の訪問数
- **カスタムイベント**: ユーザーアクション
- **コンバージョン**: 目標達成率

## 3. Lighthouse CI

### 3.1 Lighthouse CIの設定

設定ファイル（`.lighthouserc.js`）で以下を定義：

- **テスト対象URL**: ローカル・本番環境
- **品質基準**: パフォーマンス、アクセシビリティ等のスコア閾値
- **Core Web Vitals**: LCP、FID、CLS の目標値

### 3.2 GitHub Actions統合

```yaml
# .github/workflows/lighthouse-ci.yml
- name: Run Lighthouse CI
  run: lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 3.3 品質ゲート

以下の基準を満たさない場合、ビルドが失敗します：

- **パフォーマンス**: 80点以上
- **アクセシビリティ**: 90点以上
- **ベストプラクティス**: 90点以上
- **SEO**: 80点以上

### 3.4 ローカルでのLighthouse実行

```bash
# 開発サーバー起動後
pnpm run lighthouse:local

# 本番環境のテスト
pnpm run lighthouse:production
```

## 4. カスタム監視ダッシュボード

### 4.1 監視ダッシュボードの表示

```typescript
import { MonitoringDashboard } from '@/components/monitoring/monitoring-dashboard';

// 管理者画面で表示
function AdminPage() {
  return (
    <div>
      <h1>システム監視</h1>
      <MonitoringDashboard />
    </div>
  );
}
```

### 4.2 監視項目

- **パフォーマンスメトリクス**: LCP、FID、CLS、TTFB
- **エラーメトリクス**: エラー数、エラー率
- **システムメトリクス**: 応答時間、メモリ使用率
- **ユーザーメトリクス**: アクティブユーザー数

### 4.3 アラート設定

```typescript
// 閾値を超えた場合のアラート
const healthStatus = determineHealthStatus(metrics);
if (healthStatus.status === 'critical') {
  // Slack通知、メール送信等
  notifyAdministrators(healthStatus);
}
```

## 5. 監視データの活用

### 5.1 パフォーマンス最適化

1. **Lighthouse CI結果の分析**
   - Core Web Vitalsの改善点特定
   - 未使用CSS/JavaScriptの削除
   - 画像最適化の提案

2. **Sentryパフォーマンス監視**
   - 遅いAPIエンドポイントの特定
   - フロントエンドボトルネックの発見
   - ユーザー体験の改善

### 5.2 エラー対応

1. **Sentryエラー追跡**
   - エラーの頻度と影響範囲の把握
   - スタックトレースによる原因特定
   - ユーザーセッション記録による再現

2. **プロアクティブな対応**
   - エラー率の閾値設定
   - 自動アラート通知
   - 緊急時のロールバック判断

### 5.3 ユーザー行動分析

1. **Vercel Analytics**
   - ページ別の滞在時間
   - ユーザーフローの分析
   - コンバージョン率の測定

2. **カスタムイベント**
   - 機能使用率の測定
   - ユーザーエンゲージメント
   - A/Bテストの効果測定

## 6. トラブルシューティング

### 6.1 Sentry関連

```bash
# Sentryの接続確認
curl -X POST 'https://sentry.io/api/0/projects/your-org/your-project/store/' \
  -H 'X-Sentry-Auth: Sentry sentry_version=7, sentry_key=your-key' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Test message"}'

# ソースマップのアップロード確認
pnpm run sentry:sourcemaps
```

### 6.2 Lighthouse CI関連

```bash
# 設定ファイルの検証
lhci healthcheck

# 手動でのLighthouse実行
lighthouse http://localhost:3000 --output=json --output-path=./report.json
```

### 6.3 Vercel Analytics関連

```bash
# Analytics スクリプトの読み込み確認
curl -I https://your-app.vercel.app/_vercel/insights/script.js

# 環境変数の確認
vercel env ls
```

## 7. セキュリティとプライバシー

### 7.1 データ保護

- **Sentry**: 機密情報の自動マスキング
- **Analytics**: 個人識別情報の除外
- **Lighthouse**: 公開情報のみテスト

### 7.2 GDPR対応

```typescript
// ユーザー同意に基づく分析の有効化
const enableAnalytics = userConsent.analytics && 
  import.meta.env.VITE_ENABLE_ANALYTICS === 'true';

if (enableAnalytics) {
  // 分析ツールの初期化
}
```

## 8. 運用チェックリスト

### 8.1 日次チェック

- [ ] Sentryエラー率確認（< 1%）
- [ ] Core Web Vitals確認（LCP < 2.5s、FID < 100ms、CLS < 0.1）
- [ ] 応答時間確認（< 2秒）
- [ ] 稼働率確認（> 99.9%）

### 8.2 週次チェック

- [ ] Lighthouse CIレポート分析
- [ ] パフォーマンストレンド確認
- [ ] エラーパターン分析
- [ ] ユーザー行動分析

### 8.3 月次チェック

- [ ] 監視ツールの設定見直し
- [ ] アラート閾値の調整
- [ ] ダッシュボードの改善
- [ ] レポート自動化の検討

## 参考リンク

- [Sentry Documentation](https://docs.sentry.io/)
- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Core Web Vitals](https://web.dev/vitals/)
- [Web Performance Monitoring](https://web.dev/monitoring/)