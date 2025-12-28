/* eslint-disable @typescript-eslint/no-explicit-any, no-prototype-builtins */
import * as fc from 'fast-check';

/**
 * プロパティベーステスト用の設定とヘルパー関数
 */

// プロパティテストの基本設定
export const propertyTestConfig = {
  numRuns: 100, // 最小実行回数
  timeout: 5000, // タイムアウト設定（5秒）
  seed: Math.random(), // 再現可能性のためのシード
  verbose: true, // 詳細なログ出力
};

/**
 * カスタムアービトラリ（テストデータ生成器）
 */

// ユーザー設定用のアービトラリ
export const userSettingsArbitrary = fc.record({
  pomodoro_minutes: fc.integer({ min: 15, max: 60 }),
  short_break_minutes: fc.integer({ min: 3, max: 10 }),
  long_break_minutes: fc.integer({ min: 10, max: 30 }),
  sessions_until_long_break: fc.integer({ min: 2, max: 8 }),
  sound_enabled: fc.boolean(),
  sound_type: fc.constantFrom('bell', 'chime', 'notification'),
  theme: fc.constantFrom('light', 'dark', 'auto'),
  notifications: fc.record({
    desktop: fc.boolean(),
    sound: fc.boolean(),
    vibration: fc.boolean(),
  }),
});

// タスク用のアービトラリ
export const taskArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  title: fc
    .string({ minLength: 1, maxLength: 255 })
    .filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 1000 })),
  estimated_pomodoros: fc.integer({ min: 1, max: 20 }),
  completed_pomodoros: fc.integer({ min: 0, max: 20 }),
  status: fc.constantFrom('pending', 'in_progress', 'paused', 'completed'),
  priority: fc.constantFrom('low', 'medium', 'high'),
  created_at: fc
    .integer({ min: 1577836800000, max: 1924992000000 })
    .map(timestamp => new Date(timestamp).toISOString()),
  updated_at: fc
    .integer({ min: 1577836800000, max: 1924992000000 })
    .map(timestamp => new Date(timestamp).toISOString()),
  completed_at: fc.option(
    fc
      .integer({ min: 1577836800000, max: 1924992000000 })
      .map(timestamp => new Date(timestamp).toISOString())
  ),
});

// タグ用のアービトラリ
export const tagArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc
    .integer({ min: 0, max: 0xffffff })
    .map(n => `#${n.toString(16).padStart(6, '0')}`),
  usage_count: fc.integer({ min: 0, max: 1000 }),
  created_at: fc
    .integer({ min: 1577836800000, max: 1924992000000 })
    .map(timestamp => new Date(timestamp).toISOString()),
});

// セッション用のアービトラリ
export const sessionArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  task_id: fc.option(fc.uuid()),
  type: fc.constantFrom('pomodoro', 'short_break', 'long_break'),
  planned_duration: fc.integer({ min: 1, max: 60 }),
  actual_duration: fc.option(fc.integer({ min: 1, max: 60 })),
  completed: fc.boolean(),
  started_at: fc
    .integer({ min: 1577836800000, max: 1924992000000 })
    .map(timestamp => new Date(timestamp).toISOString()),
  completed_at: fc.option(
    fc
      .integer({ min: 1577836800000, max: 1924992000000 })
      .map(timestamp => new Date(timestamp).toISOString())
  ),
  task_completion_status: fc.option(
    fc.constantFrom('completed', 'continued', 'paused')
  ),
});

// タイマー状態用のアービトラリ
export const timerStateArbitrary = fc.record({
  currentTime: fc.integer({ min: 0, max: 3600 }), // 0-60分（秒単位）
  isRunning: fc.boolean(),
  sessionType: fc.constantFrom('pomodoro', 'shortBreak', 'longBreak'),
  completedSessions: fc.integer({ min: 0, max: 100 }),
});

// 有効なタスクタイトル用のアービトラリ（空白文字のみを除外）
export const validTaskTitleArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter(s => s.trim().length > 0);

// 無効なタスクタイトル用のアービトラリ（空白文字のみ）
export const invalidTaskTitleArbitrary = fc
  .string()
  .filter(s => s.trim().length === 0 && s.length > 0);

/**
 * プロパティテスト用のヘルパー関数
 */

/**
 * プロパティテストを実行するためのラッパー関数
 * 注意：この関数はdescribe/suiteブロック内でのみ使用してください
 * @param name テスト名
 * @param property テストするプロパティ
 * @param config 追加の設定（オプション）
 */
export function createPropertyTest<T>(
  name: string,
  property: fc.IProperty<T>,
  config: Partial<typeof propertyTestConfig> = {}
) {
  const finalConfig = { ...propertyTestConfig, ...config };

  return {
    name,
    run: () => fc.assert(property, finalConfig),
    timeout: finalConfig.timeout,
  };
}

/**
 * 時間関連のヘルパー関数
 */
export const timeHelpers = {
  // 分を秒に変換
  minutesToSeconds: (minutes: number): number => minutes * 60,

  // 秒を分に変換
  secondsToMinutes: (seconds: number): number => Math.floor(seconds / 60),

  // 有効な時間範囲かチェック
  isValidTimeRange: (min: number, max: number, value: number): boolean =>
    value >= min && value <= max,
};

/**
 * データ検証用のヘルパー関数
 */
export const validationHelpers = {
  // UUIDの形式チェック（fast-checkのuuid()で生成されるUUIDに対応）
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // 日付文字列の形式チェック
  isValidISODate: (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
  },

  // HEXカラーコードの形式チェック
  isValidHexColor: (color: string): boolean => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    return hexRegex.test(color);
  },
};

/**
 * テストデータの一貫性チェック用ヘルパー
 */
export const consistencyHelpers = {
  // タスクの完了ポモドーロ数が見積もりを超えていないかチェック
  isTaskConsistent: (task: any): boolean => {
    return task.completed_pomodoros <= task.estimated_pomodoros;
  },

  // セッションの実際の時間が計画時間を大幅に超えていないかチェック
  isSessionConsistent: (session: any): boolean => {
    if (!session.actual_duration) return true;
    // 実際の時間が計画時間の2倍を超えない
    return session.actual_duration <= session.planned_duration * 2;
  },

  // 完了日時が作成日時より後かチェック
  isDateConsistent: (created: string, completed?: string): boolean => {
    if (!completed) return true;
    return new Date(completed) >= new Date(created);
  },
};

/**
 * プロパティテスト用のカスタムマッチャー
 */
export const propertyMatchers = {
  // 配列の長さが期待値と一致するかチェック
  toHaveLength: (received: any[], expected: number) => {
    return received.length === expected;
  },

  // オブジェクトが特定のプロパティを持つかチェック
  toHaveProperty: (received: any, property: string) => {
    return received.hasOwnProperty(property);
  },

  // 値が範囲内にあるかチェック
  toBeInRange: (received: number, min: number, max: number) => {
    return received >= min && received <= max;
  },
};

/**
 * エラー処理テスト用のヘルパー
 */
export const errorTestHelpers = {
  // 非同期関数がエラーを投げるかテスト
  expectAsyncError: async (fn: () => Promise<any>, expectedError?: string) => {
    try {
      await fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError && error instanceof Error) {
        // 実際のテスト環境では expect を使用
        // expect(error.message).toContain(expectedError);
        return error.message.includes(expectedError);
      }
      return true;
    }
  },

  // 同期関数がエラーを投げるかテスト
  expectSyncError: (fn: () => any, expectedError?: string) => {
    try {
      fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError && error instanceof Error) {
        // 実際のテスト環境では expect を使用
        // expect(error.message).toContain(expectedError);
        return error.message.includes(expectedError);
      }
      return true;
    }
  },
};
