# インシデント対応手順書

## 概要

Pomodoroタイマーアプリケーションにおけるインシデント対応の標準手順を定義します。迅速な問題解決と影響の最小化を目的としています。

## インシデント分類

### 重要度レベル

#### P0 - 緊急（Critical）

- **定義**: サービス全体が利用不可能
- **例**:
  - アプリケーション全体のダウン
  - データベース接続不可
  - 重大なセキュリティ侵害
- **対応時間**: 15分以内に初期対応開始
- **通知**: 即座に全関係者に通知

#### P1 - 高（High）

- **定義**: 主要機能が利用不可能
- **例**:
  - タイマー機能の停止
  - ユーザー認証の問題
  - データ同期の失敗
- **対応時間**: 1時間以内に初期対応開始
- **通知**: 開発チームと運用チームに通知

#### P2 - 中（Medium）

- **定義**: 一部機能に影響があるが回避策が存在
- **例**:
  - 統計表示の不具合
  - 通知機能の問題
  - パフォーマンスの軽微な劣化
- **対応時間**: 4時間以内に初期対応開始
- **通知**: 開発チームに通知

#### P3 - 低（Low）

- **定義**: 軽微な問題で業務への影響が限定的
- **例**:
  - UI表示の軽微な問題
  - ログの出力異常
  - ドキュメントの誤記
- **対応時間**: 24時間以内に対応計画策定
- **通知**: 担当者に通知

## インシデント対応フロー

### 1. 検知・報告

#### 自動検知

```bash
# アラート確認
curl -X GET "https://api.vercel.com/v1/projects/${PROJECT_ID}/deployments" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"

# Supabaseヘルスチェック
curl -X GET "${SUPABASE_URL}/rest/v1/" \
  -H "apikey: ${SUPABASE_ANON_KEY}"
```

#### 手動報告

- **報告チャネル**: Slack #incidents チャネル
- **必要情報**:
  - 発生時刻
  - 影響範囲
  - 症状の詳細
  - 再現手順（可能な場合）

### 2. 初期対応

#### インシデント管理者の指名

```markdown
## インシデント #YYYY-MM-DD-001

**管理者**: @username
**重要度**: P1
**発生時刻**: YYYY-MM-DD HH:MM:SS UTC
**影響範囲**: タイマー機能
**ステータス**: 調査中
```

#### 影響範囲の確認

```bash
# アプリケーションステータス確認
curl -f https://your-app.vercel.app/api/health || echo "App down"

# データベース接続確認
psql "${DATABASE_URL}" -c "SELECT 1;" || echo "DB connection failed"

# 外部サービス確認
curl -f https://api.supabase.com/platform/status || echo "Supabase issues"
```

### 3. 調査・診断

#### ログ分析

```bash
# Vercelログの確認
vercel logs --app=pomodoro-timer --since=1h

# Supabaseログの確認（管理画面から）
# https://app.supabase.com/project/[project-id]/logs/explorer

# ブラウザコンソールエラーの確認
# 開発者ツール > Console > Errors
```

#### メトリクス確認

```bash
# パフォーマンスメトリクス
curl -X GET "https://api.vercel.com/v1/projects/${PROJECT_ID}/analytics" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"

# エラー率の確認
# Sentry/監視ツールのダッシュボードを確認
```

### 4. 対応・修正

#### 緊急対応（P0/P1）

```bash
# 前回の安定版へのロールバック
vercel --prod --force

# データベースの緊急メンテナンス
# Supabase管理画面から実行

# CDNキャッシュのクリア
curl -X POST "https://api.vercel.com/v1/projects/${PROJECT_ID}/domains/purge" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"
```

#### 根本原因の修正

```bash
# 修正版のデプロイ
git checkout main
git pull origin main
pnpm install
pnpm build
pnpm test
vercel --prod
```

### 5. 復旧確認

#### 機能テスト

```bash
# 自動テストの実行
pnpm test:e2e

# 手動確認項目
# - ユーザー登録・ログイン
# - タイマー開始・停止
# - データ保存・同期
# - 統計表示
```

#### パフォーマンス確認

```bash
# レスポンス時間の確認
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app/

# Core Web Vitalsの確認
# Lighthouse CI または PageSpeed Insights
```

### 6. 事後対応

#### インシデントレポート作成

```markdown
# インシデントレポート #YYYY-MM-DD-001

## 概要

- **発生日時**: YYYY-MM-DD HH:MM - HH:MM UTC
- **重要度**: P1
- **影響時間**: X時間Y分
- **影響ユーザー数**: 推定XXX人

## 根本原因

[詳細な原因分析]

## 対応内容

1. [実施した対応]
2. [修正内容]

## 再発防止策

1. [技術的改善]
2. [プロセス改善]
3. [監視強化]

## 学んだ教訓

[今後に活かすポイント]
```

## 連絡先・エスカレーション

### 緊急連絡先

```yaml
開発チーム:
  - リードエンジニア: lead@example.com
  - バックエンドエンジニア: backend@example.com
  - フロントエンドエンジニア: frontend@example.com

インフラ・運用:
  - DevOpsエンジニア: devops@example.com
  - SREエンジニア: sre@example.com

管理層:
  - プロダクトマネージャー: pm@example.com
  - CTOオフィス: cto@example.com
```

### エスカレーション基準

- **P0**: 即座に全関係者
- **P1**: 1時間以内に管理層
- **P2**: 4時間以内に上位管理者
- **P3**: 定期報告で十分

## ツール・リソース

### 監視・アラート

- **Vercel Analytics**: https://vercel.com/analytics
- **Supabase Dashboard**: https://app.supabase.com
- **Uptime Robot**: https://uptimerobot.com
- **Sentry**: https://sentry.io

### コミュニケーション

- **Slack**: #incidents, #engineering
- **Email**: incidents@example.com
- **Status Page**: https://status.example.com

### ドキュメント

- **Runbook**: ./runbook.md
- **Architecture**: ./architecture.md
- **Deployment**: ./deployment-guide.md
- **Monitoring**: ./monitoring-guide.md

## 定期レビュー

### 月次レビュー

- インシデント統計の分析
- 対応時間の評価
- プロセス改善の検討

### 四半期レビュー

- インシデント対応手順の更新
- 訓練・演習の実施
- ツール・システムの見直し

## 訓練・演習

### 月次訓練

```bash
# 障害シミュレーション
# 1. データベース接続断
# 2. アプリケーションクラッシュ
# 3. 外部API障害

# 対応手順の確認
# 1. 検知から報告まで
# 2. 初期対応の実施
# 3. 復旧作業の実行
```

### 年次演習

- 大規模障害シナリオ
- 全社的な対応訓練
- BCPの確認・更新

---

**最終更新**: 2024年12月30日  
**次回レビュー**: 2025年3月30日  
**承認者**: DevOps Team Lead
