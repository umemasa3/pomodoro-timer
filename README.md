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
