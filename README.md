# ポモドーロタイマー

効率的な時間管理と生産性向上のためのWebアプリケーション

## 概要

このアプリケーションは、ポモドーロテクニックを実装したタイマーアプリです。ユーザーが集中して作業し、適切な休憩を取ることで生産性を向上させることを目的としています。

## 技術スタック

### フロントエンド

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Vite** - 高速ビルドツール
- **Tailwind CSS** - ユーティリティファーストCSS
- **Headless UI** - アクセシブルなUIコンポーネント
- **Framer Motion** - アニメーション
- **Zustand** - 状態管理

### バックエンド・データベース

- **Supabase** - PostgreSQL + 認証 + リアルタイム
- **Row Level Security** - データベースレベルセキュリティ

### ホスティング・デプロイ

- **Vercel** - フロントエンドホスティング
- **自動デプロイ** - GitHub連携

### 開発ツール

- **ESLint** - コード品質
- **Prettier** - コードフォーマット
- **Husky** - Git hooks
- **lint-staged** - ステージングファイルのリント
- **Vitest** - テストフレームワーク
- **fast-check** - プロパティベーステスト

## 開発環境のセットアップ

### 前提条件

- Node.js 18.17.0+
- pnpm 8.6.0+

### インストール

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.localファイルを編集してSupabase設定を追加
```

### 開発サーバーの起動

```bash
# 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:5173 を開く
```

### その他のコマンド

```bash
# ビルド
pnpm build

# テスト実行
pnpm test

# テスト（ウォッチモード）
pnpm test:watch

# プロパティベーステスト
pnpm test:property

# リント
pnpm lint

# リント（自動修正）
pnpm lint:fix

# フォーマット
pnpm format

# フォーマットチェック
pnpm format:check

# プレビュー（ビルド後）
pnpm preview

# タスク管理
pnpm task:status    # タスク進捗確認
pnpm task:start     # タスク開始（ブランチ作成）
pnpm task:finish    # タスク完了（プルリクエスト作成）
```

## Git ワークフロー（GitHub Flow）

### タスク開始時の手順

```bash
# タスク開始（機能ブランチ作成）
pnpm task:start "タスク番号" "タスク名"

# 例
pnpm task:start "2.1" "Supabaseデータベーススキーマの実装"
```

### タスク完了時の手順

```bash
# タスク進捗の確認
pnpm task:status

# タスク完了（コミット・プッシュ・プルリクエスト作成）
pnpm task:finish "タスク番号" "タスク名" "詳細説明"

# 例
pnpm task:finish "2.1" "Supabaseデータベーススキーマの実装" "- テーブル作成とRLS設定完了"
```

### 手動でのGit操作（GitHub Flow）

```bash
# 1. タスク開始
git checkout main
git pull origin main
git checkout -b feature/task-X.X-description

# 2. 実装・コミット（複数回可能）
git add .
git commit -m "feat: [タスク番号] 変更内容

- 実装内容の詳細
- テスト結果"

# 3. プッシュ
git push origin feature/task-X.X-description

# 4. プルリクエスト作成
gh pr create --title "[タスク番号] タスク名" --body "実装内容"

# 5. マージ後のクリーンアップ
git checkout main
git pull origin main
git branch -d feature/task-X.X-description
```

## プロジェクト構造

```
src/
├── components/     # Reactコンポーネント
├── hooks/         # カスタムフック
├── pages/         # ページコンポーネント
├── services/      # API・外部サービス
├── stores/        # 状態管理（Zustand）
├── types/         # TypeScript型定義
├── utils/         # ユーティリティ関数
└── test/          # テスト設定・ヘルパー
```

## 機能

### 実装済み

- [x] プロジェクト基盤構築
- [x] 開発環境セットアップ
- [x] 基本的なUI構造

### 実装予定

- [ ] タイマー機能（開始、一時停止、リセット）
- [ ] 休憩セッション管理
- [ ] 通知機能
- [ ] 設定のカスタマイズ
- [ ] タスク管理
- [ ] タグ管理
- [ ] セッション追跡・統計分析
- [ ] ユーザー認証
- [ ] データ永続化
- [ ] マルチデバイス同期

## 設計文書

詳細な設計については以下を参照してください：

- [要件文書](./.kiro/specs/pomodoro-timer/requirements.md)
- [設計文書](./.kiro/specs/pomodoro-timer/design.md)
- [実装計画](./.kiro/specs/pomodoro-timer/tasks.md)

## ライセンス

MIT License
