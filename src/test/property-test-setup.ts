/**
 * プロパティベーステスト用のセットアップファイル
 * fast-checkライブラリの設定とテスト用ユーティリティを提供
 */

import { fc } from '@fast-check/vitest';

// プロパティテストのグローバル設定
export const propertyTestConfig = {
  numRuns: 100, // 最小実行回数
  timeout: 5000, // タイムアウト設定（5秒）
  seed: Math.random(), // 再現可能性のためのシード
  verbose: true, // 詳細なログ出力
};

// テスト用のデータジェネレーター
export const generators = {
  // ユーザーIDジェネレーター
  userId: () => fc.uuid(),

  // タスクデータジェネレーター
  task: () =>
    fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 255 }),
      description: fc.option(fc.string({ maxLength: 1000 })),
      estimated_pomodoros: fc.integer({ min: 1, max: 10 }),
      completed_pomodoros: fc.integer({ min: 0, max: 10 }),
      status: fc.constantFrom('pending', 'in_progress', 'paused', 'completed'),
      priority: fc.constantFrom('low', 'medium', 'high'),
      created_at: fc
        .date({
          min: new Date('2020-01-01T00:00:00.000Z'),
          max: new Date('2030-12-31T23:59:59.999Z'),
        })
        .map(d => d.toISOString()),
      updated_at: fc
        .date({
          min: new Date('2020-01-01T00:00:00.000Z'),
          max: new Date('2030-12-31T23:59:59.999Z'),
        })
        .map(d => d.toISOString()),
    }),

  // セッションデータジェネレーター
  session: () =>
    fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      task_id: fc.option(fc.uuid()),
      type: fc.constantFrom('pomodoro', 'short_break', 'long_break'),
      planned_duration: fc.integer({ min: 1, max: 60 }),
      actual_duration: fc.option(fc.integer({ min: 1, max: 60 })),
      completed: fc.boolean(),
      started_at: fc
        .date({
          min: new Date('2020-01-01T00:00:00.000Z'),
          max: new Date('2030-12-31T23:59:59.999Z'),
        })
        .map(d => d.toISOString()),
      completed_at: fc.option(
        fc
          .date({
            min: new Date('2020-01-01T00:00:00.000Z'),
            max: new Date('2030-12-31T23:59:59.999Z'),
          })
          .map(d => d.toISOString())
      ),
      task_completion_status: fc.option(
        fc.constantFrom('completed', 'continued', 'paused')
      ),
    }),

  // タグデータジェネレーター
  tag: () =>
    fc.record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      color: fc
        .string({ minLength: 6, maxLength: 6 })
        .filter(str => /^[0-9A-Fa-f]{6}$/.test(str))
        .map((hex: string) => `#${hex}`),
      usage_count: fc.integer({ min: 0, max: 1000 }),
      created_at: fc
        .date({
          min: new Date('2020-01-01T00:00:00.000Z'),
          max: new Date('2030-12-31T23:59:59.999Z'),
        })
        .map(d => d.toISOString()),
    }),

  // ユーザー設定ジェネレーター
  userSettings: () =>
    fc.record({
      pomodoro_minutes: fc.integer({ min: 15, max: 60 }),
      short_break_minutes: fc.integer({ min: 3, max: 10 }),
      long_break_minutes: fc.integer({ min: 10, max: 30 }),
      sessions_until_long_break: fc.integer({ min: 2, max: 8 }),
      sound_enabled: fc.boolean(),
      sound_type: fc.constantFrom('bell', 'chime', 'notification'),
      theme: fc.constantFrom('light', 'dark', 'auto'),
    }),
};

// テスト用のモックデータベース操作
export class MockDatabase {
  private data: Map<string, any> = new Map();
  private changeListeners: Array<(change: any) => void> = [];

  // データの保存
  async save(table: string, id: string, data: any): Promise<void> {
    const key = `${table}:${id}`;
    this.data.set(key, { ...data, id });

    // 変更通知
    this.notifyChange({
      table,
      eventType: 'INSERT',
      new: { ...data, id },
    });
  }

  // データの更新
  async update(table: string, id: string, updates: any): Promise<void> {
    const key = `${table}:${id}`;
    const existing = this.data.get(key);
    if (!existing) {
      throw new Error(`Record not found: ${key}`);
    }

    const updated = { ...existing, ...updates };
    this.data.set(key, updated);

    // 変更通知
    this.notifyChange({
      table,
      eventType: 'UPDATE',
      old: existing,
      new: updated,
    });
  }

  // データの取得
  async get(table: string, id: string): Promise<any | null> {
    const key = `${table}:${id}`;
    return this.data.get(key) || null;
  }

  // データの削除
  async delete(table: string, id: string): Promise<void> {
    const key = `${table}:${id}`;
    const existing = this.data.get(key);
    if (existing) {
      this.data.delete(key);

      // 変更通知
      this.notifyChange({
        table,
        eventType: 'DELETE',
        old: existing,
      });
    }
  }

  // 変更リスナーの追加
  addChangeListener(listener: (change: any) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  // 変更通知
  private notifyChange(change: any): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(change);
      } catch (error) {
        console.error('Change listener error:', error);
      }
    });
  }

  // データベースのクリア
  clear(): void {
    this.data.clear();
    this.changeListeners.length = 0;
  }

  // 全データの取得（テスト用）
  getAllData(): Map<string, any> {
    return new Map(this.data);
  }
}

// グローバルなモックデータベースインスタンス
export const mockDatabase = new MockDatabase();

// テスト前後のクリーンアップ
export function setupPropertyTest() {
  mockDatabase.clear();
}

export function teardownPropertyTest() {
  mockDatabase.clear();
}
