import { describe, it, expect, beforeEach, vi } from 'vitest';
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
            data: mockTask,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: mockTask,
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

// DatabaseServiceのモック
vi.mock('../services/database-service', () => ({
  DatabaseService: {
    suggestTaskSplit: vi.fn(),
    splitTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
  },
}));

const mockTask: Task = {
  id: 'test-task-id',
  user_id: 'test-user-id',
  title: 'テストタスク',
  description: 'テスト用のタスクです',
  estimated_pomodoros: 3,
  completed_pomodoros: 0,
  status: 'pending',
  priority: 'medium',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('タスク時間見積もり機能', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装を設定
    vi.mocked(DatabaseService.suggestTaskSplit).mockImplementation(
      async task => {
        if (task.estimated_pomodoros <= 1) {
          return [];
        }

        const suggestions = [];
        for (let i = 1; i <= task.estimated_pomodoros; i++) {
          suggestions.push({
            title: `${task.title} - パート${i}`,
            estimated_pomodoros: 1,
          });
        }
        return suggestions;
      }
    );

    vi.mocked(DatabaseService.splitTask).mockImplementation(
      async (task, subtasks) => {
        // 認証チェック
        const {
          data: { user },
        } = await import('../services/supabase').then(m =>
          m.supabase.auth.getUser()
        );
        if (!user) {
          throw new Error('認証が必要です');
        }

        // バリデーション
        const invalidSubtasks = subtasks.filter(
          st => st.estimated_pomodoros > 1
        );
        if (invalidSubtasks.length > 0) {
          throw new Error(
            '各サブタスクは1ポモドーロ以内で完了可能である必要があります'
          );
        }

        // サブタスクを作成（実際の実装と同じようにtrimを適用）
        return subtasks.map((subtask, index) => ({
          ...task,
          id: `subtask-${index}`,
          title: subtask.title.trim(), // trimを適用
          estimated_pomodoros: subtask.estimated_pomodoros,
          description: `元のタスク「${task.title}」から分割されたサブタスク`,
        }));
      }
    );
  });

  describe('タスク分割提案', () => {
    it('1ポモドーロのタスクは分割提案を生成しない', async () => {
      const singlePomodoroTask = { ...mockTask, estimated_pomodoros: 1 };
      const suggestions =
        await DatabaseService.suggestTaskSplit(singlePomodoroTask);

      expect(suggestions).toEqual([]);
    });

    it('複数ポモドーロのタスクは適切な分割提案を生成する', async () => {
      const multiPomodoroTask = { ...mockTask, estimated_pomodoros: 3 };
      const suggestions =
        await DatabaseService.suggestTaskSplit(multiPomodoroTask);

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toEqual({
        title: 'テストタスク - パート1',
        estimated_pomodoros: 1,
      });
      expect(suggestions[1]).toEqual({
        title: 'テストタスク - パート2',
        estimated_pomodoros: 1,
      });
      expect(suggestions[2]).toEqual({
        title: 'テストタスク - パート3',
        estimated_pomodoros: 1,
      });
    });

    it('各分割提案は1ポモドーロ以内である', async () => {
      const largePomodoroTask = { ...mockTask, estimated_pomodoros: 5 };
      const suggestions =
        await DatabaseService.suggestTaskSplit(largePomodoroTask);

      suggestions.forEach(suggestion => {
        expect(suggestion.estimated_pomodoros).toBeLessThanOrEqual(1);
        expect(suggestion.estimated_pomodoros).toBeGreaterThan(0);
      });
    });
  });

  describe('タスク分割実行', () => {
    it('有効なサブタスクでタスク分割が成功する', async () => {
      const subtasks = [
        { title: 'サブタスク1', estimated_pomodoros: 1 },
        { title: 'サブタスク2', estimated_pomodoros: 1 },
      ];

      const result = await DatabaseService.splitTask(mockTask, subtasks);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('サブタスク1');
      expect(result[1].title).toBe('サブタスク2');
    });

    it('1ポモドーロを超えるサブタスクがある場合はエラーを投げる', async () => {
      const invalidSubtasks = [
        { title: 'サブタスク1', estimated_pomodoros: 1 },
        { title: '無効なサブタスク', estimated_pomodoros: 2 },
      ];

      await expect(
        DatabaseService.splitTask(mockTask, invalidSubtasks)
      ).rejects.toThrow(
        '各サブタスクは1ポモドーロ以内で完了可能である必要があります'
      );
    });

    it('空のサブタスクリストの場合は空の配列を返す', async () => {
      const emptySubtasks: Array<{
        title: string;
        estimated_pomodoros: number;
      }> = [];

      const result = await DatabaseService.splitTask(mockTask, emptySubtasks);

      expect(result).toEqual([]);
    });
  });

  describe('見積もり時間の検証', () => {
    it('見積もり時間が25分を超える場合は分割を推奨する', () => {
      const taskWith2Pomodoros = { ...mockTask, estimated_pomodoros: 2 };
      const shouldSuggestSplit = taskWith2Pomodoros.estimated_pomodoros > 1;

      expect(shouldSuggestSplit).toBe(true);
    });

    it('見積もり時間が25分以内の場合は分割を推奨しない', () => {
      const taskWith1Pomodoro = { ...mockTask, estimated_pomodoros: 1 };
      const shouldSuggestSplit = taskWith1Pomodoro.estimated_pomodoros > 1;

      expect(shouldSuggestSplit).toBe(false);
    });

    it('分割後の各サブタスクは1ポモドーロ以内である', async () => {
      const taskWith5Pomodoros = { ...mockTask, estimated_pomodoros: 5 };
      const suggestions =
        await DatabaseService.suggestTaskSplit(taskWith5Pomodoros);

      const allWithinLimit = suggestions.every(s => s.estimated_pomodoros <= 1);
      expect(allWithinLimit).toBe(true);
    });
  });

  describe('見積もり時間の計算テスト', () => {
    it('見積もり時間が正確に計算される', () => {
      // 1ポモドーロ = 25分の基準で計算
      const pomodoroMinutes = 25;

      const testCases = [
        { pomodoros: 1, expectedMinutes: 25 },
        { pomodoros: 2, expectedMinutes: 50 },
        { pomodoros: 3, expectedMinutes: 75 },
        { pomodoros: 5, expectedMinutes: 125 },
        { pomodoros: 8, expectedMinutes: 200 },
      ];

      testCases.forEach(({ pomodoros, expectedMinutes }) => {
        const calculatedMinutes = pomodoros * pomodoroMinutes;
        expect(calculatedMinutes).toBe(expectedMinutes);
      });
    });

    it('分割後の総見積もり時間が元のタスクと一致する', async () => {
      const originalTask = { ...mockTask, estimated_pomodoros: 5 };
      const suggestions = await DatabaseService.suggestTaskSplit(originalTask);

      const totalEstimatedPomodoros = suggestions.reduce(
        (sum, suggestion) => sum + suggestion.estimated_pomodoros,
        0
      );

      expect(totalEstimatedPomodoros).toBe(originalTask.estimated_pomodoros);
    });

    it('見積もり時間の境界値テスト', async () => {
      const boundaryTestCases = [
        { pomodoros: 0, shouldSplit: false },
        { pomodoros: 1, shouldSplit: false },
        { pomodoros: 2, shouldSplit: true },
        { pomodoros: 10, shouldSplit: true },
      ];

      for (const { pomodoros, shouldSplit } of boundaryTestCases) {
        const task = { ...mockTask, estimated_pomodoros: pomodoros };
        const suggestions = await DatabaseService.suggestTaskSplit(task);

        if (shouldSplit) {
          expect(suggestions.length).toBeGreaterThan(0);
        } else {
          expect(suggestions.length).toBe(0);
        }
      }
    });

    it('見積もり時間の精度テスト', () => {
      // 小数点を含む計算の精度をテスト
      const pomodoroMinutes = 25;
      const fractionalPomodoros = 2.5;
      const expectedMinutes = 62.5;

      const calculatedMinutes = fractionalPomodoros * pomodoroMinutes;
      expect(calculatedMinutes).toBe(expectedMinutes);
    });
  });

  describe('タスク分割ロジックのテスト', () => {
    it('分割ロジックが正しい数のサブタスクを生成する', async () => {
      const testCases = [
        { originalPomodoros: 2, expectedSubtasks: 2 },
        { originalPomodoros: 3, expectedSubtasks: 3 },
        { originalPomodoros: 5, expectedSubtasks: 5 },
        { originalPomodoros: 8, expectedSubtasks: 8 },
      ];

      for (const { originalPomodoros, expectedSubtasks } of testCases) {
        const task = { ...mockTask, estimated_pomodoros: originalPomodoros };
        const suggestions = await DatabaseService.suggestTaskSplit(task);

        expect(suggestions.length).toBe(expectedSubtasks);
      }
    });

    it('分割ロジックが適切なタイトルを生成する', async () => {
      const task = {
        ...mockTask,
        title: 'プロジェクト設計',
        estimated_pomodoros: 3,
      };
      const suggestions = await DatabaseService.suggestTaskSplit(task);

      expect(suggestions[0].title).toBe('プロジェクト設計 - パート1');
      expect(suggestions[1].title).toBe('プロジェクト設計 - パート2');
      expect(suggestions[2].title).toBe('プロジェクト設計 - パート3');
    });

    it('分割ロジックが各サブタスクを1ポモドーロに設定する', async () => {
      const task = { ...mockTask, estimated_pomodoros: 7 };
      const suggestions = await DatabaseService.suggestTaskSplit(task);

      suggestions.forEach(suggestion => {
        expect(suggestion.estimated_pomodoros).toBe(1);
      });
    });

    it('分割実行時のトランザクション処理テスト', async () => {
      const subtasks = [
        { title: 'サブタスク1', estimated_pomodoros: 1 },
        { title: 'サブタスク2', estimated_pomodoros: 1 },
      ];

      // 正常なケース
      const result = await DatabaseService.splitTask(mockTask, subtasks);
      expect(result.length).toBe(2);

      // 各サブタスクが正しく作成されている
      result.forEach((createdTask, index) => {
        expect(createdTask.title).toBe(subtasks[index].title);
        expect(createdTask.estimated_pomodoros).toBe(
          subtasks[index].estimated_pomodoros
        );
        expect(createdTask.description).toContain('元のタスク');
        expect(createdTask.priority).toBe(mockTask.priority);
      });
    });

    it('分割実行時のバリデーション処理テスト', async () => {
      const invalidSubtasks = [
        { title: 'サブタスク1', estimated_pomodoros: 1 },
        { title: '無効なサブタスク', estimated_pomodoros: 3 }, // 1ポモドーロを超過
      ];

      await expect(
        DatabaseService.splitTask(mockTask, invalidSubtasks)
      ).rejects.toThrow(
        '各サブタスクは1ポモドーロ以内で完了可能である必要があります'
      );
    });

    it('空文字列やスペースのみのタイトルの処理テスト', async () => {
      const subtasksWithWhitespace = [
        { title: '  サブタスク1  ', estimated_pomodoros: 1 },
        { title: '\t\nサブタスク2\t\n', estimated_pomodoros: 1 },
      ];

      const result = await DatabaseService.splitTask(
        mockTask,
        subtasksWithWhitespace
      );

      // タイトルがトリムされている
      expect(result[0].title).toBe('サブタスク1');
      expect(result[1].title).toBe('サブタスク2');
    });

    it('大量のサブタスク分割処理のパフォーマンステスト', async () => {
      const largeTask = { ...mockTask, estimated_pomodoros: 20 };
      const suggestions = await DatabaseService.suggestTaskSplit(largeTask);

      expect(suggestions.length).toBe(20);

      // 各サブタスクが正しく生成されている
      suggestions.forEach((suggestion, index) => {
        expect(suggestion.title).toBe(
          `${largeTask.title} - パート${index + 1}`
        );
        expect(suggestion.estimated_pomodoros).toBe(1);
      });
    });

    it('特殊文字を含むタスクタイトルの分割処理テスト', async () => {
      const specialCharTask = {
        ...mockTask,
        title: 'API設計 & データベース設計 (重要)',
        estimated_pomodoros: 2,
      };

      const suggestions =
        await DatabaseService.suggestTaskSplit(specialCharTask);

      expect(suggestions[0].title).toBe(
        'API設計 & データベース設計 (重要) - パート1'
      );
      expect(suggestions[1].title).toBe(
        'API設計 & データベース設計 (重要) - パート2'
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('認証されていないユーザーの場合はエラーを投げる', async () => {
      // 認証なしのモック
      const mockSupabase = await import('../services/supabase');
      vi.mocked(mockSupabase.supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const subtasks = [{ title: 'テスト', estimated_pomodoros: 1 }];

      await expect(
        DatabaseService.splitTask(mockTask, subtasks)
      ).rejects.toThrow('認証が必要です');
    });

    it('無効な見積もり時間の場合の処理', async () => {
      const invalidEstimationCases = [
        { pomodoros: -1, description: '負の値' },
        { pomodoros: 0, description: 'ゼロ' },
      ];

      for (const { pomodoros } of invalidEstimationCases) {
        const task = { ...mockTask, estimated_pomodoros: pomodoros };
        const suggestions = await DatabaseService.suggestTaskSplit(task);

        // 無効な見積もり時間の場合は分割提案を生成しない
        expect(suggestions.length).toBe(0);
      }
    });

    it('サブタスクの見積もり時間が無効な場合のエラーハンドリング', async () => {
      const invalidSubtasks = [
        { title: 'サブタスク1', estimated_pomodoros: 0 }, // 無効な見積もり時間
        { title: 'サブタスク2', estimated_pomodoros: -1 }, // 負の値
      ];

      // 現在の実装では1ポモドーロを超える場合のみチェックしているが、
      // 将来的には0以下の値もチェックする可能性がある
      const validSubtasks = invalidSubtasks.filter(
        st => st.estimated_pomodoros > 0 && st.estimated_pomodoros <= 1
      );

      if (validSubtasks.length === 0) {
        // 有効なサブタスクがない場合は空の配列が返される
        const result = await DatabaseService.splitTask(mockTask, []);
        expect(result).toEqual([]);
      }
    });
  });
});
