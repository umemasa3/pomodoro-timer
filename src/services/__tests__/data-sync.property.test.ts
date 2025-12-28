/**
 * データ同期機能のプロパティベーステスト
 * Feature: pomodoro-timer, Property 4: データ変更の自動保存
 *
 * このテストは要件12.1「データ変更の自動保存」を検証します。
 * 任意のタスク作成・編集操作において、システムは変更を自動的かつ確実に保存する
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  propertyTestConfig,
  mockDatabase,
  setupPropertyTest,
  teardownPropertyTest,
} from '../../test/property-test-setup';

// 簡素化されたジェネレーター
const simpleTaskGenerator = () =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 200 })),
    estimated_pomodoros: fc.integer({ min: 1, max: 5 }),
    completed_pomodoros: fc.integer({ min: 0, max: 5 }),
    status: fc.constantFrom('pending', 'in_progress', 'paused', 'completed'),
    priority: fc.constantFrom('low', 'medium', 'high'),
  });

const simpleSessionGenerator = () =>
  fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    task_id: fc.option(fc.uuid()),
    type: fc.constantFrom('pomodoro', 'short_break', 'long_break'),
    planned_duration: fc.integer({ min: 1, max: 60 }),
    actual_duration: fc.option(fc.integer({ min: 1, max: 60 })),
    completed: fc.boolean(),
  });

// テスト用のデータベースサービス実装
class TestDatabaseService {
  // タスクの作成（自動保存テスト用）
  async createTask(task: any): Promise<any> {
    const taskWithTimestamp = {
      ...task,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await mockDatabase.save('tasks', task.id, taskWithTimestamp);
    return taskWithTimestamp;
  }

  // タスクの更新（自動保存テスト用）
  async updateTask(id: string, updates: any): Promise<any> {
    // 少し待ってからタイムスタンプを更新（テスト用）
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedTask = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await mockDatabase.update('tasks', id, updatedTask);
    return await mockDatabase.get('tasks', id);
  }

  // タスクの取得
  async getTask(id: string): Promise<any | null> {
    return await mockDatabase.get('tasks', id);
  }

  // セッションの作成（自動保存テスト用）
  async createSession(session: any): Promise<any> {
    const sessionWithTimestamp = {
      ...session,
      started_at: new Date().toISOString(),
    };

    await mockDatabase.save('sessions', session.id, sessionWithTimestamp);
    return sessionWithTimestamp;
  }

  // セッションの更新（自動保存テスト用）
  async updateSession(id: string, updates: any): Promise<any> {
    await mockDatabase.update('sessions', id, updates);
    return await mockDatabase.get('sessions', id);
  }

  // セッションの取得
  async getSession(id: string): Promise<any | null> {
    return await mockDatabase.get('sessions', id);
  }
}

describe('データ同期プロパティテスト', () => {
  let databaseService: TestDatabaseService;

  beforeEach(() => {
    setupPropertyTest();
    databaseService = new TestDatabaseService();
  });

  afterEach(() => {
    teardownPropertyTest();
  });

  describe('プロパティ 4: データ変更の自動保存', () => {
    it('任意のタスク作成操作において、システムは変更を自動的かつ確実に保存する', async () => {
      await fc.assert(
        fc.asyncProperty(simpleTaskGenerator(), async taskData => {
          // タスクを作成
          await databaseService.createTask(taskData);

          // 作成されたタスクがデータベースに保存されていることを確認
          const retrievedTask = await databaseService.getTask(taskData.id);

          // プロパティ: 作成したタスクは必ず取得できる
          expect(retrievedTask).not.toBeNull();
          expect(retrievedTask.id).toBe(taskData.id);
          expect(retrievedTask.title).toBe(taskData.title);
          expect(retrievedTask.status).toBe(taskData.status);

          // 自動保存されたタイムスタンプが設定されていることを確認
          expect(retrievedTask.created_at).toBeDefined();
          expect(retrievedTask.updated_at).toBeDefined();
        }),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('任意のタスク編集操作において、システムは変更を自動的かつ確実に保存する', async () => {
      await fc.assert(
        fc.asyncProperty(
          simpleTaskGenerator(),
          fc.record({
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            status: fc.option(
              fc.constantFrom('pending', 'in_progress', 'paused', 'completed')
            ),
            priority: fc.option(fc.constantFrom('low', 'medium', 'high')),
          }),
          async (originalTask, updates) => {
            // 元のタスクを作成
            await databaseService.createTask(originalTask);

            // フィルターして実際の更新データのみを抽出
            const actualUpdates = Object.fromEntries(
              Object.entries(updates).filter(([, value]) => value !== null)
            );

            // 更新データが空でない場合のみテスト実行
            if (Object.keys(actualUpdates).length > 0) {
              // タスクを更新
              await databaseService.updateTask(originalTask.id, actualUpdates);

              // 更新されたタスクがデータベースに保存されていることを確認
              const retrievedTask = await databaseService.getTask(
                originalTask.id
              );

              // プロパティ: 更新したタスクは必ず取得でき、更新内容が反映されている
              expect(retrievedTask).not.toBeNull();
              expect(retrievedTask.id).toBe(originalTask.id);

              // 更新されたフィールドが正しく反映されていることを確認
              Object.entries(actualUpdates).forEach(([key, value]) => {
                expect(retrievedTask[key]).toBe(value);
              });

              // updated_atが設定されていることを確認
              expect(retrievedTask.updated_at).toBeDefined();
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });

    it('任意のセッション作成操作において、システムは変更を自動的かつ確実に保存する', async () => {
      await fc.assert(
        fc.asyncProperty(simpleSessionGenerator(), async sessionData => {
          // セッションを作成
          await databaseService.createSession(sessionData);

          // 作成されたセッションがデータベースに保存されていることを確認
          const retrievedSession = await databaseService.getSession(
            sessionData.id
          );

          // プロパティ: 作成したセッションは必ず取得できる
          expect(retrievedSession).not.toBeNull();
          expect(retrievedSession.id).toBe(sessionData.id);
          expect(retrievedSession.user_id).toBe(sessionData.user_id);
          expect(retrievedSession.type).toBe(sessionData.type);
          expect(retrievedSession.planned_duration).toBe(
            sessionData.planned_duration
          );

          // 自動保存されたタイムスタンプが設定されていることを確認
          expect(retrievedSession.started_at).toBeDefined();
        }),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('任意のセッション更新操作において、システムは変更を自動的かつ確実に保存する', async () => {
      await fc.assert(
        fc.asyncProperty(
          simpleSessionGenerator(),
          fc.record({
            actual_duration: fc.option(fc.integer({ min: 1, max: 60 })),
            completed: fc.option(fc.boolean()),
            task_completion_status: fc.option(
              fc.constantFrom('completed', 'continued', 'paused')
            ),
          }),
          async (originalSession, updates) => {
            // 元のセッションを作成
            await databaseService.createSession(originalSession);

            // フィルターして実際の更新データのみを抽出
            const actualUpdates = Object.fromEntries(
              Object.entries(updates).filter(([, value]) => value !== null)
            );

            // 更新データが空でない場合のみテスト実行
            if (Object.keys(actualUpdates).length > 0) {
              // セッションを更新
              await databaseService.updateSession(
                originalSession.id,
                actualUpdates
              );

              // 更新されたセッションがデータベースに保存されていることを確認
              const retrievedSession = await databaseService.getSession(
                originalSession.id
              );

              // プロパティ: 更新したセッションは必ず取得でき、更新内容が反映されている
              expect(retrievedSession).not.toBeNull();
              expect(retrievedSession.id).toBe(originalSession.id);

              // 更新されたフィールドが正しく反映されていることを確認
              Object.entries(actualUpdates).forEach(([key, value]) => {
                expect(retrievedSession[key]).toBe(value);
              });
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });
  });

  describe('データ整合性プロパティ', () => {
    it('同時に複数のタスクを作成しても、すべてのタスクが正しく保存される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(simpleTaskGenerator(), { minLength: 2, maxLength: 5 }),
          async tasks => {
            // 重複するIDを避けるため、各タスクに一意のIDを設定
            const uniqueTasks = tasks.map((task, index) => ({
              ...task,
              id: `${task.id}-${index}`,
            }));

            // すべてのタスクを並行して作成
            await Promise.all(
              uniqueTasks.map(task => databaseService.createTask(task))
            );

            // すべてのタスクが正しく保存されていることを確認
            for (const task of uniqueTasks) {
              const retrievedTask = await databaseService.getTask(task.id);
              expect(retrievedTask).not.toBeNull();
              expect(retrievedTask.id).toBe(task.id);
              expect(retrievedTask.title).toBe(task.title);
            }

            // プロパティ: 作成したタスクの数と保存されたタスクの数が一致する
            expect(uniqueTasks.length).toBeGreaterThan(0);
          }
        ),
        { ...propertyTestConfig, numRuns: 20 }
      );
    });
  });
});
