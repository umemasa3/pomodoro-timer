import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MonitoringService } from '../monitoring-service';

// Performance API のモック
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  },
};

// PerformanceObserver のモック
class MockPerformanceObserver {
  constructor(callback: any) {
    this.callback = callback;
  }

  callback: any;

  observe = vi.fn();
  disconnect = vi.fn();
}

const mockPerformanceObserver = MockPerformanceObserver;

// グローバルオブジェクトのモック
Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
  },
  writable: true,
});

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    monitoringService = MonitoringService.getInstance();
    monitoringService.clearMonitoringData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitoringService.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = MonitoringService.getInstance();
      const instance2 = MonitoringService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('監視を開始・停止できる', () => {
      expect(() => {
        monitoringService.startMonitoring();
        monitoringService.stopMonitoring();
      }).not.toThrow();
    });
  });

  describe('API呼び出し記録', () => {
    it('API レスポンス時間を記録する', () => {
      monitoringService.recordApiCall('test-endpoint', 150);
      monitoringService.recordApiCall('test-endpoint', 200);
      monitoringService.recordApiCall('another-endpoint', 300);

      const stats = monitoringService.getPerformanceStatistics();

      expect(stats.averageApiResponseTime).toBeGreaterThan(0);
      expect(stats.slowestEndpoints).toHaveLength(2);
      expect(stats.slowestEndpoints[0].endpoint).toBe('another-endpoint');
      expect(stats.slowestEndpoints[0].averageTime).toBe(300);
    });

    it('最新100件のレスポンス時間のみ保持する', () => {
      // 150件のAPI呼び出しを記録
      for (let i = 0; i < 150; i++) {
        monitoringService.recordApiCall('test-endpoint', i);
      }

      const stats = monitoringService.getPerformanceStatistics();
      // 内部的には最新100件のみ保持されているはず
      expect(stats.slowestEndpoints[0].averageTime).toBeGreaterThan(50);
    });
  });

  describe('ユーザーアクティビティ記録', () => {
    it('ユーザーアクティビティを記録する', () => {
      monitoringService.recordUserActivity({
        action: 'button_click',
        component: 'TimerComponent',
        duration: 1000,
        metadata: { buttonType: 'start' },
      });

      monitoringService.recordUserActivity({
        action: 'page_view',
        component: 'StatisticsPage',
        duration: 5000,
      });

      const stats = monitoringService.getUserActivityStatistics();

      expect(stats.totalActivities).toBe(2);
      expect(stats.mostCommonActions).toHaveLength(2);
      expect(stats.mostCommonActions[0].action).toBe('button_click');
      expect(stats.averageSessionDuration).toBe(3000); // (1000 + 5000) / 2
    });

    it('時間別アクティビティを集計する', () => {
      const now = new Date();
      const currentHour = now.getHours();

      monitoringService.recordUserActivity({
        action: 'test_action',
        component: 'TestComponent',
      });

      const stats = monitoringService.getUserActivityStatistics();
      expect(stats.activityByHour[currentHour]).toBe(1);
    });

    it('最新5000件のアクティビティのみ保持する', () => {
      // 6000件のアクティビティを記録
      for (let i = 0; i < 6000; i++) {
        monitoringService.recordUserActivity({
          action: `action_${i}`,
          component: 'TestComponent',
        });
      }

      const stats = monitoringService.getUserActivityStatistics();
      expect(stats.totalActivities).toBe(5000);
    });
  });

  describe('レンダリング時間測定', () => {
    it('コンポーネントのレンダリング時間を測定する', () => {
      const componentName = 'TestComponent';

      monitoringService.startRenderMeasure(componentName);

      // performance.mark が呼ばれることを確認
      expect(mockPerformance.mark).toHaveBeenCalledWith(
        `${componentName}-render-start`
      );

      // 測定結果をモック
      mockPerformance.getEntriesByName.mockReturnValue([{ duration: 16.5 }]);

      monitoringService.endRenderMeasure(componentName);

      expect(mockPerformance.mark).toHaveBeenCalledWith(
        `${componentName}-render-end`
      );
      expect(mockPerformance.measure).toHaveBeenCalled();
    });

    it('測定エラーを適切に処理する', () => {
      const componentName = 'TestComponent';

      // measure でエラーが発生する場合をモック
      mockPerformance.measure.mockImplementation(() => {
        throw new Error('Measurement failed');
      });

      expect(() => {
        monitoringService.startRenderMeasure(componentName);
        monitoringService.endRenderMeasure(componentName);
      }).not.toThrow();
    });
  });

  describe('システムヘルス', () => {
    it('システムヘルス状態を取得する', () => {
      // いくつかのアクティビティを記録
      monitoringService.recordUserActivity({
        action: 'normal_action',
        component: 'TestComponent',
      });

      monitoringService.recordUserActivity({
        action: 'error_occurred',
        component: 'TestComponent',
      });

      monitoringService.recordApiCall('test-api', 150);
      monitoringService.recordApiCall('slow-api', 2000);

      const health = monitoringService.getSystemHealth();

      expect(health.isOnline).toBe(true);
      expect(health.errorRate).toBeGreaterThan(0);
      expect(health.averageResponseTime).toBeGreaterThan(0);
      expect(health.memoryUsage).toBe(50 * 1024 * 1024);
      expect(health.timestamp).toBeDefined();
    });

    it('オフライン状態を検出する', () => {
      // navigator.onLine をオフラインに設定
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const health = monitoringService.getSystemHealth();
      expect(health.isOnline).toBe(false);
    });
  });

  describe('パフォーマンス統計', () => {
    it('パフォーマンス統計を計算する', () => {
      // API呼び出しを記録
      monitoringService.recordApiCall('fast-api', 100);
      monitoringService.recordApiCall('slow-api', 500);
      monitoringService.recordApiCall('medium-api', 300);

      const stats = monitoringService.getPerformanceStatistics();

      expect(stats.averageApiResponseTime).toBe(300); // (100 + 500 + 300) / 3
      expect(stats.slowestEndpoints).toHaveLength(3);
      expect(stats.slowestEndpoints[0].endpoint).toBe('slow-api');
      expect(stats.slowestEndpoints[0].averageTime).toBe(500);
    });

    it('メモリ使用量の推移を記録する', () => {
      const stats = monitoringService.getPerformanceStatistics();

      // メモリ使用量の推移データが含まれることを確認
      expect(Array.isArray(stats.memoryTrend)).toBe(true);
    });
  });

  describe('データエクスポート', () => {
    it('監視データをエクスポートする', () => {
      // テストデータを記録
      monitoringService.recordUserActivity({
        action: 'test_action',
        component: 'TestComponent',
      });

      monitoringService.recordApiCall('test-api', 150);

      const exportData = monitoringService.exportMonitoringData();

      expect(exportData.performanceMetrics).toBeDefined();
      expect(exportData.userActivities).toBeDefined();
      expect(exportData.systemHealth).toBeDefined();
      expect(exportData.statistics).toBeDefined();
      expect(exportData.statistics.performance).toBeDefined();
      expect(exportData.statistics.userActivity).toBeDefined();
    });

    it('監視データをクリアする', () => {
      // テストデータを記録
      monitoringService.recordUserActivity({
        action: 'test_action',
        component: 'TestComponent',
      });

      monitoringService.recordApiCall('test-api', 150);

      // データをクリア
      monitoringService.clearMonitoringData();

      const stats = monitoringService.getUserActivityStatistics();
      expect(stats.totalActivities).toBe(0);

      const perfStats = monitoringService.getPerformanceStatistics();
      expect(perfStats.averageApiResponseTime).toBe(0);
    });
  });

  describe('エラー検出', () => {
    it('高いエラー率を検出する', () => {
      // 大量のエラーアクティビティを記録
      for (let i = 0; i < 15; i++) {
        monitoringService.recordUserActivity({
          action: 'error_occurred',
          component: 'TestComponent',
        });
      }

      // 正常なアクティビティも少し記録
      for (let i = 0; i < 5; i++) {
        monitoringService.recordUserActivity({
          action: 'normal_action',
          component: 'TestComponent',
        });
      }

      const health = monitoringService.getSystemHealth();
      expect(health.errorRate).toBeGreaterThan(10); // 15/20 = 75%
    });

    it('遅いレスポンス時間を検出する', () => {
      monitoringService.recordApiCall('slow-api', 6000);
      monitoringService.recordApiCall('very-slow-api', 8000);

      const health = monitoringService.getSystemHealth();
      expect(health.averageResponseTime).toBeGreaterThan(5000);
    });
  });
});
