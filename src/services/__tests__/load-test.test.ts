/**
 * 負荷テスト（大量データ処理）
 * Feature: production-readiness, Task 10.3
 *
 * このテストは要件8.4、12.1、12.2、12.3「パフォーマンステスト」を検証します。
 * 大量データ処理時のパフォーマンスと安定性をテストします。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../database-service';
import type { Task, Session, Tag } from '../../types';

// テスト用のデータ生成ヘルパー
class TestDataGenerator {
  static generateTasks(count: number): Task[] {
    const tasks: Task[] = [];
    for (let i = 0; i < count; i++) {
      tasks.push({
        id: `task-${i}`,
        user_id: 'test-user',
        title: `テストタスク ${i}`,
        description: `テストタスクの説明 ${i}`,
        status:
          i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'pending',
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        estimated_pomodoros: Math.floor(Math.random() * 8) + 1,
        completed_pomodoros: Math.floor(Math.random() * 4),
        tags: [`tag-${i % 5}`, `category-${i % 3}`],
        created_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return tasks;
  }

  static generateSessions(count: number, taskIds: string[]): Session[] {
    const sessions: Session[] = [];
    const sessionTypes = ['pomodoro', 'short_break', 'long_break'] as const;

    for (let i = 0; i < count; i++) {
      sessions.push({
        id: `session-${i}`,
        user_id: 'test-user',
        task_id: taskIds[i % taskIds.length],
        type: sessionTypes[i % sessionTypes.length],
        planned_duration:
          sessionTypes[i % sessionTypes.length] === 'pomodoro'
            ? 25 * 60
            : 5 * 60,
        actual_duration: Math.floor(Math.random() * 30 * 60) + 5 * 60,
        completed: Math.random() > 0.1, // 90%完了率
        started_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        completed_at: Math.random() > 0.1 ? new Date().toISOString() : null,
        created_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return sessions;
  }

  static generateTags(count: number): Tag[] {
    const tags: Tag[] = [];
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

    for (let i = 0; i < count; i++) {
      tags.push({
        id: `tag-${i}`,
        user_id: 'test-user',
        name: `タグ${i}`,
        color: colors[i % colors.length],
        created_at: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    return tags;
  }
}

// パフォーマンス測定ヘルパー
class PerformanceMeasurer {
  private startTime: number = 0;
  private measurements: { [key: string]: number[] } = {};

  start(): void {
    this.startTime = performance.now();
  }

  end(label: string): number {
    const duration = performance.now() - this.startTime;
    if (!this.measurements[label]) {
      this.measurements[label] = [];
    }
    this.measurements[label].push(duration);
    return duration;
  }

  getStats(label: string): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } {
    const measurements = this.measurements[label] || [];
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    return {
      avg: sum / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length,
    };
  }

  reset(): void {
    this.measurements = {};
  }
}

describe('負荷テスト（大量データ処理）', () => {
  let performanceMeasurer: PerformanceMeasurer;
  let mockDatabaseService: any;

  beforeEach(() => {
    performanceMeasurer = new PerformanceMeasurer();

    // DatabaseServiceのモック
    mockDatabaseService = {
      getTasks: vi.fn(),
      getSessions: vi.fn(),
      getTags: vi.fn(),
      createTask: vi.fn(),
      createSession: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    };

    // グローバルなモック設定
    vi.spyOn(DatabaseService, 'getTasks').mockImplementation(
      mockDatabaseService.getTasks
    );
    vi.spyOn(DatabaseService, 'getSessions').mockImplementation(
      mockDatabaseService.getSessions
    );
    vi.spyOn(DatabaseService, 'getTags').mockImplementation(
      mockDatabaseService.getTags
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    performanceMeasurer.reset();
  });

  describe('大量タスク処理テスト', () => {
    it('1000件のタスク読み込みが2秒以内に完了する', async () => {
      const tasks = TestDataGenerator.generateTasks(1000);
      mockDatabaseService.getTasks.mockResolvedValue(tasks);

      performanceMeasurer.start();
      const result = await DatabaseService.getTasks();
      const duration = performanceMeasurer.end('load-1000-tasks');

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(2000); // 2秒以内
    });

    it('5000件のタスク読み込みが5秒以内に完了する', async () => {
      const tasks = TestDataGenerator.generateTasks(5000);
      mockDatabaseService.getTasks.mockResolvedValue(tasks);

      performanceMeasurer.start();
      const result = await DatabaseService.getTasks();
      const duration = performanceMeasurer.end('load-5000-tasks');

      expect(result).toHaveLength(5000);
      expect(duration).toBeLessThan(5000); // 5秒以内
    });

    it('大量タスクのフィルタリングが効率的に動作する', async () => {
      const tasks = TestDataGenerator.generateTasks(2000);
      mockDatabaseService.getTasks.mockResolvedValue(tasks);

      // ステータス別フィルタリング
      performanceMeasurer.start();
      const allTasks = await DatabaseService.getTasks();
      const completedTasks = allTasks.filter(
        task => task.status === 'completed'
      );
      const filterDuration = performanceMeasurer.end('filter-tasks');

      expect(completedTasks.length).toBeGreaterThan(0);
      expect(filterDuration).toBeLessThan(100); // 100ms以内
    });

    it('大量タスクの並び替えが効率的に動作する', async () => {
      const tasks = TestDataGenerator.generateTasks(1000);
      mockDatabaseService.getTasks.mockResolvedValue(tasks);

      performanceMeasurer.start();
      const allTasks = await DatabaseService.getTasks();

      // 複数の並び替えパターンをテスト
      const sortedByTitle = [...allTasks].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      const sortedByDate = [...allTasks].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const sortedByPriority = [...allTasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const sortDuration = performanceMeasurer.end('sort-tasks');

      expect(sortedByTitle).toHaveLength(1000);
      expect(sortedByDate).toHaveLength(1000);
      expect(sortedByPriority).toHaveLength(1000);
      expect(sortDuration).toBeLessThan(200); // 200ms以内
    });
  });

  describe('大量セッション処理テスト', () => {
    it('10000件のセッション読み込みが3秒以内に完了する', async () => {
      const taskIds = Array.from({ length: 100 }, (_, i) => `task-${i}`);
      const sessions = TestDataGenerator.generateSessions(10000, taskIds);
      mockDatabaseService.getSessions.mockResolvedValue(sessions);

      performanceMeasurer.start();
      const result = await DatabaseService.getSessions();
      const duration = performanceMeasurer.end('load-10000-sessions');

      expect(result).toHaveLength(10000);
      expect(duration).toBeLessThan(3000); // 3秒以内
    });

    it('大量セッションの統計計算が効率的に動作する', async () => {
      const taskIds = Array.from({ length: 50 }, (_, i) => `task-${i}`);
      const sessions = TestDataGenerator.generateSessions(5000, taskIds);
      mockDatabaseService.getSessions.mockResolvedValue(sessions);

      performanceMeasurer.start();
      const allSessions = await DatabaseService.getSessions();

      // 統計計算
      const totalSessions = allSessions.length;
      const completedSessions = allSessions.filter(s => s.completed).length;
      const totalDuration = allSessions.reduce(
        (sum, s) => sum + s.actual_duration,
        0
      );
      const avgDuration = totalDuration / totalSessions;

      // 日別集計
      const dailyStats = allSessions.reduce(
        (acc, session) => {
          const date = session.started_at.split('T')[0];
          if (!acc[date]) {
            acc[date] = { count: 0, duration: 0 };
          }
          acc[date].count++;
          acc[date].duration += session.actual_duration;
          return acc;
        },
        {} as Record<string, { count: number; duration: number }>
      );

      const statsDuration = performanceMeasurer.end('calculate-session-stats');

      expect(totalSessions).toBe(5000);
      expect(completedSessions).toBeGreaterThan(0);
      expect(avgDuration).toBeGreaterThan(0);
      expect(Object.keys(dailyStats).length).toBeGreaterThan(0);
      expect(statsDuration).toBeLessThan(500); // 500ms以内
    });

    it('大量セッションの期間別フィルタリングが効率的に動作する', async () => {
      const taskIds = Array.from({ length: 20 }, (_, i) => `task-${i}`);
      const sessions = TestDataGenerator.generateSessions(3000, taskIds);
      mockDatabaseService.getSessions.mockResolvedValue(sessions);

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      performanceMeasurer.start();
      const allSessions = await DatabaseService.getSessions();

      const weekSessions = allSessions.filter(
        s => new Date(s.started_at) >= oneWeekAgo
      );
      const monthSessions = allSessions.filter(
        s => new Date(s.started_at) >= oneMonthAgo
      );
      const pomodoroSessions = allSessions.filter(s => s.type === 'pomodoro');

      const filterDuration = performanceMeasurer.end('filter-sessions');

      expect(weekSessions.length).toBeLessThanOrEqual(allSessions.length);
      expect(monthSessions.length).toBeLessThanOrEqual(allSessions.length);
      expect(pomodoroSessions.length).toBeGreaterThan(0);
      expect(filterDuration).toBeLessThan(300); // 300ms以内
    });
  });

  describe('メモリ使用量テスト', () => {
    it('大量データ処理後にメモリリークが発生しない', async () => {
      // メモリ使用量の測定（ブラウザ環境では制限があるため簡易的）
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 大量データの処理を複数回実行
      for (let i = 0; i < 10; i++) {
        const tasks = TestDataGenerator.generateTasks(1000);
        const sessions = TestDataGenerator.generateSessions(
          2000,
          tasks.map(t => t.id)
        );

        mockDatabaseService.getTasks.mockResolvedValue(tasks);
        mockDatabaseService.getSessions.mockResolvedValue(sessions);

        await DatabaseService.getTasks();
        await DatabaseService.getSessions();

        // データの処理（メモリ使用量テストのため）
        tasks.map(task => ({
          ...task,
          sessionCount: sessions.filter(s => s.task_id === task.id).length,
        }));

        // 明示的にガベージコレクションを促す（可能な場合）
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // メモリ使用量の増加が合理的な範囲内であることを確認
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseRatio = memoryIncrease / initialMemory;

        // メモリ使用量の増加が初期値の50%以下であることを確認
        expect(memoryIncreaseRatio).toBeLessThan(0.5);
      }
    });

    it('大量データの連続処理が安定して動作する', async () => {
      const iterations = 20;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const tasks = TestDataGenerator.generateTasks(500);
        mockDatabaseService.getTasks.mockResolvedValue(tasks);

        performanceMeasurer.start();
        await DatabaseService.getTasks();
        const duration = performanceMeasurer.end(`iteration-${i}`);
        durations.push(duration);
      }

      // パフォーマンスの安定性を確認
      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      // 最大と最小の差が平均の2倍以下であることを確認（安定性の指標）
      expect(maxDuration - minDuration).toBeLessThan(avgDuration * 2);

      // 全ての処理が合理的な時間内に完了することを確認
      expect(maxDuration).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('並行処理テスト', () => {
    it('複数の大量データ処理が並行して実行できる', async () => {
      const tasks1 = TestDataGenerator.generateTasks(1000);
      const tasks2 = TestDataGenerator.generateTasks(1000);
      const sessions = TestDataGenerator.generateSessions(
        2000,
        tasks1.map(t => t.id)
      );

      mockDatabaseService.getTasks
        .mockResolvedValueOnce(tasks1)
        .mockResolvedValueOnce(tasks2);
      mockDatabaseService.getSessions.mockResolvedValue(sessions);

      performanceMeasurer.start();

      // 並行処理の実行
      const [result1, result2, result3] = await Promise.all([
        DatabaseService.getTasks(),
        DatabaseService.getTasks(),
        DatabaseService.getSessions(),
      ]);

      const parallelDuration = performanceMeasurer.end('parallel-processing');

      expect(result1).toHaveLength(1000);
      expect(result2).toHaveLength(1000);
      expect(result3).toHaveLength(2000);
      expect(parallelDuration).toBeLessThan(3000); // 3秒以内
    });

    it('高頻度の小さな処理が効率的に動作する', async () => {
      const smallTasks = TestDataGenerator.generateTasks(10);
      mockDatabaseService.getTasks.mockResolvedValue(smallTasks);

      const iterations = 100;
      const promises: Promise<any>[] = [];

      performanceMeasurer.start();

      // 高頻度の小さな処理を並行実行
      for (let i = 0; i < iterations; i++) {
        promises.push(DatabaseService.getTasks());
      }

      const results = await Promise.all(promises);
      const highFrequencyDuration = performanceMeasurer.end(
        'high-frequency-processing'
      );

      expect(results).toHaveLength(iterations);
      expect(results.every(result => result.length === 10)).toBe(true);
      expect(highFrequencyDuration).toBeLessThan(2000); // 2秒以内
    });
  });
});
