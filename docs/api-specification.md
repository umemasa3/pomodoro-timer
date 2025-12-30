# API仕様書

## 目次

1. [概要](#概要)
2. [認証](#認証)
3. [エラーハンドリング](#エラーハンドリング)
4. [レート制限](#レート制限)
5. [データモデル](#データモデル)
6. [エンドポイント](#エンドポイント)
7. [リアルタイム機能](#リアルタイム機能)
8. [セキュリティ](#セキュリティ)

## 概要

ポモドーロタイマーのAPIは、Supabaseを基盤としたRESTful APIです。認証、データ管理、リアルタイム同期機能を提供します。

### 基本情報

- **ベースURL**: `https://your-project.supabase.co`
- **API バージョン**: v1
- **プロトコル**: HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 技術スタック

- **データベース**: PostgreSQL (Supabase)
- **認証**: Supabase Auth (JWT)
- **リアルタイム**: Supabase Realtime
- **セキュリティ**: Row Level Security (RLS)

## 認証

### 認証方式

Supabase Authを使用したJWTベースの認証を採用しています。

#### 1. ユーザー登録

```http
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**レスポンス:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_confirmed_at": null,
    "created_at": "2024-12-30T00:00:00Z"
  }
}
```

#### 2. ログイン

```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### 3. トークンリフレッシュ

```http
POST /auth/v1/token?grant_type=refresh_token
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

#### 4. ログアウト

```http
POST /auth/v1/logout
Authorization: Bearer {access_token}
```

### 認証ヘッダー

すべての認証が必要なAPIリクエストには、以下のヘッダーを含める必要があります：

```http
Authorization: Bearer {access_token}
apikey: {anon_key}
```

## エラーハンドリング

### エラーレスポンス形式

```json
{
  "error": {
    "code": "error_code",
    "message": "Human readable error message",
    "details": "Additional error details",
    "hint": "Suggestion for fixing the error"
  }
}
```

### HTTPステータスコード

| コード | 説明                         |
| ------ | ---------------------------- |
| 200    | 成功                         |
| 201    | 作成成功                     |
| 204    | 成功（レスポンスボディなし） |
| 400    | 不正なリクエスト             |
| 401    | 認証エラー                   |
| 403    | 認可エラー                   |
| 404    | リソースが見つからない       |
| 409    | 競合エラー                   |
| 422    | バリデーションエラー         |
| 429    | レート制限超過               |
| 500    | サーバーエラー               |

### 一般的なエラーコード

| エラーコード          | 説明                 |
| --------------------- | -------------------- |
| `invalid_request`     | リクエスト形式が不正 |
| `unauthorized`        | 認証が必要           |
| `forbidden`           | アクセス権限なし     |
| `not_found`           | リソースが存在しない |
| `validation_failed`   | バリデーションエラー |
| `rate_limit_exceeded` | レート制限超過       |
| `server_error`        | サーバー内部エラー   |

## レート制限

### 制限値

| エンドポイント | 制限           | 期間 |
| -------------- | -------------- | ---- |
| 認証関連       | 10回           | 1分  |
| データ取得     | 100回          | 1分  |
| データ更新     | 50回           | 1分  |
| リアルタイム   | 1000メッセージ | 1分  |

### レート制限ヘッダー

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## データモデル

### User（ユーザー）

```typescript
interface User {
  id: string; // UUID
  email: string; // メールアドレス
  display_name?: string; // 表示名
  timezone?: string; // タイムゾーン
  created_at: string; // 作成日時 (ISO 8601)
  updated_at: string; // 更新日時 (ISO 8601)
}
```

### Task（タスク）

```typescript
interface Task {
  id: string; // UUID
  user_id: string; // ユーザーID
  title: string; // タスク名
  description?: string; // 説明
  estimated_pomodoros?: number; // 予想ポモドーロ数
  completed_pomodoros: number; // 完了ポモドーロ数
  is_completed: boolean; // 完了フラグ
  priority: 'low' | 'medium' | 'high'; // 優先度
  tags: string[]; // タグ配列
  created_at: string; // 作成日時
  updated_at: string; // 更新日時
  completed_at?: string; // 完了日時
}
```

### Session（セッション）

```typescript
interface Session {
  id: string; // UUID
  user_id: string; // ユーザーID
  task_id?: string; // タスクID（任意）
  task_title?: string; // タスク名（スタンドアロン用）
  type: 'pomodoro' | 'short_break' | 'long_break'; // セッションタイプ
  mode: 'standalone' | 'task-linked'; // モード
  planned_duration: number; // 予定時間（秒）
  actual_duration: number; // 実際の時間（秒）
  completed: boolean; // 完了フラグ
  started_at: string; // 開始日時
  completed_at?: string; // 完了日時
  created_at: string; // 作成日時
}
```

### Tag（タグ）

```typescript
interface Tag {
  id: string; // UUID
  user_id: string; // ユーザーID
  name: string; // タグ名
  color: string; // 色（HEX）
  created_at: string; // 作成日時
  updated_at: string; // 更新日時
}
```

### Goal（目標）

```typescript
interface Goal {
  id: string; // UUID
  user_id: string; // ユーザーID
  type: 'daily' | 'weekly' | 'monthly'; // 期間タイプ
  metric: 'sessions' | 'minutes' | 'tasks'; // 指標
  target: number; // 目標値
  current: number; // 現在値
  period_start: string; // 期間開始日
  period_end: string; // 期間終了日
  tags?: string[]; // 対象タグ
  is_active: boolean; // アクティブフラグ
  created_at: string; // 作成日時
  updated_at: string; // 更新日時
}
```

## エンドポイント

### タスク管理

#### タスク一覧取得

```http
GET /rest/v1/tasks?select=*&order=created_at.desc
Authorization: Bearer {access_token}
```

**クエリパラメータ:**

- `select`: 取得フィールド（デフォルト: `*`）
- `order`: ソート順（例: `created_at.desc`）
- `limit`: 取得件数制限
- `offset`: オフセット
- `is_completed`: 完了状態フィルター

**レスポンス:**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "重要なタスク",
    "description": "詳細説明",
    "estimated_pomodoros": 4,
    "completed_pomodoros": 2,
    "is_completed": false,
    "priority": "high",
    "tags": ["work", "urgent"],
    "created_at": "2024-12-30T00:00:00Z",
    "updated_at": "2024-12-30T00:00:00Z"
  }
]
```

#### タスク作成

```http
POST /rest/v1/tasks
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "新しいタスク",
  "description": "タスクの説明",
  "estimated_pomodoros": 3,
  "priority": "medium",
  "tags": ["work"]
}
```

#### タスク更新

```http
PATCH /rest/v1/tasks?id=eq.{task_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "更新されたタスク",
  "is_completed": true,
  "completed_at": "2024-12-30T12:00:00Z"
}
```

#### タスク削除

```http
DELETE /rest/v1/tasks?id=eq.{task_id}
Authorization: Bearer {access_token}
```

### セッション管理

#### セッション一覧取得

```http
GET /rest/v1/sessions?select=*&order=started_at.desc
Authorization: Bearer {access_token}
```

**クエリパラメータ:**

- `started_at`: 日付範囲フィルター（例: `gte.2024-12-01`）
- `type`: セッションタイプフィルター
- `completed`: 完了状態フィルター

#### セッション作成

```http
POST /rest/v1/sessions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "task_id": "uuid",
  "type": "pomodoro",
  "mode": "task-linked",
  "planned_duration": 1500,
  "started_at": "2024-12-30T12:00:00Z"
}
```

#### セッション完了

```http
PATCH /rest/v1/sessions?id=eq.{session_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "completed": true,
  "actual_duration": 1500,
  "completed_at": "2024-12-30T12:25:00Z"
}
```

### 統計データ

#### 基本統計取得

```http
GET /rest/v1/rpc/get_user_statistics
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "start_date": "2024-12-01",
  "end_date": "2024-12-31",
  "tags": ["work"]
}
```

**レスポンス:**

```json
{
  "total_sessions": 45,
  "completed_sessions": 42,
  "total_minutes": 1125,
  "average_session_length": 25.5,
  "completion_rate": 0.93,
  "daily_breakdown": [
    {
      "date": "2024-12-30",
      "sessions": 4,
      "minutes": 100
    }
  ]
}
```

#### 目標進捗取得

```http
GET /rest/v1/goals?select=*,progress:rpc/calculate_goal_progress(goal_id)
Authorization: Bearer {access_token}
```

### タグ管理

#### タグ一覧取得

```http
GET /rest/v1/tags?select=*&order=name.asc
Authorization: Bearer {access_token}
```

#### タグ作成

```http
POST /rest/v1/tags
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "新しいタグ",
  "color": "#FF5722"
}
```

## リアルタイム機能

### WebSocket接続

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// セッション更新の監視
const subscription = supabase
  .channel('sessions')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `user_id=eq.${userId}`,
    },
    payload => {
      console.log('Session updated:', payload);
    }
  )
  .subscribe();
```

### イベントタイプ

| イベント | 説明                 |
| -------- | -------------------- |
| `INSERT` | 新しいレコードの作成 |
| `UPDATE` | 既存レコードの更新   |
| `DELETE` | レコードの削除       |

### チャンネル

| チャンネル | 対象テーブル | 用途                 |
| ---------- | ------------ | -------------------- |
| `tasks`    | tasks        | タスクの変更監視     |
| `sessions` | sessions     | セッションの変更監視 |
| `goals`    | goals        | 目標の変更監視       |

## セキュリティ

### Row Level Security (RLS)

すべてのテーブルでRLSが有効化されており、ユーザーは自分のデータのみアクセス可能です。

#### RLSポリシー例

```sql
-- タスクテーブルのRLSポリシー
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
```

### データ検証

#### サーバーサイド検証

- **必須フィールド**: NOT NULL制約
- **データ型**: 型制約とCHECK制約
- **文字列長**: 長さ制限
- **外部キー**: 参照整合性

#### クライアントサイド検証

```typescript
// タスク作成時の検証例
const validateTask = (task: Partial<Task>): ValidationResult => {
  const errors: string[] = [];

  if (!task.title || task.title.trim().length === 0) {
    errors.push('タスク名は必須です');
  }

  if (task.title && task.title.length > 255) {
    errors.push('タスク名は255文字以内で入力してください');
  }

  if (task.estimated_pomodoros && task.estimated_pomodoros < 1) {
    errors.push('予想ポモドーロ数は1以上で入力してください');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
```

### APIキー管理

#### 環境変数

```bash
# 本番環境
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 開発環境
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

#### キーの種類

| キー           | 用途           | 権限             |
| -------------- | -------------- | ---------------- |
| `anon`         | 公開API        | 認証前のアクセス |
| `service_role` | サーバーサイド | 全データアクセス |

## SDK使用例

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const supabase = createClient<Database>(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// タスク作成
const createTask = async (
  task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// セッション開始
const startSession = async (sessionData: Partial<Session>) => {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...sessionData,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

## テスト

### APIテスト例

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Tasks API', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  });

  it('should create a task', async () => {
    const taskData = {
      title: 'テストタスク',
      description: 'テスト用のタスクです',
      priority: 'medium' as const,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject(taskData);
    expect(data.id).toBeDefined();
  });
});
```

## バージョニング

### APIバージョン管理

- **現在のバージョン**: v1
- **バージョニング方式**: URLパス（`/rest/v1/`）
- **後方互換性**: 最低2バージョンをサポート
- **廃止予告**: 6ヶ月前に通知

### 変更ログ

#### v1.0.0 (2024-12-30)

- 初回リリース
- 基本的なCRUD操作
- リアルタイム同期
- 認証機能

---

_このAPI仕様書は、サービスの改善に伴い定期的に更新されます。最新版は常にこのドキュメントで確認できます。_
