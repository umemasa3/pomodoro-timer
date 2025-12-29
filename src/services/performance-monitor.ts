/**
 * パフォーマンス監視サービス
 * Core Web Vitalsとカスタムメトリクスを監視し、閾値チェックとアラート機能を提供
 */

// パフォーマンスメトリクスの型定義
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userId?: string;
  sessionId?: string;
}

// Core Web Vitalsの閾値定義
export interface PerformanceThresholds {
  LCP: number; // Largest Contentful Paint (ms)
  FID: number; // First Input Delay (ms)
  CLS: number; // Cumulative Layout Shift
  customMetrics: Record<string, number>;
}

// パフォーマンスアラートの型定義
export interface PerformanceAlert {
  metricName: string;
  value: number;
  threshold: number;
  timestamp: number;
  severity: 'warning' | 'critical';
  url: string;
}

// パフォーマンス監視設定
export interface PerformanceMonitorConfig {
  enabled: boolean;
  batchSize: number;
  sendInterval: number; // ms
  thresholds: PerformanceThresholds;
  enableConsoleLogging: boolean;
}

/**
 * パフォーマンス監視クラス
 * Core Web Vitalsとカスタムメトリクスをリアルタイムで監視
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private sendTimer: NodeJS.Timeout | null = null;
  private config: PerformanceMonitorConfig;
  private isMonitoring = false;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: PerformanceMonitorConfig = {
    enabled: true,
    batchSize: 10,
    sendInterval: 30000, // 30秒
    thresholds: {
      LCP: 2500, // 2.5秒
      FID: 100, // 100ms
      CLS: 0.1, // 0.1
      customMetrics: {
        'page-load-time': 3000,
        'api-response-time': 2000,
        'memory-usage': 100 * 1024 * 1024, // 100MB
      },
    },
    enableConsoleLogging: process.env.NODE_ENV === 'development',
  };

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = { ...PerformanceMonitor.DEFAULT_CONFIG, ...config };
  }

  /**
   * パフォーマンス監視を開始
   */
  startMonitoring(): void {
    if (!this.config.enabled || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Core Web Vitals監視を開始
    this.monitorCoreWebVitals();

    // カスタムメトリクス監視を開始
    this.monitorCustomMetrics();

    // 定期的なメトリクス送信を開始
    this.startPeriodicSending();

    if (this.config.enableConsoleLogging) {
      console.log('PerformanceMonitor: 監視を開始しました');
    }
  }

  /**
   * パフォーマンス監視を停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // すべてのObserverを停止
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // 送信タイマーを停止
    if (this.sendTimer) {
      clearInterval(this.sendTimer);
      this.sendTimer = null;
    }

    // 残りのメトリクスを送信
    if (this.metrics.length > 0) {
      this.sendMetrics();
    }

    if (this.config.enableConsoleLogging) {
      console.log('PerformanceMonitor: 監視を停止しました');
    }
  }

  /**
   * Core Web Vitals監視を開始
   */
  private monitorCoreWebVitals(): void {
    // LCP (Largest Contentful Paint) 監視
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          if (lastEntry) {
            this.recordMetric('LCP', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP監視の初期化に失敗:', error);
      }

      // FID (First Input Delay) 監視
      try {
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime;
            this.recordMetric('FID', fid);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID監視の初期化に失敗:', error);
      }

      // CLS (Cumulative Layout Shift) 監視
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.recordMetric('CLS', clsValue);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS監視の初期化に失敗:', error);
      }
    }
  }

  /**
   * カスタムメトリクス監視を開始
   */
  private monitorCustomMetrics(): void {
    // ページ読み込み時間の監視
    if (performance.timing) {
      const loadTime =
        performance.timing.loadEventEnd - performance.timing.navigationStart;
      if (loadTime > 0) {
        this.recordMetric('page-load-time', loadTime);
      }
    }

    // メモリ使用量の監視（対応ブラウザのみ）
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        this.recordMetric('memory-usage', memoryInfo.usedJSHeapSize);
      }
    }

    // Navigation Timing API を使用した詳細メトリクス
    if ('getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0] as PerformanceNavigationTiming;

        // DNS解決時間
        this.recordMetric(
          'dns-lookup-time',
          entry.domainLookupEnd - entry.domainLookupStart
        );

        // TCP接続時間
        this.recordMetric(
          'tcp-connect-time',
          entry.connectEnd - entry.connectStart
        );

        // サーバー応答時間
        this.recordMetric(
          'server-response-time',
          entry.responseStart - entry.requestStart
        );

        // DOM構築時間
        this.recordMetric(
          'dom-content-loaded-time',
          entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
        );
      }
    }
  }

  /**
   * メトリクスを記録
   */
  recordMetric(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
    };

    this.metrics.push(metric);

    // 閾値チェック
    this.checkThresholds(metric);

    // ログ出力
    if (this.config.enableConsoleLogging) {
      console.log(`PerformanceMetric: ${name} = ${value.toFixed(2)}`, metric);
    }

    // バッチサイズに達したら送信
    if (this.metrics.length >= this.config.batchSize) {
      this.sendMetrics();
    }
  }

  /**
   * API応答時間を記録
   */
  recordApiResponseTime(endpoint: string, responseTime: number): void {
    this.recordMetric(`api-response-time-${endpoint}`, responseTime);
  }

  /**
   * カスタムメトリクスを記録
   */
  recordCustomMetric(name: string, value: number): void {
    this.recordMetric(`custom-${name}`, value);
  }

  /**
   * 閾値チェックとアラート生成
   */
  private checkThresholds(metric: PerformanceMetric): void {
    let threshold: number | undefined;

    // Core Web Vitalsの閾値チェック
    if (metric.name === 'LCP') {
      threshold = this.config.thresholds.LCP;
    } else if (metric.name === 'FID') {
      threshold = this.config.thresholds.FID;
    } else if (metric.name === 'CLS') {
      threshold = this.config.thresholds.CLS;
    } else if (this.config.thresholds.customMetrics[metric.name]) {
      threshold = this.config.thresholds.customMetrics[metric.name];
    }

    if (threshold !== undefined && metric.value > threshold) {
      const alert: PerformanceAlert = {
        metricName: metric.name,
        value: metric.value,
        threshold,
        timestamp: metric.timestamp,
        severity: this.getSeverity(metric.name, metric.value, threshold),
        url: metric.url,
      };

      this.handleAlert(alert);
    }
  }

  /**
   * アラートの重要度を判定
   */
  private getSeverity(
    metricName: string,
    value: number,
    threshold: number
  ): 'warning' | 'critical' {
    const ratio = value / threshold;

    // 閾値の1.5倍を超えたらcritical
    if (ratio > 1.5) {
      return 'critical';
    }

    return 'warning';
  }

  /**
   * アラートを処理
   */
  private handleAlert(alert: PerformanceAlert): void {
    if (this.config.enableConsoleLogging) {
      console.warn(
        `PerformanceAlert [${alert.severity}]: ${alert.metricName} = ${alert.value.toFixed(2)} (閾値: ${alert.threshold})`,
        alert
      );
    }

    // アラートをメトリクスとして記録
    this.recordMetric(`alert-${alert.metricName}`, alert.value);

    // 外部監視システムへの通知（実装は環境に依存）
    this.sendAlert(alert);
  }

  /**
   * 定期的なメトリクス送信を開始
   */
  private startPeriodicSending(): void {
    this.sendTimer = setInterval(() => {
      if (this.metrics.length > 0) {
        this.sendMetrics();
      }
    }, this.config.sendInterval);
  }

  /**
   * メトリクスを外部システムに送信
   */
  private sendMetrics(): void {
    if (this.metrics.length === 0) {
      return;
    }

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    // 実際の送信処理（実装は環境に依存）
    this.sendToMonitoringSystem(metricsToSend);
  }

  /**
   * アラートを外部システムに送信
   */
  private sendAlert(alert: PerformanceAlert): void {
    // 実際の送信処理（実装は環境に依存）
    // 例: Sentry, DataDog, CloudWatch等への送信
    if (this.config.enableConsoleLogging) {
      console.log('Alert sent to monitoring system:', alert);
    }
  }

  /**
   * メトリクスを監視システムに送信
   */
  private sendToMonitoringSystem(metrics: PerformanceMetric[]): void {
    // 実際の送信処理（実装は環境に依存）
    // 例: Analytics API, カスタムエンドポイント等への送信
    if (this.config.enableConsoleLogging) {
      console.log(
        `Metrics sent to monitoring system: ${metrics.length} items`,
        metrics
      );
    }
  }

  /**
   * 現在のユーザーIDを取得
   */
  private getCurrentUserId(): string | undefined {
    // 実装は認証システムに依存
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  /**
   * セッションIDを取得
   */
  private getSessionId(): string {
    // セッションIDの生成または取得
    let sessionId = sessionStorage.getItem('performance-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * 現在のメトリクス統計を取得
   */
  getMetricsStats(): Record<
    string,
    { count: number; average: number; min: number; max: number }
  > {
    const stats: Record<
      string,
      { count: number; average: number; min: number; max: number }
    > = {};

    this.metrics.forEach(metric => {
      if (!stats[metric.name]) {
        stats[metric.name] = {
          count: 0,
          average: 0,
          min: Infinity,
          max: -Infinity,
        };
      }

      const stat = stats[metric.name];
      stat.count++;
      stat.min = Math.min(stat.min, metric.value);
      stat.max = Math.max(stat.max, metric.value);
      stat.average =
        (stat.average * (stat.count - 1) + metric.value) / stat.count;
    });

    return stats;
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<PerformanceMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enableConsoleLogging) {
      console.log('PerformanceMonitor: 設定を更新しました', this.config);
    }
  }
}

// シングルトンインスタンス
let performanceMonitorInstance: PerformanceMonitor | null = null;

/**
 * パフォーマンス監視インスタンスを取得
 */
export function getPerformanceMonitor(
  config?: Partial<PerformanceMonitorConfig>
): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor(config);
  }
  return performanceMonitorInstance;
}

/**
 * パフォーマンス監視を初期化して開始
 */
export function initializePerformanceMonitoring(
  config?: Partial<PerformanceMonitorConfig>
): PerformanceMonitor {
  const monitor = getPerformanceMonitor(config);
  monitor.startMonitoring();
  return monitor;
}
