/**
 * エラー率監視サービスのテスト
 * 継続監視項目: エラー率 < 1%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorRateMonitor,
  getErrorRateMonitor,
  resetErrorRateMonitorInstance,
} from '../error-rate-monitor';

// モック設定
vi.mock('../error-monitoring', () => ({
  ErrorMonitoringService: {
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

describe('ErrorRateMonitor', () => {
  let monitor: ErrorRateMonitor;

  beforeEach(() => {
    // 各テスト前に新しいインスタンスを作成
    monitor = new ErrorRateMonitor({
      enabled: true,
      threshold: 1.0, // 1%
      timeWindow: 5, // 5分
      checkInterval: 1, // 1秒（テスト用）
      alertCooldown: 1, // 1分（テスト用）
      enableConsoleLogging: false,
    });
  });

  afterEach(() => {
    // 各テスト後にクリーンアップ
    monitor.stopMonitoring();
    monitor.resetStats();
  });

  describe('基本機能', () => {
    it('成功リクエストを正しく記録する', () => {
      monitor.recordSuccess('/api/test', 'user123');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('エラーリクエストを正しく記録する', () => {
      monitor.recordError('api-error', '/api/test', 'user123');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBe(100);
    });

    it('エラー率を正しく計算する', () => {
      // 成功3回、エラー1回 = 25%のエラー率
      monitor.recordSuccess('/api/test1');
      monitor.recordSuccess('/api/test2');
      monitor.recordSuccess('/api/test3');
      monitor.recordError('api-error', '/api/test4');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBe(25);
    });

    it('エラータイプ別の内訳を正しく計算する', () => {
      monitor.recordError('network-error', '/api/test1');
      monitor.recordError('network-error', '/api/test2');
      monitor.recordError('validation-error', '/api/test3');
      monitor.recordSuccess('/api/test4');

      const stats = monitor.getCurrentStats();
      expect(stats.breakdown['network-error'].count).toBe(2);
      expect(stats.breakdown['network-error'].rate).toBe(50);
      expect(stats.breakdown['validation-error'].count).toBe(1);
      expect(stats.breakdown['validation-error'].rate).toBe(25);
    });
  });

  describe('API呼び出し記録', () => {
    it('成功したAPI呼び出しを記録する', () => {
      monitor.recordApiCall(true, '/api/users', undefined, 'user123');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('失敗したAPI呼び出しを記録する', () => {
      monitor.recordApiCall(false, '/api/users', 'timeout-error', 'user123');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBe(100);
      expect(stats.breakdown['timeout-error'].count).toBe(1);
    });
  });

  describe('ページ読み込み記録', () => {
    it('成功したページ読み込みを記録する', () => {
      monitor.recordPageLoad(true, '/dashboard');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('失敗したページ読み込みを記録する', () => {
      monitor.recordPageLoad(false, '/dashboard', 'load-error');

      const stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorRate).toBe(100);
      expect(stats.breakdown['load-error'].count).toBe(1);
    });
  });

  describe('閾値チェック', () => {
    it('エラー率が閾値以下の場合はアラートを発生させない', () => {
      // 0.5%のエラー率（閾値1%以下）
      for (let i = 0; i < 199; i++) {
        monitor.recordSuccess(`/api/test${i}`);
      }
      monitor.recordError('api-error', '/api/test199');

      const stats = monitor.getCurrentStats();
      expect(stats.errorRate).toBe(0.5);
      expect(stats.errorRate).toBeLessThan(1.0);
    });

    it('エラー率が閾値を超えた場合の統計を正しく取得する', () => {
      // 2%のエラー率（閾値1%超過）
      for (let i = 0; i < 98; i++) {
        monitor.recordSuccess(`/api/test${i}`);
      }
      monitor.recordError('api-error', '/api/test98');
      monitor.recordError('api-error', '/api/test99');

      const stats = monitor.getCurrentStats();
      expect(stats.errorRate).toBe(2);
      expect(stats.errorRate).toBeGreaterThan(1.0);
    });
  });

  describe('時間窓フィルタリング', () => {
    it('時間窓外の古いレコードを除外する', () => {
      // 現在の時刻から6分前のレコード（時間窓5分を超える）
      const oldTimestamp = new Date(Date.now() - 6 * 60 * 1000);

      // プライベートメソッドにアクセスするためのハック
      const requests = (monitor as any).requests;
      requests.push({
        id: 'old-record',
        timestamp: oldTimestamp,
        type: 'error',
        errorType: 'old-error',
      });

      // 新しいレコードを追加
      monitor.recordSuccess('/api/new');

      const stats = monitor.getCurrentStats();
      // 古いレコードは除外され、新しいレコードのみカウントされる
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('レポート生成', () => {
    it('エラー率レポートを生成する', () => {
      monitor.recordSuccess('/api/test1');
      monitor.recordError('api-error', '/api/test2');

      const report = monitor.generateErrorRateReport();

      expect(report).toContain('エラー率監視レポート');
      expect(report).toContain('総リクエスト数: 2');
      expect(report).toContain('エラー数: 1');
      expect(report).toContain('エラー率: 50.00%');
      expect(report).toContain('閾値: 1%');
      expect(report).toContain('❌ 閾値超過');
    });

    it('正常状態のレポートを生成する', () => {
      monitor.recordSuccess('/api/test1');
      monitor.recordSuccess('/api/test2');

      const report = monitor.generateErrorRateReport();

      expect(report).toContain('エラー率: 0.00%');
      expect(report).toContain('✅ 正常');
    });
  });

  describe('トレンドデータ', () => {
    it('エラー率トレンドデータを取得する', () => {
      monitor.recordSuccess('/api/test1');
      monitor.recordError('api-error', '/api/test2');

      const trend = monitor.getErrorRateTrend(1);

      expect(Array.isArray(trend)).toBe(true);
      expect(trend.length).toBeGreaterThan(0);

      const latestPoint = trend[trend.length - 1];
      expect(latestPoint).toHaveProperty('timestamp');
      expect(latestPoint).toHaveProperty('errorRate');
      expect(latestPoint).toHaveProperty('totalRequests');
      expect(latestPoint).toHaveProperty('totalErrors');
    });
  });

  describe('設定管理', () => {
    it('設定を更新できる', () => {
      const newConfig = {
        threshold: 2.0,
        timeWindow: 10,
      };

      monitor.updateConfig(newConfig);

      const config = monitor.getConfig();
      expect(config.threshold).toBe(2.0);
      expect(config.timeWindow).toBe(10);
    });

    it('現在の設定を取得できる', () => {
      const config = monitor.getConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('threshold');
      expect(config).toHaveProperty('timeWindow');
      expect(config).toHaveProperty('checkInterval');
      expect(config).toHaveProperty('alertCooldown');
    });
  });

  describe('統計リセット', () => {
    it('統計をリセットできる', () => {
      monitor.recordSuccess('/api/test1');
      monitor.recordError('api-error', '/api/test2');

      let stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(2);

      monitor.resetStats();

      stats = monitor.getCurrentStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('監視制御', () => {
    it('監視を開始できる', () => {
      monitor.startMonitoring();
      // 監視が開始されたことを確認（内部状態のテストは困難なため、エラーが発生しないことを確認）
      expect(() => monitor.startMonitoring()).not.toThrow();
    });

    it('監視を停止できる', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();
      // 監視が停止されたことを確認（内部状態のテストは困難なため、エラーが発生しないことを確認）
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    it('重複した監視開始を処理する', () => {
      monitor.startMonitoring();
      monitor.startMonitoring(); // 2回目の開始
      // エラーが発生しないことを確認
      expect(() => monitor.startMonitoring()).not.toThrow();
    });
  });
});

describe('シングルトン機能', () => {
  afterEach(() => {
    // シングルトンインスタンスをリセット（テスト用）
    resetErrorRateMonitorInstance();
  });

  it('getErrorRateMonitorが同じインスタンスを返す', () => {
    const monitor1 = getErrorRateMonitor();
    const monitor2 = getErrorRateMonitor();

    expect(monitor1).toBe(monitor2);
  });

  it('設定を指定してインスタンスを取得できる', () => {
    const config = {
      threshold: 2.0,
      enableConsoleLogging: false,
    };

    const monitor = getErrorRateMonitor(config);

    expect(monitor).toBeDefined();
    // 初回作成時のみ設定が適用される
    expect(monitor.getConfig().threshold).toBe(2.0);
  });
});

describe('エッジケース', () => {
  let edgeMonitor: ErrorRateMonitor;

  beforeEach(() => {
    edgeMonitor = new ErrorRateMonitor({
      enabled: true,
      threshold: 1.0,
      timeWindow: 5,
      checkInterval: 1,
      alertCooldown: 1,
      enableConsoleLogging: false,
    });
  });

  afterEach(() => {
    edgeMonitor.stopMonitoring();
    edgeMonitor.resetStats();
  });

  it('リクエストが0件の場合のエラー率計算', () => {
    const stats = edgeMonitor.getCurrentStats();

    expect(stats.totalRequests).toBe(0);
    expect(stats.totalErrors).toBe(0);
    expect(stats.errorRate).toBe(0);
  });

  it('エラーのみの場合のエラー率計算', () => {
    edgeMonitor.recordError('api-error', '/api/test');

    const stats = edgeMonitor.getCurrentStats();
    expect(stats.errorRate).toBe(100);
  });

  it('成功のみの場合のエラー率計算', () => {
    edgeMonitor.recordSuccess('/api/test');

    const stats = edgeMonitor.getCurrentStats();
    expect(stats.errorRate).toBe(0);
  });

  it('未定義のエラータイプを処理する', () => {
    edgeMonitor.recordError('', '/api/test');

    const stats = edgeMonitor.getCurrentStats();
    expect(stats.breakdown['unknown']).toBeDefined();
    expect(stats.breakdown['unknown'].count).toBe(1);
  });
});
