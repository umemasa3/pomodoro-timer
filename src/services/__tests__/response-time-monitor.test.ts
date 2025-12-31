/**
 * 応答時間監視機能のテスト
 * 2秒以内の応答時間目標達成を検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../performance-monitor';

// モック設定
const mockPerformanceObserver = vi.fn();
const mockRequestIdleCallback = vi.fn();

// グローバルオブジェクトのモック
Object.defineProperty(globalThis, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver,
});

Object.defineProperty(globalThis, 'requestIdleCallback', {
  writable: true,
  value: mockRequestIdleCallback,
});

Object.defineProperty(globalThis, 'performance', {
  writable: true,
  value: {
    timing: {
      navigationStart: 1000,
      loadEventEnd: 3000,
      domainLookupStart: 1100,
      domainLookupEnd: 1200,
      connectStart: 1200,
      connectEnd: 1300,
      requestStart: 1300,
      responseStart: 1400,
      domContentLoadedEventStart: 2000,
      domContentLoadedEventEnd: 2100,
    },
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    },
    getEntriesByType: vi.fn(() => [
      {
        domainLookupStart: 1100,
        domainLookupEnd: 1200,
        connectStart: 1200,
        connectEnd: 1300,
        requestStart: 1300,
        responseStart: 1400,
        domContentLoadedEventStart: 2000,
        domContentLoadedEventEnd: 2100,
        fetchStart: 1000,
        domInteractive: 2500,
      },
    ]),
  },
});

describe('応答時間監視機能', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // PerformanceObserverのモック実装
    mockPerformanceObserver.mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
    }));

    // requestIdleCallbackのモック実装
    mockRequestIdleCallback.mockImplementation(callback => {
      callback({ timeRemaining: () => 50 });
      return 1;
    });

    // 新しいパフォーマンス監視インスタンスを作成（シングルトンを回避）
    performanceMonitor = new PerformanceMonitor({
      enabled: true,
      enableConsoleLogging: false,
      thresholds: {
        LCP: 2500,
        FID: 100,
        CLS: 0.1,
        customMetrics: {
          'api-response-time': 2000, // 2秒以内の目標
          'page-transition-time': 1000, // 1秒以内の目標
          'route-change-time': 800, // 800ms以内の目標
          'component-render-time': 100, // 100ms以内の目標
          'navigation-timing': 2000, // 2秒以内の目標
        },
      },
    });
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('API応答時間監視', () => {
    it('2秒以内のAPI応答時間を正常に記録する', () => {
      // 1.5秒のAPI応答時間を記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 1500);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.apiResponseTime.average).toBe(1500);
      expect(stats.apiResponseTime.count).toBe(1);
      expect(stats.overall.targetsMet.api).toBe(true); // 2秒以内なので目標達成
    });

    it('2秒を超えるAPI応答時間を警告として記録する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 3秒のAPI応答時間を記録
      performanceMonitor.recordApiResponseTime('/api/sessions', 3000);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.apiResponseTime.average).toBe(3000);
      expect(stats.apiResponseTime.count).toBe(1);
      expect(stats.overall.targetsMet.api).toBe(false); // 2秒超過なので目標未達成

      consoleSpy.mockRestore();
    });

    it('複数のAPI応答時間の統計を正確に計算する', () => {
      // 複数のAPI応答時間を記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 1000);
      performanceMonitor.recordApiResponseTime('/api/sessions', 1500);
      performanceMonitor.recordApiResponseTime('/api/users', 2500);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.apiResponseTime.average).toBe(1666.6666666666667); // (1000+1500+2500)/3
      expect(stats.apiResponseTime.count).toBe(3);
      expect(stats.overall.targetsMet.api).toBe(true); // 平均が2秒以内なので目標達成
    });
  });

  describe('ページ遷移時間監視', () => {
    it('1秒以内のページ遷移時間を正常に記録する', () => {
      // 800msのページ遷移時間を記録
      performanceMonitor.recordPageTransitionTime('/timer', '/tasks', 800);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.pageTransitionTime.average).toBe(800);
      expect(stats.pageTransitionTime.count).toBe(1);
      expect(stats.overall.targetsMet.pageTransition).toBe(true); // 1秒以内なので目標達成
    });

    it('1秒を超えるページ遷移時間を警告として記録する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 1.5秒のページ遷移時間を記録
      performanceMonitor.recordPageTransitionTime(
        '/tasks',
        '/statistics',
        1500
      );

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.pageTransitionTime.average).toBe(1500);
      expect(stats.pageTransitionTime.count).toBe(1);
      expect(stats.overall.targetsMet.pageTransition).toBe(false); // 1秒超過なので目標未達成

      consoleSpy.mockRestore();
    });
  });

  describe('ルート変更時間監視', () => {
    it('800ms以内のルート変更時間を正常に記録する', () => {
      // 600msのルート変更時間を記録
      performanceMonitor.recordRouteChangeTime('/timer', 600);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.routeChangeTime.average).toBe(600);
      expect(stats.routeChangeTime.count).toBe(1);
      expect(stats.overall.targetsMet.routeChange).toBe(true); // 800ms以内なので目標達成
    });

    it('800msを超えるルート変更時間を警告として記録する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 1000msのルート変更時間を記録
      performanceMonitor.recordRouteChangeTime('/statistics', 1000);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.routeChangeTime.average).toBe(1000);
      expect(stats.routeChangeTime.count).toBe(1);
      expect(stats.overall.targetsMet.routeChange).toBe(false); // 800ms超過なので目標未達成

      consoleSpy.mockRestore();
    });
  });

  describe('コンポーネント描画時間監視', () => {
    it('100ms以内のコンポーネント描画時間を正常に記録する', () => {
      // 80msのコンポーネント描画時間を記録
      performanceMonitor.recordComponentRenderTime('TimerComponent', 80);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.componentRenderTime.average).toBe(80);
      expect(stats.componentRenderTime.count).toBe(1);
      expect(stats.overall.targetsMet.component).toBe(true); // 100ms以内なので目標達成
    });

    it('100msを超えるコンポーネント描画時間を警告として記録する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 150msのコンポーネント描画時間を記録
      performanceMonitor.recordComponentRenderTime('StatisticsPage', 150);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.componentRenderTime.average).toBe(150);
      expect(stats.componentRenderTime.count).toBe(1);
      expect(stats.overall.targetsMet.component).toBe(false); // 100ms超過なので目標未達成

      consoleSpy.mockRestore();
    });
  });

  describe('ナビゲーション時間監視', () => {
    it('2秒以内のナビゲーション時間を正常に記録する', () => {
      // 1.8秒のナビゲーション時間を記録
      performanceMonitor.recordNavigationTime('initial-load', 1800);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.navigationTime.average).toBe(1800);
      expect(stats.navigationTime.count).toBe(1);
      expect(stats.overall.targetsMet.navigation).toBe(true); // 2秒以内なので目標達成
    });

    it('2秒を超えるナビゲーション時間を警告として記録する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 2.5秒のナビゲーション時間を記録
      performanceMonitor.recordNavigationTime('page-reload', 2500);

      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.navigationTime.average).toBe(2500);
      expect(stats.navigationTime.count).toBe(1);
      expect(stats.overall.targetsMet.navigation).toBe(false); // 2秒超過なので目標未達成

      consoleSpy.mockRestore();
    });
  });

  describe('応答時間統計とレポート', () => {
    it('応答時間統計を正確に計算する', () => {
      // 複数の応答時間データを記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 1000);
      performanceMonitor.recordApiResponseTime('/api/tasks', 1500);
      performanceMonitor.recordApiResponseTime('/api/tasks', 2000);
      performanceMonitor.recordPageTransitionTime('/timer', '/tasks', 800);
      performanceMonitor.recordPageTransitionTime(
        '/tasks',
        '/statistics',
        1200
      );

      const stats = performanceMonitor.getResponseTimeStats();

      // API応答時間の統計
      expect(stats.apiResponseTime.average).toBeCloseTo(1500, 0); // (1000+1500+2000)/3
      expect(stats.apiResponseTime.count).toBe(3);

      // ページ遷移時間の統計
      expect(stats.pageTransitionTime.average).toBeCloseTo(1000, 0); // (800+1200)/2
      expect(stats.pageTransitionTime.count).toBe(2);

      // 全体平均応答時間
      expect(stats.overall.averageResponseTime).toBeCloseTo(1300, 0); // (1000+1500+2000+800+1200)/5
    });

    it('応答時間レポートを生成する', () => {
      // テストデータを記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 1500);
      performanceMonitor.recordPageTransitionTime('/timer', '/tasks', 800);

      const report = performanceMonitor.generateResponseTimeReport();

      expect(report).toContain('応答時間レポート');
      expect(report).toContain('API応答時間');
      expect(report).toContain('ページ遷移時間');
      expect(report).toContain('1500.00ms'); // API応答時間
      expect(report).toContain('800.00ms'); // ページ遷移時間
    });

    it('応答時間最適化推奨事項を生成する', () => {
      // 目標を超過する応答時間を記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 3000); // 2秒超過
      performanceMonitor.recordPageTransitionTime('/timer', '/tasks', 1500); // 1秒超過

      const recommendations =
        performanceMonitor.generateResponseTimeOptimizationRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('API応答時間改善'))).toBe(
        true
      );
      expect(
        recommendations.some(rec => rec.includes('ページ遷移時間改善'))
      ).toBe(true);
    });

    it('全目標達成時に適切なメッセージを表示する', () => {
      // 全ての目標を達成する応答時間を記録
      performanceMonitor.recordApiResponseTime('/api/tasks', 1500); // 2秒以内
      performanceMonitor.recordPageTransitionTime('/timer', '/tasks', 800); // 1秒以内
      performanceMonitor.recordRouteChangeTime('/tasks', 600); // 800ms以内
      performanceMonitor.recordComponentRenderTime('TimerComponent', 80); // 100ms以内
      performanceMonitor.recordNavigationTime('initial-load', 1800); // 2秒以内

      const recommendations =
        performanceMonitor.generateResponseTimeOptimizationRecommendations();

      expect(recommendations).toContain(
        '🎉 全ての応答時間目標をクリアしています！'
      );
    });
  });

  describe('パーセンタイル計算', () => {
    it('95%ileと99%ileを正確に計算する', () => {
      // 100個のデータポイントを生成（1000ms〜2000ms）
      for (let i = 0; i < 100; i++) {
        const responseTime = 1000 + i * 10; // 1000, 1010, 1020, ..., 2000
        performanceMonitor.recordApiResponseTime('/api/test', responseTime);
      }

      const stats = performanceMonitor.getResponseTimeStats();

      // 95%ile（95番目の値）は1940ms付近
      expect(stats.apiResponseTime.p95).toBeCloseTo(1940, 0);

      // 99%ile（99番目の値）は1980ms付近
      expect(stats.apiResponseTime.p99).toBeCloseTo(1980, 0);

      expect(stats.apiResponseTime.count).toBe(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('統計データが存在しない場合の処理', () => {
      // データを記録せずに統計を取得
      const stats = performanceMonitor.getResponseTimeStats();

      expect(stats.apiResponseTime.count).toBe(0);
      expect(stats.apiResponseTime.average).toBe(0);
      expect(stats.overall.averageResponseTime).toBe(0);
    });

    it('無効な応答時間値の処理', () => {
      // 負の値や異常に大きな値をテスト
      performanceMonitor.recordApiResponseTime('/api/test', -100);
      performanceMonitor.recordApiResponseTime('/api/test', 1000000);

      const stats = performanceMonitor.getResponseTimeStats();

      // 負の値も含めて統計を計算（実際の実装では検証が必要）
      expect(stats.apiResponseTime.count).toBe(2);
    });
  });
});
