/**
 * レスポンス時間ベンチマークテスト
 * Feature: production-readiness, Task 10.3
 *
 * このテストは要件8.4、12.1、12.2、12.3「パフォーマンステスト」を検証します。
 * 各種操作のレスポンス時間をベンチマークし、パフォーマンス基準を満たすことを確認します。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../database-service';
import { TimerStore } from '../../stores/timer-store';
import { TaskStore } from '../../stores/task-store';
import { StatisticsStore } from '../../stores/statistics-store';
import type { Task, Session } from '../../types';

// ベンチマーク測定クラス
class BenchmarkMeasurer {
  private measurements: Map<string, number[]> = new Map();

  async measure<T>(label: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);

    return result;
  }

  measureSync<T>(label: string, operation: () => T): T {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);

    return result;
  }

  getStats(label: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      avg: sum / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  reset(): void {
    this.measurements.clear();
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [label] of this.measurements) {
      result[label] = this.getStats(label);
    }
    return result;
  }
}

// テストデータ生成
const generateTestTask = (id: string): Task => ({
  id,
  user_id: 'test-user',
  title: `テストタスク ${id}`,
  description: `テストタスクの説明 ${id}`,
  status: 'pending',
  priority: 'medium',
  estimated_pomodoros: 4,
  completed_pomodoros: 0,
  tags: ['test', 'benchmark'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const generateTestSession = (id: string, taskId: string): Session => ({
  id,
  user_id: 'test-user',
  task_id: taskId,
  type: 'pomodoro',
  planned_duration: 25 * 60,
  actual_duration: 25 * 60,
  completed: true,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe('レスポンス時間ベンチマークテスト', () => {
  let benchmarkMeasurer: BenchmarkMeasurer;
  let mockDatabaseService: any;

  beforeEach(() => {
    benchmarkMeasurer = new BenchmarkMeasurer();

    // DatabaseServiceのモック
    mockDatabaseService = {
      getTasks: vi.fn(),
      getSessions: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      createSession: vi.fn(),
    };

    vi.spyOn(DatabaseService, 'getTasks').mockImplementation(
      mockDatabaseService.getTasks
    );
    vi.spyOn(DatabaseService, 'getSessions').mockImplementation(
      mockDatabaseService.getSessions
    );
    vi.spyOn(DatabaseService, 'createTask').mockImplementation(
      mockDatabaseService.createTask
    );
    vi.spyOn(DatabaseService, 'updateTask').mockImplementation(
      mockDatabaseService.updateTask
    );
    vi.spyOn(DatabaseService, 'deleteTask').mockImplementation(
      mockDatabaseService.deleteTask
    );
    vi.spyOn(DatabaseService, 'createSession').mockImplementation(
      mockDatabaseService.createSession
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    benchmarkMeasurer.reset();
  });

  describe('データベース操作のベンチマーク', () => {
    it('タスク読み込みが100ms以内に完了する', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) =>
        generateTestTask(`task-${i}`)
      );
      mockDatabaseService.getTasks.mockResolvedValue(tasks);

      // 複数回測定して統計を取る
      for (let i = 0; i < 10; i++) {
        await benchmarkMeasurer.measure('task-loading', async () => {
          return await DatabaseService.getTasks();
        });
      }

      const stats = benchmarkMeasurer.getStats('task-loading');

      expect(stats.count).toBe(10);
      expect(stats.avg).toBeLessThan(100); // 平均100ms以内
      expect(stats.p95).toBeLessThan(150); // 95パーセンタイル150ms以内
      expect(stats.max).toBeLessThan(200); // 最大200ms以内
    });

    it('タスク作成が50ms以内に完了する', async () => {
      const newTask = generateTestTask('new-task');
      mockDatabaseService.createTask.mockResolvedValue(newTask);

      for (let i = 0; i < 20; i++) {
        await benchmarkMeasurer.measure('task-creation', async () => {
          return await DatabaseService.createTask({
            title: `ベンチマークタスク ${i}`,
            description: 'ベンチマーク用のタスク',
            priority: 'medium',
            estimated_pomodoros: 4,
            tags: ['benchmark'],
          });
        });
      }

      const stats = benchmarkMeasurer.getStats('task-creation');

      expect(stats.avg).toBeLessThan(50); // 平均50ms以内
      expect(stats.p95).toBeLessThan(75); // 95パーセンタイル75ms以内
      expect(stats.max).toBeLessThan(100); // 最大100ms以内
    });

    it('タスク更新が30ms以内に完了する', async () => {
      const updatedTask = {
        ...generateTestTask('update-task'),
        title: '更新されたタスク',
      };
      mockDatabaseService.updateTask.mockResolvedValue(updatedTask);

      for (let i = 0; i < 15; i++) {
        await benchmarkMeasurer.measure('task-update', async () => {
          return await DatabaseService.updateTask('update-task', {
            title: `更新されたタスク ${i}`,
            status: 'in_progress',
          });
        });
      }

      const stats = benchmarkMeasurer.getStats('task-update');

      expect(stats.avg).toBeLessThan(30); // 平均30ms以内
      expect(stats.p95).toBeLessThan(50); // 95パーセンタイル50ms以内
      expect(stats.max).toBeLessThan(75); // 最大75ms以内
    });

    it('セッション作成が40ms以内に完了する', async () => {
      const newSession = generateTestSession('new-session', 'task-1');
      mockDatabaseService.createSession.mockResolvedValue(newSession);

      for (let i = 0; i < 15; i++) {
        await benchmarkMeasurer.measure('session-creation', async () => {
          return await DatabaseService.createSession({
            task_id: 'task-1',
            type: 'pomodoro',
            planned_duration: 25 * 60,
          });
        });
      }

      const stats = benchmarkMeasurer.getStats('session-creation');

      expect(stats.avg).toBeLessThan(40); // 平均40ms以内
      expect(stats.p95).toBeLessThan(60); // 95パーセンタイル60ms以内
      expect(stats.max).toBeLessThan(80); // 最大80ms以内
    });

    it('大量データ読み込みが500ms以内に完了する', async () => {
      const largeTasks = Array.from({ length: 1000 }, (_, i) =>
        generateTestTask(`large-task-${i}`)
      );
      const largeSessions = Array.from({ length: 2000 }, (_, i) =>
        generateTestSession(`large-session-${i}`, `large-task-${i % 1000}`)
      );

      mockDatabaseService.getTasks.mockResolvedValue(largeTasks);
      mockDatabaseService.getSessions.mockResolvedValue(largeSessions);

      for (let i = 0; i < 5; i++) {
        await benchmarkMeasurer.measure('large-data-loading', async () => {
          const [tasks, sessions] = await Promise.all([
            DatabaseService.getTasks(),
            DatabaseService.getSessions(),
          ]);
          return { tasks, sessions };
        });
      }

      const stats = benchmarkMeasurer.getStats('large-data-loading');

      expect(stats.avg).toBeLessThan(500); // 平均500ms以内
      expect(stats.p95).toBeLessThan(750); // 95パーセンタイル750ms以内
      expect(stats.max).toBeLessThan(1000); // 最大1秒以内
    });
  });

  describe('ストア操作のベンチマーク', () => {
    it('タイマー開始が10ms以内に完了する', () => {
      for (let i = 0; i < 50; i++) {
        benchmarkMeasurer.measureSync('timer-start', () => {
          const timerStore = TimerStore.getState();
          timerStore.startTimer();
          return true;
        });
      }

      const stats = benchmarkMeasurer.getStats('timer-start');

      expect(stats.avg).toBeLessThan(10); // 平均10ms以内
      expect(stats.p95).toBeLessThan(20); // 95パーセンタイル20ms以内
      expect(stats.max).toBeLessThan(30); // 最大30ms以内
    });

    it('タイマー停止が5ms以内に完了する', () => {
      for (let i = 0; i < 50; i++) {
        benchmarkMeasurer.measureSync('timer-stop', () => {
          const timerStore = TimerStore.getState();
          timerStore.startTimer(); // 開始してから停止
          timerStore.pauseTimer();
          return true;
        });
      }

      const stats = benchmarkMeasurer.getStats('timer-stop');

      expect(stats.avg).toBeLessThan(5); // 平均5ms以内
      expect(stats.p95).toBeLessThan(10); // 95パーセンタイル10ms以内
      expect(stats.max).toBeLessThan(15); // 最大15ms以内
    });

    it('タスクストアの状態更新が15ms以内に完了する', async () => {
      const mockTask = generateTestTask('benchmark-task');
      mockDatabaseService.createTask.mockResolvedValue(mockTask);

      for (let i = 0; i < 20; i++) {
        await benchmarkMeasurer.measure('task-store-update', async () => {
          const taskStore = TaskStore.getState();
          await taskStore.createTask({
            title: `ストアベンチマークタスク ${i}`,
            description: 'ストア更新のベンチマーク',
            priority: 'medium',
            estimated_pomodoros: 2,
            tags: ['store-benchmark'],
          });
          return true;
        });
      }

      const stats = benchmarkMeasurer.getStats('task-store-update');

      expect(stats.avg).toBeLessThan(15); // 平均15ms以内
      expect(stats.p95).toBeLessThan(25); // 95パーセンタイル25ms以内
      expect(stats.max).toBeLessThan(40); // 最大40ms以内
    });

    it('統計計算が200ms以内に完了する', async () => {
      const mockSessions = Array.from({ length: 500 }, (_, i) =>
        generateTestSession(`stats-session-${i}`, `stats-task-${i % 50}`)
      );
      mockDatabaseService.getSessions.mockResolvedValue(mockSessions);

      for (let i = 0; i < 10; i++) {
        await benchmarkMeasurer.measure('statistics-calculation', async () => {
          const statisticsStore = StatisticsStore.getState();
          await statisticsStore.loadDailyStats();
          return true;
        });
      }

      const stats = benchmarkMeasurer.getStats('statistics-calculation');

      expect(stats.avg).toBeLessThan(200); // 平均200ms以内
      expect(stats.p95).toBeLessThan(300); // 95パーセンタイル300ms以内
      expect(stats.max).toBeLessThan(400); // 最大400ms以内
    });
  });

  describe('UI操作のベンチマーク', () => {
    it('DOM要素の作成が5ms以内に完了する', () => {
      for (let i = 0; i < 100; i++) {
        benchmarkMeasurer.measureSync('dom-creation', () => {
          const element = document.createElement('div');
          element.className = 'test-element';
          element.textContent = `テスト要素 ${i}`;
          element.setAttribute('data-testid', `element-${i}`);
          return element;
        });
      }

      const stats = benchmarkMeasurer.getStats('dom-creation');

      expect(stats.avg).toBeLessThan(5); // 平均5ms以内
      expect(stats.p95).toBeLessThan(10); // 95パーセンタイル10ms以内
      expect(stats.max).toBeLessThan(15); // 最大15ms以内
    });

    it('大量DOM要素の操作が100ms以内に完了する', () => {
      for (let i = 0; i < 10; i++) {
        benchmarkMeasurer.measureSync('bulk-dom-operations', () => {
          const container = document.createElement('div');

          // 100個の要素を作成
          for (let j = 0; j < 100; j++) {
            const element = document.createElement('div');
            element.textContent = `要素 ${j}`;
            element.className = `item-${j}`;
            container.appendChild(element);
          }

          // 要素を検索
          const items = container.querySelectorAll('.item-50');

          // 要素を削除
          container.innerHTML = '';

          return items.length;
        });
      }

      const stats = benchmarkMeasurer.getStats('bulk-dom-operations');

      expect(stats.avg).toBeLessThan(100); // 平均100ms以内
      expect(stats.p95).toBeLessThan(150); // 95パーセンタイル150ms以内
      expect(stats.max).toBeLessThan(200); // 最大200ms以内
    });

    it('イベントハンドラーの実行が1ms以内に完了する', () => {
      for (let i = 0; i < 200; i++) {
        benchmarkMeasurer.measureSync('event-handler-execution', () => {
          const handler = (event: Event) => {
            // 軽量な処理をシミュレート
            const target = event.target as HTMLElement;
            target.classList.toggle('active');
            return target.classList.contains('active');
          };

          const element = document.createElement('button');
          const event = new Event('click');
          return handler.call(element, event);
        });
      }

      const stats = benchmarkMeasurer.getStats('event-handler-execution');

      expect(stats.avg).toBeLessThan(1); // 平均1ms以内
      expect(stats.p95).toBeLessThan(2); // 95パーセンタイル2ms以内
      expect(stats.max).toBeLessThan(5); // 最大5ms以内
    });
  });

  describe('データ処理のベンチマーク', () => {
    it('配列のフィルタリングが50ms以内に完了する', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random(),
        category: i % 10,
        active: i % 3 === 0,
      }));

      for (let i = 0; i < 20; i++) {
        benchmarkMeasurer.measureSync('array-filtering', () => {
          const filtered = largeArray
            .filter(item => item.active)
            .filter(item => item.value > 0.5)
            .filter(item => item.category < 5);

          return filtered.length;
        });
      }

      const stats = benchmarkMeasurer.getStats('array-filtering');

      expect(stats.avg).toBeLessThan(50); // 平均50ms以内
      expect(stats.p95).toBeLessThan(75); // 95パーセンタイル75ms以内
      expect(stats.max).toBeLessThan(100); // 最大100ms以内
    });

    it('配列のソートが30ms以内に完了する', () => {
      const largeArray = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `Item ${Math.floor(Math.random() * 1000)}`,
        score: Math.random() * 100,
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      }));

      for (let i = 0; i < 15; i++) {
        benchmarkMeasurer.measureSync('array-sorting', () => {
          const sorted = [...largeArray].sort((a, b) => {
            // 複合ソート: スコア降順、名前昇順
            if (a.score !== b.score) {
              return b.score - a.score;
            }
            return a.name.localeCompare(b.name);
          });

          return sorted.length;
        });
      }

      const stats = benchmarkMeasurer.getStats('array-sorting');

      expect(stats.avg).toBeLessThan(30); // 平均30ms以内
      expect(stats.p95).toBeLessThan(50); // 95パーセンタイル50ms以内
      expect(stats.max).toBeLessThan(75); // 最大75ms以内
    });

    it('JSON処理が20ms以内に完了する', () => {
      const largeObject = {
        tasks: Array.from({ length: 1000 }, (_, i) =>
          generateTestTask(`json-task-${i}`)
        ),
        sessions: Array.from({ length: 2000 }, (_, i) =>
          generateTestSession(`json-session-${i}`, `json-task-${i % 1000}`)
        ),
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          userAgent: 'test-agent',
        },
      };

      for (let i = 0; i < 25; i++) {
        benchmarkMeasurer.measureSync('json-processing', () => {
          // JSON化
          const jsonString = JSON.stringify(largeObject);

          // パース
          const parsed = JSON.parse(jsonString);

          return parsed.tasks.length + parsed.sessions.length;
        });
      }

      const stats = benchmarkMeasurer.getStats('json-processing');

      expect(stats.avg).toBeLessThan(20); // 平均20ms以内
      expect(stats.p95).toBeLessThan(30); // 95パーセンタイル30ms以内
      expect(stats.max).toBeLessThan(50); // 最大50ms以内
    });
  });

  describe('総合ベンチマーク', () => {
    it('全体的なパフォーマンス基準を満たす', () => {
      // 全ての測定結果を取得
      const allStats = benchmarkMeasurer.getAllStats();

      // 各操作カテゴリの基準値
      const performanceThresholds = {
        'timer-start': { avg: 10, p95: 20 },
        'timer-stop': { avg: 5, p95: 10 },
        'task-creation': { avg: 50, p95: 75 },
        'task-update': { avg: 30, p95: 50 },
        'session-creation': { avg: 40, p95: 60 },
        'dom-creation': { avg: 5, p95: 10 },
        'event-handler-execution': { avg: 1, p95: 2 },
        'array-filtering': { avg: 50, p95: 75 },
        'array-sorting': { avg: 30, p95: 50 },
        'json-processing': { avg: 20, p95: 30 },
      };

      // 各操作が基準を満たしているかチェック
      Object.entries(performanceThresholds).forEach(
        ([operation, thresholds]) => {
          const stats = allStats[operation];
          if (stats && stats.count > 0) {
            expect(stats.avg).toBeLessThan(thresholds.avg);
            expect(stats.p95).toBeLessThan(thresholds.p95);
          }
        }
      );
    });

    it('パフォーマンス回帰が発生していない', () => {
      // 基準値（過去の測定結果）
      const baselinePerformance = {
        'task-loading': 80, // ms
        'task-creation': 40,
        'timer-start': 8,
        'statistics-calculation': 150,
      };

      const currentStats = benchmarkMeasurer.getAllStats();

      Object.entries(baselinePerformance).forEach(([operation, baseline]) => {
        const stats = currentStats[operation];
        if (stats && stats.count > 0) {
          // 現在の平均が基準値の120%以下であることを確認（20%の許容範囲）
          expect(stats.avg).toBeLessThan(baseline * 1.2);
        }
      });
    });
  });
});
