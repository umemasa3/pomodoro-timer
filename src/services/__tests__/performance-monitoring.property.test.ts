/**
 * パフォーマンス監視のプロパティベーステスト
 * プロパティ 7: パフォーマンス監視の正確性
 * 検証対象: 要件 12.1, 12.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  PerformanceMonitor,
  PerformanceThresholds,
} from '../performance-monitor';

describe('パフォーマンス監視のプロパティテスト', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockConsoleLog: ReturnType<typeof vi.fn>;
  let mockConsoleWarn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // コンソール出力をモック
    mockConsoleLog = vi.fn();
    mockConsoleWarn = vi.fn();
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);

    // PerformanceObserverをモック
    (globalThis as any).PerformanceObserver = vi
      .fn()
      .mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
      }));

    // performanceオブジェクトをモック
    Object.defineProperty(globalThis, 'performance', {
      value: {
        timing: {
          navigationStart: 1000,
          loadEventEnd: 3000,
        },
        now: vi.fn(() => Date.now()),
        getEntriesByType: vi.fn(() => []),
      },
      writable: true,
    });

    // sessionStorageをモック
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // localStorageをモック
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
      enableConsoleLogging: false, // テスト中はログを無効化
      batchSize: 5,
      sendInterval: 1000,
    });
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    vi.restoreAllMocks();
  });

  /**
   * プロパティ 7: パフォーマンス監視の正確性
   * すべてのパフォーマンス測定において、Core Web Vitalsの値が正確に記録され、
   * 閾値超過時に適切なアラートが発生する
   */
  describe('プロパティ 7: パフォーマンス監視の正確性', () => {
    it('任意のメトリクス値に対して、記録されたメトリクスが入力値と一致する', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.constantFrom('LCP', 'FID', 'CLS', 'custom-metric'),
            value: fc.float({ min: 0, max: 10000, noNaN: true }),
          }),
          metricData => {
            // メトリクスを記録
            performanceMonitor.recordMetric(metricData.name, metricData.value);

            // 統計を取得
            const stats = performanceMonitor.getMetricsStats();

            // 記録されたメトリクスが存在することを確認
            expect(stats[metricData.name]).toBeDefined();

            // 記録された値が入力値と一致することを確認
            const recordedStats = stats[metricData.name];
            expect(recordedStats.count).toBe(1);
            expect(recordedStats.average).toBeCloseTo(metricData.value, 2);
            expect(recordedStats.min).toBeCloseTo(metricData.value, 2);
            expect(recordedStats.max).toBeCloseTo(metricData.value, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('複数のメトリクス値に対して、統計計算が正確である', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.constantFrom('LCP', 'FID', 'CLS'),
            values: fc.array(fc.float({ min: 0, max: 5000, noNaN: true }), {
              minLength: 2,
              maxLength: 10,
            }),
          }),
          testData => {
            // 複数のメトリクスを記録
            testData.values.forEach(value => {
              performanceMonitor.recordMetric(testData.name, value);
            });

            // 統計を取得
            const stats = performanceMonitor.getMetricsStats();
            const recordedStats = stats[testData.name];

            // 統計の正確性を検証
            expect(recordedStats.count).toBe(testData.values.length);

            // 最小値と最大値の検証
            const expectedMin = Math.min(...testData.values);
            const expectedMax = Math.max(...testData.values);
            expect(recordedStats.min).toBeCloseTo(expectedMin, 2);
            expect(recordedStats.max).toBeCloseTo(expectedMax, 2);

            // 平均値の検証
            const expectedAverage =
              testData.values.reduce((sum, val) => sum + val, 0) /
              testData.values.length;
            expect(recordedStats.average).toBeCloseTo(expectedAverage, 2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('閾値を超えるメトリクス値に対して、適切なアラートが生成される', () => {
      fc.assert(
        fc.property(
          fc.record({
            metricName: fc.constantFrom('LCP', 'FID', 'CLS'),
            threshold: fc.float({ min: 100, max: 1000, noNaN: true }),
            value: fc.float({ min: 1001, max: 5000, noNaN: true }), // 閾値を超える値
          }),
          testData => {
            // カスタム閾値でモニターを設定
            const customThresholds: PerformanceThresholds = {
              LCP: testData.metricName === 'LCP' ? testData.threshold : 2500,
              FID: testData.metricName === 'FID' ? testData.threshold : 100,
              CLS: testData.metricName === 'CLS' ? testData.threshold : 0.1,
              customMetrics: {},
            };

            const testMonitor = new PerformanceMonitor({
              enabled: true,
              enableConsoleLogging: true, // アラートログを有効化
              thresholds: customThresholds,
            });

            // 閾値を超える値を記録
            testMonitor.recordMetric(testData.metricName, testData.value);

            // アラートが生成されたことを確認（コンソール出力で判定）
            expect(mockConsoleWarn).toHaveBeenCalled();

            // アラートメッセージに適切な情報が含まれていることを確認
            const warnCalls = mockConsoleWarn.mock.calls;
            const alertCall = warnCalls.find(
              call =>
                call[0].includes('PerformanceAlert') &&
                call[0].includes(testData.metricName)
            );
            expect(alertCall).toBeDefined();

            testMonitor.stopMonitoring();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('閾値以下のメトリクス値に対して、アラートが生成されない', () => {
      fc.assert(
        fc.property(
          fc.record({
            metricName: fc.constantFrom('LCP', 'FID', 'CLS'),
            threshold: fc.float({ min: 1000, max: 5000, noNaN: true }),
            value: fc.float({ min: 0, max: 999, noNaN: true }), // 閾値以下の値
          }),
          testData => {
            // カスタム閾値でモニターを設定
            const customThresholds: PerformanceThresholds = {
              LCP: testData.metricName === 'LCP' ? testData.threshold : 2500,
              FID: testData.metricName === 'FID' ? testData.threshold : 100,
              CLS: testData.metricName === 'CLS' ? testData.threshold : 0.1,
              customMetrics: {},
            };

            const testMonitor = new PerformanceMonitor({
              enabled: true,
              enableConsoleLogging: true,
              thresholds: customThresholds,
            });

            // 警告カウントをリセット
            mockConsoleWarn.mockClear();

            // 閾値以下の値を記録
            testMonitor.recordMetric(testData.metricName, testData.value);

            // アラートが生成されていないことを確認
            const alertCalls = mockConsoleWarn.mock.calls.filter(
              call =>
                call[0].includes('PerformanceAlert') &&
                call[0].includes(testData.metricName)
            );
            expect(alertCalls).toHaveLength(0);

            testMonitor.stopMonitoring();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('API応答時間の記録が正確である', () => {
      fc.assert(
        fc.property(
          fc.record({
            endpoint: fc.string({ minLength: 1, maxLength: 20 }),
            responseTime: fc.float({ min: 0, max: 10000, noNaN: true }),
          }),
          testData => {
            // API応答時間を記録
            performanceMonitor.recordApiResponseTime(
              testData.endpoint as string,
              testData.responseTime
            );

            // 統計を取得
            const stats = performanceMonitor.getMetricsStats();
            const expectedMetricName = `api-response-time-${testData.endpoint as string}`;

            // 記録されたメトリクスが存在することを確認
            expect(stats[expectedMetricName]).toBeDefined();

            // 記録された値が入力値と一致することを確認
            const recordedStats = stats[expectedMetricName];
            expect(recordedStats.count).toBe(1);
            expect(recordedStats.average).toBeCloseTo(testData.responseTime, 2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('カスタムメトリクスの記録が正確である', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.float({ min: 0, max: 10000, noNaN: true }),
          }),
          testData => {
            // カスタムメトリクスを記録
            performanceMonitor.recordCustomMetric(
              testData.name as string,
              testData.value
            );

            // 統計を取得
            const stats = performanceMonitor.getMetricsStats();
            const expectedMetricName = `custom-${testData.name}`;

            // 記録されたメトリクスが存在することを確認
            expect(stats[expectedMetricName]).toBeDefined();

            // 記録された値が入力値と一致することを確認
            const recordedStats = stats[expectedMetricName];
            expect(recordedStats.count).toBe(1);
            expect(recordedStats.average).toBeCloseTo(testData.value, 2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('設定更新が正しく反映される', () => {
      fc.assert(
        fc.property(
          fc.record({
            batchSize: fc.integer({ min: 1, max: 100 }),
            sendInterval: fc.integer({ min: 1000, max: 60000 }),
            enableConsoleLogging: fc.boolean(),
          }),
          newConfig => {
            // 設定を更新
            performanceMonitor.updateConfig(newConfig);

            // 設定が反映されていることを確認するため、メトリクスを記録
            // バッチサイズに達するまでメトリクスを記録
            for (let i = 0; i < newConfig.batchSize; i++) {
              performanceMonitor.recordMetric('test-metric', i);
            }

            // 統計を確認
            const stats = performanceMonitor.getMetricsStats();
            expect(stats['test-metric']).toBeDefined();
            expect(stats['test-metric'].count).toBe(newConfig.batchSize);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('エッジケースのテスト', () => {
    it('NaN値やInfinity値を適切に処理する', () => {
      const invalidValues = [NaN, Infinity, -Infinity];

      invalidValues.forEach(invalidValue => {
        // 無効な値を記録しようとする
        performanceMonitor.recordMetric('test-metric', invalidValue);

        // 統計を取得
        const stats = performanceMonitor.getMetricsStats();

        // NaN値は記録されないか、適切に処理されることを確認
        if (stats['test-metric']) {
          expect(isNaN(stats['test-metric'].average)).toBe(false);
          expect(isFinite(stats['test-metric'].average)).toBe(true);
        }
      });
    });

    it('非常に大きな値を適切に処理する', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;

      performanceMonitor.recordMetric('large-metric', largeValue);

      const stats = performanceMonitor.getMetricsStats();
      expect(stats['large-metric']).toBeDefined();
      expect(stats['large-metric'].average).toBe(largeValue);
    });

    it('ゼロ値を適切に処理する', () => {
      performanceMonitor.recordMetric('zero-metric', 0);

      const stats = performanceMonitor.getMetricsStats();
      expect(stats['zero-metric']).toBeDefined();
      expect(stats['zero-metric'].average).toBe(0);
      expect(stats['zero-metric'].min).toBe(0);
      expect(stats['zero-metric'].max).toBe(0);
    });
  });
});

/**
 * Feature: production-readiness, Property 7: パフォーマンス監視の正確性
 *
 * このテストは以下を検証します：
 * - メトリクス値の正確な記録と統計計算
 * - 閾値超過時の適切なアラート生成
 * - API応答時間とカスタムメトリクスの正確な記録
 * - 設定更新の正しい反映
 * - エッジケース（NaN、Infinity、大きな値、ゼロ値）の適切な処理
 *
 * 検証対象要件:
 * - 要件 12.1: パフォーマンス最適化
 * - 要件 12.5: Core Web Vitals監視
 */
