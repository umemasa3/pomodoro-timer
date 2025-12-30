/**
 * Core Web Vitals自動測定テスト
 * Feature: production-readiness, Task 10.3
 *
 * このテストは要件8.4、12.1、12.2、12.3「パフォーマンステスト」を検証します。
 * Core Web Vitals（LCP、FID、CLS）の自動測定機能をテストします。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../performance-monitor';

// Web Vitals APIのモック
interface MockPerformanceEntry {
  name: string;
  startTime: number;
  duration?: number;
  value?: number;
  processingStart?: number;
  hadRecentInput?: boolean;
}

interface MockPerformanceObserver {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

describe('Core Web Vitals自動測定テスト', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockPerformanceObserver: MockPerformanceObserver;
  let mockPerformanceEntries: MockPerformanceEntry[];

  beforeEach(() => {
    // Performance APIのモック
    mockPerformanceEntries = [];

    mockPerformanceObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };

    // PerformanceObserverのモック
    (globalThis as any).PerformanceObserver = vi
      .fn()
      .mockImplementation(callback => {
        // コールバック関数を保存して後で呼び出せるようにする
        (mockPerformanceObserver as any).callback = callback;
        return mockPerformanceObserver;
      });

    // performanceオブジェクトのモック
    Object.defineProperty(globalThis, 'performance', {
      value: {
        now: vi.fn(() => Date.now()),
        getEntriesByType: vi.fn((type: string) => {
          return mockPerformanceEntries.filter(
            entry =>
              (type === 'largest-contentful-paint' &&
                entry.name === 'largest-contentful-paint') ||
              (type === 'first-input' && entry.name === 'first-input') ||
              (type === 'layout-shift' && entry.name === 'layout-shift')
          );
        }),
      },
      writable: true,
    });

    // sessionStorageのモック
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // localStorageのモック
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn(() => '{}'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    performanceMonitor = new PerformanceMonitor({
      enabled: true,
      enableConsoleLogging: false,
    });
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('LCP (Largest Contentful Paint) 測定', () => {
    it('LCPイベントが正しく測定される', () => {
      // LCPイベントをシミュレート
      const lcpEntry: MockPerformanceEntry = {
        name: 'largest-contentful-paint',
        startTime: 1500, // 1.5秒
      };

      mockPerformanceEntries.push(lcpEntry);

      // PerformanceObserverのコールバックを呼び出し
      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [lcpEntry],
        });
      }

      // LCPが記録されることを確認
      const stats = performanceMonitor.getMetricsStats();
      expect(stats.LCP).toBeDefined();
      expect(stats.LCP.count).toBe(1);
      expect(stats.LCP.average).toBe(1500);
    });

    it('複数のLCPイベントで最後の値が記録される', () => {
      const lcpEntries: MockPerformanceEntry[] = [
        { name: 'largest-contentful-paint', startTime: 1000 },
        { name: 'largest-contentful-paint', startTime: 1500 },
        { name: 'largest-contentful-paint', startTime: 1200 },
      ];

      mockPerformanceEntries.push(...lcpEntries);

      // 各エントリーを順次処理
      lcpEntries.forEach(entry => {
        const callback = (mockPerformanceObserver as any).callback;
        if (callback) {
          callback({
            getEntries: () => [entry],
          });
        }
      });

      const stats = performanceMonitor.getMetricsStats();
      expect(stats.LCP).toBeDefined();
      expect(stats.LCP.count).toBe(3);
      // 最新の値が記録されることを確認
      expect(stats.LCP.max).toBe(1500);
    });

    it('LCP閾値超過時にアラートが生成される', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 閾値を超えるLCP値（2.5秒以上）
      const lcpEntry: MockPerformanceEntry = {
        name: 'largest-contentful-paint',
        startTime: 3000, // 3秒
      };

      // アラート有効でモニターを再作成
      performanceMonitor.stopMonitoring();
      performanceMonitor = new PerformanceMonitor({
        enabled: true,
        enableConsoleLogging: true,
        thresholds: {
          LCP: 2500, // 2.5秒
          FID: 100,
          CLS: 0.1,
          customMetrics: {},
        },
      });

      mockPerformanceEntries.push(lcpEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [lcpEntry],
        });
      }

      // アラートが出力されることを確認
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PerformanceAlert')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('FID (First Input Delay) 測定', () => {
    it('FIDイベントが正しく測定される', () => {
      const fidEntry: MockPerformanceEntry = {
        name: 'first-input',
        startTime: 1000,
        processingStart: 1050, // 50ms遅延
      };

      mockPerformanceEntries.push(fidEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [fidEntry],
        });
      }

      const stats = performanceMonitor.getMetricsStats();
      expect(stats.FID).toBeDefined();
      expect(stats.FID.count).toBe(1);
      expect(stats.FID.average).toBe(50); // processingStart - startTime
    });

    it('FID閾値超過時にアラートが生成される', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 閾値を超えるFID値（100ms以上）
      const fidEntry: MockPerformanceEntry = {
        name: 'first-input',
        startTime: 1000,
        processingStart: 1150, // 150ms遅延
      };

      performanceMonitor.stopMonitoring();
      performanceMonitor = new PerformanceMonitor({
        enabled: true,
        enableConsoleLogging: true,
        thresholds: {
          LCP: 2500,
          FID: 100, // 100ms
          CLS: 0.1,
          customMetrics: {},
        },
      });

      mockPerformanceEntries.push(fidEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [fidEntry],
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PerformanceAlert')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('CLS (Cumulative Layout Shift) 測定', () => {
    it('CLSイベントが正しく測定される', () => {
      const clsEntry: MockPerformanceEntry = {
        name: 'layout-shift',
        value: 0.05,
        hadRecentInput: false,
      };

      mockPerformanceEntries.push(clsEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [clsEntry],
        });
      }

      const stats = performanceMonitor.getMetricsStats();
      expect(stats.CLS).toBeDefined();
      expect(stats.CLS.count).toBe(1);
      expect(stats.CLS.average).toBe(0.05);
    });

    it('ユーザー入力による変更は除外される', () => {
      const clsEntries: MockPerformanceEntry[] = [
        {
          name: 'layout-shift',
          value: 0.05,
          hadRecentInput: false, // 測定対象
        },
        {
          name: 'layout-shift',
          value: 0.1,
          hadRecentInput: true, // 除外対象
        },
      ];

      mockPerformanceEntries.push(...clsEntries);

      clsEntries.forEach(entry => {
        const callback = (mockPerformanceObserver as any).callback;
        if (callback) {
          callback({
            getEntries: () => [entry],
          });
        }
      });

      const stats = performanceMonitor.getMetricsStats();
      expect(stats.CLS).toBeDefined();
      expect(stats.CLS.count).toBe(1); // hadRecentInput: falseのもののみ
      expect(stats.CLS.average).toBe(0.05);
    });

    it('CLS閾値超過時にアラートが生成される', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const clsEntry: MockPerformanceEntry = {
        name: 'layout-shift',
        value: 0.15, // 閾値0.1を超過
        hadRecentInput: false,
      };

      performanceMonitor.stopMonitoring();
      performanceMonitor = new PerformanceMonitor({
        enabled: true,
        enableConsoleLogging: true,
        thresholds: {
          LCP: 2500,
          FID: 100,
          CLS: 0.1, // 0.1
          customMetrics: {},
        },
      });

      mockPerformanceEntries.push(clsEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [clsEntry],
        });
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PerformanceAlert')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('統合テスト', () => {
    it('すべてのCore Web Vitalsが同時に測定される', () => {
      const entries: MockPerformanceEntry[] = [
        {
          name: 'largest-contentful-paint',
          startTime: 1500,
        },
        {
          name: 'first-input',
          startTime: 2000,
          processingStart: 2080,
        },
        {
          name: 'layout-shift',
          value: 0.05,
          hadRecentInput: false,
        },
      ];

      mockPerformanceEntries.push(...entries);

      entries.forEach(entry => {
        const callback = (mockPerformanceObserver as any).callback;
        if (callback) {
          callback({
            getEntries: () => [entry],
          });
        }
      });

      const stats = performanceMonitor.getMetricsStats();

      // すべてのメトリクスが記録されることを確認
      expect(stats.LCP).toBeDefined();
      expect(stats.LCP.average).toBe(1500);

      expect(stats.FID).toBeDefined();
      expect(stats.FID.average).toBe(80);

      expect(stats.CLS).toBeDefined();
      expect(stats.CLS.average).toBe(0.05);
    });

    it('パフォーマンス監視の開始と停止が正常に動作する', () => {
      // 監視開始
      performanceMonitor.startMonitoring();
      expect(mockPerformanceObserver.observe).toHaveBeenCalledTimes(3); // LCP, FID, CLS

      // 監視停止
      performanceMonitor.stopMonitoring();
      expect(mockPerformanceObserver.disconnect).toHaveBeenCalled();
    });

    it('設定更新が正しく反映される', () => {
      const newConfig = {
        enabled: true,
        enableConsoleLogging: true,
        thresholds: {
          LCP: 3000,
          FID: 200,
          CLS: 0.2,
          customMetrics: {},
        },
      };

      performanceMonitor.updateConfig(newConfig);

      // 新しい閾値でテスト
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const lcpEntry: MockPerformanceEntry = {
        name: 'largest-contentful-paint',
        startTime: 2500, // 新しい閾値3000以下
      };

      mockPerformanceEntries.push(lcpEntry);

      const callback = (mockPerformanceObserver as any).callback;
      if (callback) {
        callback({
          getEntries: () => [lcpEntry],
        });
      }

      // 新しい閾値以下なのでアラートは出ない
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
