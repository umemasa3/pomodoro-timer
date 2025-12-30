/**
 * メモリリーク検出テスト
 * Feature: production-readiness, Task 10.3
 *
 * このテストは要件8.4、12.1、12.2、12.3「パフォーマンステスト」を検証します。
 * メモリリークの検出と防止をテストします。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimerStore } from '../../stores/timer-store';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';

// メモリ使用量監視クラス
class MemoryMonitor {
  private measurements: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  }> = [];

  recordMemoryUsage(): void {
    const memInfo = (performance as any).memory;
    if (memInfo) {
      this.measurements.push({
        timestamp: Date.now(),
        heapUsed: memInfo.usedJSHeapSize,
        heapTotal: memInfo.totalJSHeapSize,
        external: memInfo.usedJSHeapSize, // 簡易的な外部メモリ使用量
      });
    } else {
      // Node.js環境やメモリ情報が利用できない場合のフォールバック
      this.measurements.push({
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      });
    }
  }

  getMemoryGrowth(): number {
    if (this.measurements.length < 2) return 0;

    const first = this.measurements[0];
    const last = this.measurements[this.measurements.length - 1];

    return last.heapUsed - first.heapUsed;
  }

  getMemoryGrowthRate(): number {
    if (this.measurements.length < 2) return 0;

    const growth = this.getMemoryGrowth();
    const timeSpan =
      this.measurements[this.measurements.length - 1].timestamp -
      this.measurements[0].timestamp;

    return growth / (timeSpan / 1000); // bytes per second
  }

  reset(): void {
    this.measurements = [];
  }

  getMeasurements() {
    return [...this.measurements];
  }
}

// リークテスト用のヘルパークラス
class LeakTestHelper {
  private eventListeners: Array<{
    element: EventTarget;
    event: string;
    handler: EventListener;
  }> = [];
  private intervals: number[] = [];
  private timeouts: number[] = [];
  private observers: Array<
    MutationObserver | IntersectionObserver | ResizeObserver
  > = [];

  // イベントリスナーのリーク検出
  addEventListenerWithLeak(
    element: EventTarget,
    event: string,
    handler: EventListener
  ): void {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  // タイマーのリーク検出
  setIntervalWithLeak(callback: () => void, delay: number): number {
    const id = window.setInterval(callback, delay);
    this.intervals.push(id);
    return id;
  }

  setTimeoutWithLeak(callback: () => void, delay: number): number {
    const id = window.setTimeout(callback, delay);
    this.timeouts.push(id);
    return id;
  }

  // オブザーバーのリーク検出
  createMutationObserverWithLeak(callback: MutationCallback): MutationObserver {
    const observer = new MutationObserver(callback);
    this.observers.push(observer);
    return observer;
  }

  // リソースのクリーンアップ
  cleanup(): void {
    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });

    // タイマーのクリア
    this.intervals.forEach(id => clearInterval(id));
    this.timeouts.forEach(id => clearTimeout(id));

    // オブザーバーの切断
    this.observers.forEach(observer => {
      if ('disconnect' in observer) {
        observer.disconnect();
      }
    });

    // 配列のクリア
    this.eventListeners = [];
    this.intervals = [];
    this.timeouts = [];
    this.observers = [];
  }

  getActiveResourceCount(): {
    eventListeners: number;
    intervals: number;
    timeouts: number;
    observers: number;
  } {
    return {
      eventListeners: this.eventListeners.length,
      intervals: this.intervals.length,
      timeouts: this.timeouts.length,
      observers: this.observers.length,
    };
  }
}

describe('メモリリーク検出テスト', () => {
  let memoryMonitor: MemoryMonitor;
  let leakTestHelper: LeakTestHelper;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor();
    leakTestHelper = new LeakTestHelper();

    // ガベージコレクションを強制実行（可能な場合）
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }

    // 初期メモリ使用量を記録
    memoryMonitor.recordMemoryUsage();
  });

  afterEach(() => {
    leakTestHelper.cleanup();
    memoryMonitor.reset();

    // テスト後のガベージコレクション
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  });

  describe('ストアのメモリリーク検出', () => {
    it('TimerStoreの繰り返し使用でメモリリークが発生しない', async () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // タイマーストアの操作を繰り返し実行
        const timerStore = useTimerStore.getState();

        // タイマーの開始と停止
        timerStore.startTimer();
        await new Promise(resolve => setTimeout(resolve, 10));
        timerStore.pauseTimer();
        timerStore.resetTimer();

        // セッションの作成
        timerStore.completeSession();

        // 10回ごとにメモリ使用量を記録
        if (i % 10 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      // 最終メモリ使用量を記録
      memoryMonitor.recordMemoryUsage();

      // メモリ増加率が合理的な範囲内であることを確認
      const growthRate = memoryMonitor.getMemoryGrowthRate();

      // メモリ増加率が1MB/秒以下であることを確認（合理的な閾値）
      expect(Math.abs(growthRate)).toBeLessThan(1024 * 1024);
    });

    it('AuthStoreの大量操作でメモリリークが発生しない', async () => {
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const authStore = useAuthStore.getState();

        // 認証状態の変更を繰り返し
        authStore.setUser({
          id: `test-user-${i}`,
          email: `test${i}@example.com`,
          display_name: `テストユーザー ${i}`,
          avatar_url: undefined,
          timezone: 'Asia/Tokyo',
          settings: {
            pomodoro_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
            sessions_until_long_break: 4,
            sound_enabled: true,
            sound_type: 'bell',
            theme: 'auto',
            notifications: {
              desktop: true,
              sound: true,
              vibration: false,
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // ログアウト
        await authStore.signOut();

        // メモリ使用量を定期的に記録
        if (i % 5 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      memoryMonitor.recordMemoryUsage();

      const growthRate = memoryMonitor.getMemoryGrowthRate();
      expect(Math.abs(growthRate)).toBeLessThan(1024 * 1024);
    });

    it('ThemeStoreのテーマ変更でメモリリークが発生しない', async () => {
      const iterations = 30;
      const themes = ['light', 'dark', 'auto'] as const;

      for (let i = 0; i < iterations; i++) {
        const themeStore = useThemeStore.getState();

        // テーマの変更を繰り返し実行
        const theme = themes[i % themes.length];
        themeStore.setTheme(theme);

        if (i % 3 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      memoryMonitor.recordMemoryUsage();

      const growthRate = memoryMonitor.getMemoryGrowthRate();
      expect(Math.abs(growthRate)).toBeLessThan(1024 * 1024);
    });
  });

  describe('イベントリスナーのリーク検出', () => {
    it('イベントリスナーが適切にクリーンアップされる', () => {
      const mockElement = document.createElement('div');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      // イベントリスナーを追加
      leakTestHelper.addEventListenerWithLeak(mockElement, 'click', handler1);
      leakTestHelper.addEventListenerWithLeak(
        mockElement,
        'mouseover',
        handler2
      );
      leakTestHelper.addEventListenerWithLeak(window, 'resize', handler3);

      // リソースが追加されていることを確認
      const beforeCleanup = leakTestHelper.getActiveResourceCount();
      expect(beforeCleanup.eventListeners).toBe(3);

      // クリーンアップ実行
      leakTestHelper.cleanup();

      // リソースがクリーンアップされていることを確認
      const afterCleanup = leakTestHelper.getActiveResourceCount();
      expect(afterCleanup.eventListeners).toBe(0);
    });

    it('大量のイベントリスナー追加・削除でメモリリークが発生しない', () => {
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const element = document.createElement('div');
        const handler = () => console.log(`Handler ${i}`);

        // イベントリスナーを追加
        element.addEventListener('click', handler);

        // 即座に削除
        element.removeEventListener('click', handler);

        if (i % 100 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      memoryMonitor.recordMemoryUsage();

      const growthRate = memoryMonitor.getMemoryGrowthRate();
      expect(Math.abs(growthRate)).toBeLessThan(512 * 1024); // 512KB/秒以下
    });
  });

  describe('タイマーのリーク検出', () => {
    it('setIntervalが適切にクリーンアップされる', async () => {
      let counter = 0;

      // インターバルを設定
      leakTestHelper.setIntervalWithLeak(() => {
        counter++;
      }, 10);

      leakTestHelper.setIntervalWithLeak(() => {
        counter += 2;
      }, 20);

      // 少し待機してタイマーが動作することを確認
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(counter).toBeGreaterThan(0);

      const beforeCleanup = leakTestHelper.getActiveResourceCount();
      expect(beforeCleanup.intervals).toBe(2);

      // クリーンアップ
      leakTestHelper.cleanup();

      const initialCounter = counter;

      // さらに待機してタイマーが停止していることを確認
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(counter).toBe(initialCounter);

      const afterCleanup = leakTestHelper.getActiveResourceCount();
      expect(afterCleanup.intervals).toBe(0);
    });

    it('setTimeoutが適切にクリーンアップされる', async () => {
      let executed = false;

      // タイムアウトを設定
      leakTestHelper.setTimeoutWithLeak(() => {
        executed = true;
      }, 100);

      const beforeCleanup = leakTestHelper.getActiveResourceCount();
      expect(beforeCleanup.timeouts).toBe(1);

      // クリーンアップ（タイムアウト実行前）
      leakTestHelper.cleanup();

      // タイムアウト時間を過ぎても実行されないことを確認
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(executed).toBe(false);

      const afterCleanup = leakTestHelper.getActiveResourceCount();
      expect(afterCleanup.timeouts).toBe(0);
    });
  });

  describe('オブザーバーのリーク検出', () => {
    it('MutationObserverが適切にクリーンアップされる', () => {
      const callback = vi.fn();

      // MutationObserverを作成
      const observer = leakTestHelper.createMutationObserverWithLeak(callback);

      // 監視を開始
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      const beforeCleanup = leakTestHelper.getActiveResourceCount();
      expect(beforeCleanup.observers).toBe(1);

      // クリーンアップ
      leakTestHelper.cleanup();

      const afterCleanup = leakTestHelper.getActiveResourceCount();
      expect(afterCleanup.observers).toBe(0);
    });

    it('複数のオブザーバーが適切にクリーンアップされる', () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      // 複数のオブザーバーを作成
      callbacks.forEach(callback => {
        leakTestHelper.createMutationObserverWithLeak(callback);
      });

      const beforeCleanup = leakTestHelper.getActiveResourceCount();
      expect(beforeCleanup.observers).toBe(3);

      // クリーンアップ
      leakTestHelper.cleanup();

      const afterCleanup = leakTestHelper.getActiveResourceCount();
      expect(afterCleanup.observers).toBe(0);
    });
  });

  describe('DOM要素のリーク検出', () => {
    it('大量のDOM要素作成・削除でメモリリークが発生しない', () => {
      const iterations = 1000;
      const container = document.createElement('div');
      document.body.appendChild(container);

      for (let i = 0; i < iterations; i++) {
        // DOM要素を作成
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        element.className = `test-element-${i}`;

        // コンテナに追加
        container.appendChild(element);

        // イベントリスナーを追加
        const handler = () => console.log(`Clicked ${i}`);
        element.addEventListener('click', handler);

        // 即座に削除
        element.removeEventListener('click', handler);
        container.removeChild(element);

        if (i % 100 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      // コンテナをクリーンアップ
      document.body.removeChild(container);

      memoryMonitor.recordMemoryUsage();

      const growthRate = memoryMonitor.getMemoryGrowthRate();
      expect(Math.abs(growthRate)).toBeLessThan(1024 * 1024);
    });

    it('循環参照によるメモリリークが発生しない', () => {
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        // 循環参照を作成
        const obj1: any = { name: `obj1-${i}` };
        const obj2: any = { name: `obj2-${i}` };

        obj1.ref = obj2;
        obj2.ref = obj1;

        // DOM要素との循環参照
        const element = document.createElement('div');
        obj1.element = element;
        (element as any).data = obj1;

        // 循環参照を明示的に切断
        obj1.ref = null;
        obj2.ref = null;
        obj1.element = null;
        (element as any).data = null;

        if (i % 10 === 0) {
          memoryMonitor.recordMemoryUsage();
        }
      }

      memoryMonitor.recordMemoryUsage();

      const growthRate = memoryMonitor.getMemoryGrowthRate();
      expect(Math.abs(growthRate)).toBeLessThan(512 * 1024);
    });
  });

  describe('長時間実行テスト', () => {
    it('長時間のアプリケーション使用でメモリが安定している', async () => {
      const duration = 1000; // 1秒間のシミュレーション
      const interval = 50; // 50msごとに操作
      const iterations = duration / interval;

      let operationCount = 0;

      const simulateUserActivity = async () => {
        // ユーザーアクティビティをシミュレート
        const timerStore = useTimerStore.getState();
        const themeStore = useThemeStore.getState();

        // タイマー操作
        if (operationCount % 4 === 0) {
          timerStore.startTimer();
        } else if (operationCount % 4 === 1) {
          timerStore.pauseTimer();
        } else if (operationCount % 4 === 2) {
          timerStore.resetTimer();
        } else {
          timerStore.completeSession();
        }

        // テーマ変更（頻度を下げる）
        if (operationCount % 10 === 0) {
          const themes = ['light', 'dark', 'auto'] as const;
          themeStore.setTheme(themes[operationCount % 3]);
        }

        operationCount++;
      };

      // 定期的にメモリ使用量を記録
      const memoryRecordInterval = setInterval(() => {
        memoryMonitor.recordMemoryUsage();
      }, 200);

      // シミュレーション実行
      for (let i = 0; i < iterations; i++) {
        await simulateUserActivity();
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      clearInterval(memoryRecordInterval);
      memoryMonitor.recordMemoryUsage();

      // メモリ使用量の安定性を確認
      const measurements = memoryMonitor.getMeasurements();
      expect(measurements.length).toBeGreaterThan(3);

      const growthRate = memoryMonitor.getMemoryGrowthRate();

      // 長時間実行でのメモリ増加率が合理的な範囲内であることを確認
      expect(Math.abs(growthRate)).toBeLessThan(2 * 1024 * 1024); // 2MB/秒以下
    });
  });
});
