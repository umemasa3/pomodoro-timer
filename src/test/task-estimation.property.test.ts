import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { DatabaseService } from '../services/database-service';
import type { Task } from '../types';

// Supabaseのモック
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

describe('タスク時間見積もり機能 - プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * プロパティ 1: 分割提案の一貫性
   * 任意のタスクにおいて、見積もりポモドーロ数が1を超える場合、
   * 分割提案は元のタスクと同じ総見積もり時間を持つ
   * 検証対象: 要件 9.2
   */
  it('プロパティ 1: 分割提案の一貫性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: undefined }),
          estimated_pomodoros: fc.integer({ min: 2, max: 10 }), // 2以上のポモドーロ数
          completed_pomodoros: fc.integer({ min: 0, max: 5 }),
          status: fc.constantFrom(
            'pending',
            'in_progress',
            'paused',
            'completed'
          ),
          priority: fc.constantFrom('low', 'medium', 'high'),
          created_at: fc.string(),
          updated_at: fc.string(),
        }),
        async (task: Task) => {
          const suggestions = await DatabaseService.suggestTaskSplit(task);

          // 分割提案が生成される
          expect(suggestions.length).toBeGreaterThan(0);

          // 分割提案の総見積もり時間が元のタスクと一致する
          const totalEstimate = suggestions.reduce(
            (sum, s) => sum + s.estimated_pomodoros,
            0
          );
          expect(totalEstimate).toBe(task.estimated_pomodoros);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 2: サブタスクの1ポモドーロ制約
   * 任意のタスク分割において、生成されるすべてのサブタスクは
   * 1ポモドーロ以内で完了可能である
   * 検証対象: 要件 9.4
   */
  it('プロパティ 2: サブタスクの1ポモドーロ制約', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: undefined }),
          estimated_pomodoros: fc.integer({ min: 1, max: 20 }),
          completed_pomodoros: fc.integer({ min: 0, max: 5 }),
          status: fc.constantFrom(
            'pending',
            'in_progress',
            'paused',
            'completed'
          ),
          priority: fc.constantFrom('low', 'medium', 'high'),
          created_at: fc.string(),
          updated_at: fc.string(),
        }),
        async (task: Task) => {
          const suggestions = await DatabaseService.suggestTaskSplit(task);

          // すべてのサブタスクが1ポモドーロ以内
          suggestions.forEach(suggestion => {
            expect(suggestion.estimated_pomodoros).toBeLessThanOrEqual(1);
            expect(suggestion.estimated_pomodoros).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 3: 分割閾値の一貫性
   * 任意のタスクにおいて、見積もりポモドーロ数が1以下の場合、
   * 分割提案は生成されない
   * 検証対象: 要件 9.2
   */
  it('プロパティ 3: 分割閾値の一貫性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: undefined }),
          estimated_pomodoros: fc.constantFrom(1), // 1ポモドーロのみ
          completed_pomodoros: fc.integer({ min: 0, max: 1 }),
          status: fc.constantFrom(
            'pending',
            'in_progress',
            'paused',
            'completed'
          ),
          priority: fc.constantFrom('low', 'medium', 'high'),
          created_at: fc.string(),
          updated_at: fc.string(),
        }),
        async (task: Task) => {
          const suggestions = await DatabaseService.suggestTaskSplit(task);

          // 1ポモドーロのタスクは分割提案されない
          expect(suggestions).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 4: 分割タスクのタイトル生成
   * 任意のタスクの分割において、生成されるサブタスクのタイトルは
   * 元のタスクタイトルを含み、一意である
   * 検証対象: 要件 9.3
   */
  it('プロパティ 4: 分割タスクのタイトル生成', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: undefined }),
          estimated_pomodoros: fc.integer({ min: 2, max: 10 }),
          completed_pomodoros: fc.integer({ min: 0, max: 5 }),
          status: fc.constantFrom(
            'pending',
            'in_progress',
            'paused',
            'completed'
          ),
          priority: fc.constantFrom('low', 'medium', 'high'),
          created_at: fc.string(),
          updated_at: fc.string(),
        }),
        async (task: Task) => {
          const suggestions = await DatabaseService.suggestTaskSplit(task);

          // すべてのサブタスクタイトルが元のタスクタイトルを含む
          suggestions.forEach(suggestion => {
            expect(suggestion.title).toContain(task.title);
          });

          // すべてのサブタスクタイトルが一意である
          const titles = suggestions.map(s => s.title);
          const uniqueTitles = new Set(titles);
          expect(uniqueTitles.size).toBe(titles.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 5: 分割実行の冪等性
   * 任意の有効なサブタスクリストにおいて、分割実行は
   * 指定されたサブタスクと同じ数のタスクを生成する
   * 検証対象: 要件 9.3
   */
  it('プロパティ 5: 分割実行の冪等性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string(),
          user_id: fc.string(),
          title: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: undefined }),
          estimated_pomodoros: fc.integer({ min: 2, max: 10 }),
          completed_pomodoros: fc.integer({ min: 0, max: 5 }),
          status: fc.constantFrom(
            'pending',
            'in_progress',
            'paused',
            'completed'
          ),
          priority: fc.constantFrom('low', 'medium', 'high'),
          created_at: fc.string(),
          updated_at: fc.string(),
        }),
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1 }),
            estimated_pomodoros: fc.constantFrom(1), // 1ポモドーロ固定
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (
          task: Task,
          subtasks: Array<{ title: string; estimated_pomodoros: number }>
        ) => {
          // モックの戻り値を設定
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vi.mocked(DatabaseService as any).createTask = vi
            .fn()
            .mockImplementation(createRequest =>
              Promise.resolve({
                ...task,
                id: `mock-id-${Math.random()}`,
                title: createRequest.title, // 実際に渡されたタイトルを使用
                estimated_pomodoros: createRequest.estimated_pomodoros,
              })
            );

          const result = await DatabaseService.splitTask(task, subtasks);

          // 生成されたタスク数が入力されたサブタスク数と一致
          expect(result.length).toBe(subtasks.length);

          // 各生成されたタスクが対応するサブタスクの属性を持つ
          result.forEach((createdTask, index) => {
            expect(createdTask.title).toBe(subtasks[index].title.trim()); // trimを適用
            expect(createdTask.estimated_pomodoros).toBe(
              subtasks[index].estimated_pomodoros
            );
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
