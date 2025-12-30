# 開発環境セットアップガイド

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [環境構築](#環境構築)
4. [開発ツール](#開発ツール)
5. [データベース設定](#データベース設定)
6. [テスト環境](#テスト環境)
7. [デバッグ](#デバッグ)
8. [トラブルシューティング](#トラブルシューティング)

## 概要

このガイドでは、ポモドーロタイマーアプリケーションの開発環境を構築する手順を説明します。

### 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **状態管理**: Zustand
- **UI**: Tailwind CSS + Headless UI
- **バックエンド**: Supabase (PostgreSQL + Auth + Realtime)
- **テスト**: Vitest + React Testing Library + Playwright
- **パッケージマネージャー**: pnpm

## 前提条件

### 必要なソフトウェア

| ソフトウェア | バージョン | 必須 | 備考                   |
| ------------ | ---------- | ---- | ---------------------- |
| Node.js      | 18.17.0+   | ✅   | LTS版推奨              |
| pnpm         | 8.6.0+     | ✅   | パッケージマネージャー |
| Git          | 2.30+      | ✅   | バージョン管理         |
| VS Code      | 最新       | 推奨 | エディタ               |

### 推奨環境

- **OS**: Windows 10+, macOS 12+, Ubuntu 20.04+
- **メモリ**: 8GB以上
- **ストレージ**: 5GB以上の空き容量

## 環境構築

### 1. Node.js のインストール

#### Windows

```powershell
# Chocolatey を使用
choco install nodejs

# または公式サイトからダウンロード
# https://nodejs.org/
```

#### macOS

```bash
# Homebrew を使用
brew install node

# または公式サイトからダウンロード
# https://nodejs.org/
```

#### Linux (Ubuntu/Debian)

```bash
# NodeSource リポジトリを使用
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. pnpm のインストール

```bash
# npm を使用してインストール
npm install -g pnpm

# または corepack を使用（Node.js 16.10+）
corepack enable
corepack prepare pnpm@latest --activate
```

### 3. プロジェクトのクローン

```bash
# リポジトリをクローン
git clone https://github.com/your-username/pomodoro-timer.git
cd pomodoro-timer

# 依存関係をインストール
pnpm install
```

### 4. 環境変数の設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env.local

# .env.local を編集
```

#### 環境変数の設定内容

```bash
# Supabase 設定
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# 開発環境設定
VITE_APP_ENV=development
VITE_APP_VERSION=1.0.0

# デバッグ設定
VITE_DEBUG=true
VITE_LOG_LEVEL=debug

# テスト設定
VITE_TEST_USER_EMAIL=test@example.com
VITE_TEST_USER_PASSWORD=testpassword123
```

### 5. 開発サーバーの起動

```bash
# 開発サーバーを起動
pnpm dev

# ブラウザで http://localhost:5173 を開く
```

## 開発ツール

### VS Code 拡張機能

#### 必須拡張機能

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "ms-playwright.playwright"
  ]
}
```

#### 推奨拡張機能

```json
{
  "recommendations": [
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-markdown"
  ]
}
```

### VS Code 設定

`.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["classnames\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Git フック設定

```bash
# Husky のセットアップ（自動実行）
pnpm prepare

# 手動でフックを確認
ls -la .husky/
```

### パッケージスクリプト

```bash
# 開発サーバー
pnpm dev

# ビルド
pnpm build

# プレビュー
pnpm preview

# テスト
pnpm test              # 単体テスト
pnpm test:watch        # ウォッチモード
pnpm test:property     # プロパティベーステスト
pnpm test:e2e          # E2Eテスト

# コード品質
pnpm lint              # ESLint
pnpm lint:fix          # ESLint 自動修正
pnpm format            # Prettier
pnpm format:check      # Prettier チェック
pnpm type-check        # TypeScript チェック

# その他
pnpm clean             # ビルドファイル削除
pnpm analyze           # バンドルサイズ分析
```

## データベース設定

### Supabase プロジェクトの作成

1. **Supabase アカウント作成**
   - https://supabase.com にアクセス
   - GitHub アカウントでサインアップ

2. **新しいプロジェクト作成**

   ```
   Project name: pomodoro-timer-dev
   Database password: 強力なパスワードを設定
   Region: Northeast Asia (Tokyo) 推奨
   ```

3. **API キーの取得**
   - Settings > API
   - `URL` と `anon public` キーをコピー

### データベーススキーマの適用

```bash
# スキーマファイルを確認
cat database/schema.sql

# Supabase CLI を使用してスキーマを適用
npx supabase db reset

# または SQL エディタで直接実行
# Supabase Dashboard > SQL Editor > New query
```

### ローカル開発用 Supabase

```bash
# Supabase CLI のインストール
npm install -g supabase

# ローカル環境の初期化
supabase init

# ローカル Supabase の起動
supabase start

# 停止
supabase stop
```

### データベース接続確認

```typescript
// src/services/supabase.ts で接続テスト
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 接続テスト
const testConnection = async () => {
  const { data, error } = await supabase.from('users').select('count').limit(1);

  if (error) {
    console.error('Database connection failed:', error);
  } else {
    console.log('Database connected successfully');
  }
};
```

## テスト環境

### 単体テスト設定

#### Vitest 設定

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### テストセットアップ

`src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// モック設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Supabase モック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  })),
}));
```

### E2E テスト設定

#### Playwright 設定

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### テスト実行

```bash
# E2E テストの実行
pnpm test:e2e

# ヘッドレスモードで実行
pnpm test:e2e --headed

# 特定のブラウザで実行
pnpm test:e2e --project=chromium

# デバッグモード
pnpm test:e2e --debug
```

## デバッグ

### ブラウザ開発者ツール

#### React Developer Tools

```bash
# Chrome 拡張機能をインストール
# https://chrome.google.com/webstore/detail/react-developer-tools/
```

#### Redux DevTools（Zustand 用）

```typescript
// src/stores/timer-store.ts
import { devtools } from 'zustand/middleware';

export const useTimerStore = create<TimerState>()(
  devtools(
    (set, get) => ({
      // store implementation
    }),
    {
      name: 'timer-store',
    }
  )
);
```

### VS Code デバッグ設定

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "request": "launch",
      "type": "chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "name": "Attach to Chrome",
      "port": 9222,
      "request": "attach",
      "type": "chrome",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### ログ設定

```typescript
// src/utils/logger.ts
const isDevelopment = import.meta.env.DEV;
const logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment && logLevel === 'debug') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};
```

## トラブルシューティング

### よくある問題

#### 1. pnpm install が失敗する

```bash
# キャッシュをクリア
pnpm store prune

# node_modules を削除して再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. 開発サーバーが起動しない

```bash
# ポートが使用中の場合
lsof -ti:5173 | xargs kill -9

# または別のポートを使用
pnpm dev --port 3000
```

#### 3. TypeScript エラー

```bash
# TypeScript キャッシュをクリア
rm -rf node_modules/.cache
pnpm type-check
```

#### 4. Supabase 接続エラー

```bash
# 環境変数を確認
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# .env.local ファイルの存在確認
ls -la .env*
```

#### 5. テストが失敗する

```bash
# テストキャッシュをクリア
pnpm test --run --reporter=verbose

# 特定のテストファイルを実行
pnpm test src/components/Timer.test.tsx
```

### パフォーマンス問題

#### バンドルサイズの確認

```bash
# バンドルサイズを分析
pnpm analyze

# または手動で確認
pnpm build
ls -lh dist/assets/
```

#### メモリリークの検出

```typescript
// React DevTools Profiler を使用
// または Chrome DevTools Memory タブを使用

// メモリ使用量の監視
if (import.meta.env.DEV) {
  setInterval(() => {
    console.log('Memory usage:', performance.memory);
  }, 10000);
}
```

### 環境固有の問題

#### Windows

```powershell
# 長いパス名の問題
git config --system core.longpaths true

# 権限の問題
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### macOS

```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew の権限問題
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Linux

```bash
# Node.js の権限問題
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# ファイル監視の制限
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 開発ワークフロー

### 日常的な開発手順

1. **作業開始**

   ```bash
   git pull origin main
   pnpm install  # 依存関係の更新確認
   pnpm dev      # 開発サーバー起動
   ```

2. **機能開発**

   ```bash
   git checkout -b feature/new-feature
   # 開発作業
   pnpm test     # テスト実行
   pnpm lint     # コード品質チェック
   ```

3. **コミット前チェック**

   ```bash
   pnpm type-check  # TypeScript チェック
   pnpm test        # 全テスト実行
   pnpm build       # ビルド確認
   ```

4. **コミット・プッシュ**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

### コード品質の維持

- **自動フォーマット**: Prettier による自動フォーマット
- **リント**: ESLint による静的解析
- **型チェック**: TypeScript による型安全性
- **テスト**: 単体テスト・E2Eテストによる品質保証
- **Git フック**: コミット前の自動チェック

---

_開発環境で問題が発生した場合は、このガイドのトラブルシューティングセクションを参照するか、プロジェクトのIssueで報告してください。_
