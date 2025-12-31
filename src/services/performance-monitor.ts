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
      LCP: 2500, // 2.5秒 - Core Web Vitals基準
      FID: 100, // 100ms - Core Web Vitals基準
      CLS: 0.1, // 0.1 - Core Web Vitals基準
      customMetrics: {
        'page-load-time': 3000,
        'api-response-time': 2000, // 2秒以内の目標
        'page-transition-time': 1000, // 1秒以内のページ遷移目標
        'route-change-time': 800, // 800ms以内のルート変更目標
        'component-render-time': 100, // 100ms以内のコンポーネント描画目標
        'memory-usage': 100 * 1024 * 1024, // 100MB
        'bundle-size': 1024 * 1024, // 1MB
        'time-to-interactive': 3800, // 3.8秒
        'first-contentful-paint': 1800, // 1.8秒
        'navigation-timing': 2000, // 2秒以内のナビゲーション目標
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
            const lcpValue = lastEntry.startTime;
            this.recordMetric('LCP', lcpValue);

            // Core Web Vitals基準値チェック
            if (lcpValue > this.config.thresholds.LCP) {
              console.warn(
                `🚨 LCP基準値超過: ${lcpValue.toFixed(2)}ms (基準: ${this.config.thresholds.LCP}ms)`
              );
            } else {
              console.log(`✅ LCP良好: ${lcpValue.toFixed(2)}ms`);
            }
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

            // Core Web Vitals基準値チェック
            if (fid > this.config.thresholds.FID) {
              console.warn(
                `🚨 FID基準値超過: ${fid.toFixed(2)}ms (基準: ${this.config.thresholds.FID}ms)`
              );
            } else {
              console.log(`✅ FID良好: ${fid.toFixed(2)}ms`);
            }
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

              // Core Web Vitals基準値チェック
              if (clsValue > this.config.thresholds.CLS) {
                console.warn(
                  `🚨 CLS基準値超過: ${clsValue.toFixed(3)} (基準: ${this.config.thresholds.CLS})`
                );
              }
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS監視の初期化に失敗:', error);
      }

      // FCP (First Contentful Paint) 監視
      try {
        const fcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          if (lastEntry) {
            this.recordMetric('FCP', lastEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (error) {
        console.warn('FCP監視の初期化に失敗:', error);
      }

      // TTI (Time to Interactive) 監視
      try {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
          const entry = navigationEntries[0] as PerformanceNavigationTiming;
          const tti = entry.domInteractive - entry.fetchStart; // navigationStartの代わりにfetchStartを使用
          this.recordMetric('TTI', tti);
        }
      } catch (error) {
        console.warn('TTI監視の初期化に失敗:', error);
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

    // 全体のAPI応答時間も記録
    this.recordMetric('api-response-time', responseTime);

    // 2秒以内の目標チェック
    if (responseTime > 2000) {
      console.warn(
        `🚨 API応答時間が目標を超過: ${endpoint} - ${responseTime.toFixed(2)}ms (目標: 2000ms)`
      );
    } else {
      console.log(
        `✅ API応答時間良好: ${endpoint} - ${responseTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * ページ遷移時間を記録
   */
  recordPageTransitionTime(
    fromRoute: string,
    toRoute: string,
    transitionTime: number
  ): void {
    this.recordMetric('page-transition-time', transitionTime);
    this.recordMetric(
      `page-transition-${fromRoute}-to-${toRoute}`,
      transitionTime
    );

    // 1秒以内の目標チェック
    if (transitionTime > 1000) {
      console.warn(
        `🚨 ページ遷移時間が目標を超過: ${fromRoute} → ${toRoute} - ${transitionTime.toFixed(2)}ms (目標: 1000ms)`
      );
    } else {
      console.log(
        `✅ ページ遷移時間良好: ${fromRoute} → ${toRoute} - ${transitionTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * ルート変更時間を記録
   */
  recordRouteChangeTime(route: string, changeTime: number): void {
    this.recordMetric('route-change-time', changeTime);
    this.recordMetric(`route-change-${route}`, changeTime);

    // 800ms以内の目標チェック
    if (changeTime > 800) {
      console.warn(
        `🚨 ルート変更時間が目標を超過: ${route} - ${changeTime.toFixed(2)}ms (目標: 800ms)`
      );
    } else {
      console.log(
        `✅ ルート変更時間良好: ${route} - ${changeTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * コンポーネント描画時間を記録
   */
  recordComponentRenderTime(componentName: string, renderTime: number): void {
    this.recordMetric('component-render-time', renderTime);
    this.recordMetric(`component-render-${componentName}`, renderTime);

    // 100ms以内の目標チェック
    if (renderTime > 100) {
      console.warn(
        `🚨 コンポーネント描画時間が目標を超過: ${componentName} - ${renderTime.toFixed(2)}ms (目標: 100ms)`
      );
    } else {
      console.log(
        `✅ コンポーネント描画時間良好: ${componentName} - ${renderTime.toFixed(2)}ms`
      );
    }
  }

  /**
   * ナビゲーション時間を記録
   */
  recordNavigationTime(navigationType: string, navigationTime: number): void {
    this.recordMetric('navigation-timing', navigationTime);
    this.recordMetric(`navigation-${navigationType}`, navigationTime);

    // 2秒以内の目標チェック
    if (navigationTime > 2000) {
      console.warn(
        `🚨 ナビゲーション時間が目標を超過: ${navigationType} - ${navigationTime.toFixed(2)}ms (目標: 2000ms)`
      );
    } else {
      console.log(
        `✅ ナビゲーション時間良好: ${navigationType} - ${navigationTime.toFixed(2)}ms`
      );
    }
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
   * 応答時間の統計を取得
   */
  getResponseTimeStats(): {
    apiResponseTime: {
      average: number;
      p95: number;
      p99: number;
      count: number;
    };
    pageTransitionTime: {
      average: number;
      p95: number;
      p99: number;
      count: number;
    };
    routeChangeTime: {
      average: number;
      p95: number;
      p99: number;
      count: number;
    };
    componentRenderTime: {
      average: number;
      p95: number;
      p99: number;
      count: number;
    };
    navigationTime: {
      average: number;
      p95: number;
      p99: number;
      count: number;
    };
    overall: {
      averageResponseTime: number;
      targetsMet: {
        api: boolean;
        pageTransition: boolean;
        routeChange: boolean;
        component: boolean;
        navigation: boolean;
      };
    };
  } {
    const apiMetrics = this.metrics.filter(m => m.name === 'api-response-time');
    const pageTransitionMetrics = this.metrics.filter(
      m => m.name === 'page-transition-time'
    );
    const routeChangeMetrics = this.metrics.filter(
      m => m.name === 'route-change-time'
    );
    const componentRenderMetrics = this.metrics.filter(
      m => m.name === 'component-render-time'
    );
    const navigationMetrics = this.metrics.filter(
      m => m.name === 'navigation-timing'
    );

    const calculateStats = (metrics: PerformanceMetric[]) => {
      if (metrics.length === 0) {
        return { average: 0, p95: 0, p99: 0, count: 0 };
      }

      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const p95Index = Math.floor(values.length * 0.95);
      const p99Index = Math.floor(values.length * 0.99);

      return {
        average,
        p95: values[p95Index] || 0,
        p99: values[p99Index] || 0,
        count: values.length,
      };
    };

    const apiStats = calculateStats(apiMetrics);
    const pageTransitionStats = calculateStats(pageTransitionMetrics);
    const routeChangeStats = calculateStats(routeChangeMetrics);
    const componentRenderStats = calculateStats(componentRenderMetrics);
    const navigationStats = calculateStats(navigationMetrics);

    // 全体の平均応答時間を計算
    const allResponseTimes = [
      ...apiMetrics.map(m => m.value),
      ...pageTransitionMetrics.map(m => m.value),
      ...navigationMetrics.map(m => m.value),
    ];
    const averageResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((sum, val) => sum + val, 0) /
          allResponseTimes.length
        : 0;

    return {
      apiResponseTime: apiStats,
      pageTransitionTime: pageTransitionStats,
      routeChangeTime: routeChangeStats,
      componentRenderTime: componentRenderStats,
      navigationTime: navigationStats,
      overall: {
        averageResponseTime,
        targetsMet: {
          api: apiStats.average <= 2000,
          pageTransition: pageTransitionStats.average <= 1000,
          routeChange: routeChangeStats.average <= 800,
          component: componentRenderStats.average <= 100,
          navigation: navigationStats.average <= 2000,
        },
      },
    };
  }

  /**
   * 応答時間レポートを生成
   */
  generateResponseTimeReport(): string {
    const stats = this.getResponseTimeStats();

    let report = '⚡ 応答時間レポート\n';
    report += '================================\n\n';

    // API応答時間
    report += `🌐 API応答時間\n`;
    report += `   平均: ${stats.apiResponseTime.average.toFixed(2)}ms\n`;
    report += `   95%ile: ${stats.apiResponseTime.p95.toFixed(2)}ms\n`;
    report += `   99%ile: ${stats.apiResponseTime.p99.toFixed(2)}ms\n`;
    report += `   測定回数: ${stats.apiResponseTime.count}\n`;
    report += `   目標達成: ${stats.overall.targetsMet.api ? '✅ 2秒以内' : '❌ 2秒超過'}\n\n`;

    // ページ遷移時間
    report += `📄 ページ遷移時間\n`;
    report += `   平均: ${stats.pageTransitionTime.average.toFixed(2)}ms\n`;
    report += `   95%ile: ${stats.pageTransitionTime.p95.toFixed(2)}ms\n`;
    report += `   99%ile: ${stats.pageTransitionTime.p99.toFixed(2)}ms\n`;
    report += `   測定回数: ${stats.pageTransitionTime.count}\n`;
    report += `   目標達成: ${stats.overall.targetsMet.pageTransition ? '✅ 1秒以内' : '❌ 1秒超過'}\n\n`;

    // ルート変更時間
    report += `🛣️ ルート変更時間\n`;
    report += `   平均: ${stats.routeChangeTime.average.toFixed(2)}ms\n`;
    report += `   95%ile: ${stats.routeChangeTime.p95.toFixed(2)}ms\n`;
    report += `   99%ile: ${stats.routeChangeTime.p99.toFixed(2)}ms\n`;
    report += `   測定回数: ${stats.routeChangeTime.count}\n`;
    report += `   目標達成: ${stats.overall.targetsMet.routeChange ? '✅ 800ms以内' : '❌ 800ms超過'}\n\n`;

    // コンポーネント描画時間
    report += `🧩 コンポーネント描画時間\n`;
    report += `   平均: ${stats.componentRenderTime.average.toFixed(2)}ms\n`;
    report += `   95%ile: ${stats.componentRenderTime.p95.toFixed(2)}ms\n`;
    report += `   99%ile: ${stats.componentRenderTime.p99.toFixed(2)}ms\n`;
    report += `   測定回数: ${stats.componentRenderTime.count}\n`;
    report += `   目標達成: ${stats.overall.targetsMet.component ? '✅ 100ms以内' : '❌ 100ms超過'}\n\n`;

    // ナビゲーション時間
    report += `🧭 ナビゲーション時間\n`;
    report += `   平均: ${stats.navigationTime.average.toFixed(2)}ms\n`;
    report += `   95%ile: ${stats.navigationTime.p95.toFixed(2)}ms\n`;
    report += `   99%ile: ${stats.navigationTime.p99.toFixed(2)}ms\n`;
    report += `   測定回数: ${stats.navigationTime.count}\n`;
    report += `   目標達成: ${stats.overall.targetsMet.navigation ? '✅ 2秒以内' : '❌ 2秒超過'}\n\n`;

    // 総合結果
    const allTargetsMet = Object.values(stats.overall.targetsMet).every(
      met => met
    );
    report += `🏆 総合結果\n`;
    report += `   全体平均応答時間: ${stats.overall.averageResponseTime.toFixed(2)}ms\n`;
    report += `   目標達成状況: ${allTargetsMet ? '✅ 全目標クリア' : '❌ 改善が必要'}\n`;

    return report;
  }

  /**
   * 応答時間最適化の推奨事項を生成
   */
  generateResponseTimeOptimizationRecommendations(): string[] {
    const stats = this.getResponseTimeStats();
    const recommendations: string[] = [];

    if (!stats.overall.targetsMet.api) {
      recommendations.push(
        `🌐 API応答時間改善 (現在: ${stats.apiResponseTime.average.toFixed(2)}ms):`,
        '  • データベースクエリの最適化',
        '  • APIエンドポイントのキャッシュ実装',
        '  • 不要なデータ取得の削減',
        '  • 並列処理の活用',
        '  • CDNの活用',
        ''
      );
    }

    if (!stats.overall.targetsMet.pageTransition) {
      recommendations.push(
        `📄 ページ遷移時間改善 (現在: ${stats.pageTransitionTime.average.toFixed(2)}ms):`,
        '  • コードスプリッティングの実装',
        '  • 遅延読み込み (Lazy Loading) の活用',
        '  • プリフェッチの実装',
        '  • 不要なリレンダリングの削減',
        '  • React.memo の活用',
        ''
      );
    }

    if (!stats.overall.targetsMet.routeChange) {
      recommendations.push(
        `🛣️ ルート変更時間改善 (現在: ${stats.routeChangeTime.average.toFixed(2)}ms):`,
        '  • React Router の最適化',
        '  • ルートレベルでのコードスプリッティング',
        '  • 状態管理の最適化',
        '  • 不要なエフェクトの削減',
        ''
      );
    }

    if (!stats.overall.targetsMet.component) {
      recommendations.push(
        `🧩 コンポーネント描画時間改善 (現在: ${stats.componentRenderTime.average.toFixed(2)}ms):`,
        '  • useMemo と useCallback の活用',
        '  • 仮想化 (Virtualization) の実装',
        '  • 重いコンポーネントの分割',
        '  • 不要な props の削減',
        ''
      );
    }

    if (!stats.overall.targetsMet.navigation) {
      recommendations.push(
        `🧭 ナビゲーション時間改善 (現在: ${stats.navigationTime.average.toFixed(2)}ms):`,
        '  • Service Worker の実装',
        '  • リソースのプリロード',
        '  • 重要でないリソースの遅延読み込み',
        '  • バンドルサイズの最適化',
        ''
      );
    }

    if (Object.values(stats.overall.targetsMet).every(met => met)) {
      recommendations.push('🎉 全ての応答時間目標をクリアしています！');
    }

    return recommendations;
  }

  /**
   * Core Web Vitalsの基準値チェック結果を取得
   */
  getCoreWebVitalsStatus(): {
    lcp: { value: number | null; passed: boolean; threshold: number };
    fid: { value: number | null; passed: boolean; threshold: number };
    cls: { value: number | null; passed: boolean; threshold: number };
    overall: boolean;
  } {
    const lcpMetrics = this.metrics.filter(m => m.name === 'LCP');
    const fidMetrics = this.metrics.filter(m => m.name === 'FID');
    const clsMetrics = this.metrics.filter(m => m.name === 'CLS');

    const lcpValue =
      lcpMetrics.length > 0 ? lcpMetrics[lcpMetrics.length - 1].value : null;
    const fidValue =
      fidMetrics.length > 0 ? fidMetrics[fidMetrics.length - 1].value : null;
    const clsValue =
      clsMetrics.length > 0 ? clsMetrics[clsMetrics.length - 1].value : null;

    const lcpPassed =
      lcpValue !== null ? lcpValue <= this.config.thresholds.LCP : false;
    const fidPassed =
      fidValue !== null ? fidValue <= this.config.thresholds.FID : false;
    const clsPassed =
      clsValue !== null ? clsValue <= this.config.thresholds.CLS : false;

    return {
      lcp: {
        value: lcpValue,
        passed: lcpPassed,
        threshold: this.config.thresholds.LCP,
      },
      fid: {
        value: fidValue,
        passed: fidPassed,
        threshold: this.config.thresholds.FID,
      },
      cls: {
        value: clsValue,
        passed: clsPassed,
        threshold: this.config.thresholds.CLS,
      },
      overall: lcpPassed && fidPassed && clsPassed,
    };
  }

  /**
   * Core Web Vitalsレポートを生成
   */
  generateCoreWebVitalsReport(): string {
    const status = this.getCoreWebVitalsStatus();

    let report = '📊 Core Web Vitals レポート\n';
    report += '================================\n\n';

    // LCP
    report += `🎯 LCP (Largest Contentful Paint)\n`;
    report += `   値: ${status.lcp.value?.toFixed(2) || 'N/A'}ms\n`;
    report += `   基準: ${status.lcp.threshold}ms\n`;
    report += `   結果: ${status.lcp.passed ? '✅ 合格' : '❌ 不合格'}\n\n`;

    // FID
    report += `⚡ FID (First Input Delay)\n`;
    report += `   値: ${status.fid.value?.toFixed(2) || 'N/A'}ms\n`;
    report += `   基準: ${status.fid.threshold}ms\n`;
    report += `   結果: ${status.fid.passed ? '✅ 合格' : '❌ 不合格'}\n\n`;

    // CLS
    report += `📐 CLS (Cumulative Layout Shift)\n`;
    report += `   値: ${status.cls.value?.toFixed(3) || 'N/A'}\n`;
    report += `   基準: ${status.cls.threshold}\n`;
    report += `   結果: ${status.cls.passed ? '✅ 合格' : '❌ 不合格'}\n\n`;

    // 総合結果
    report += `🏆 総合結果: ${status.overall ? '✅ 全基準クリア' : '❌ 改善が必要'}\n`;

    return report;
  }

  /**
   * パフォーマンス最適化の推奨事項を生成
   */
  generateOptimizationRecommendations(): string[] {
    const status = this.getCoreWebVitalsStatus();
    const recommendations: string[] = [];

    if (!status.lcp.passed && status.lcp.value) {
      recommendations.push(
        `🎯 LCP改善 (現在: ${status.lcp.value.toFixed(2)}ms):`,
        '  • 重要なリソースのプリロード (<link rel="preload">)',
        '  • 画像の最適化 (WebP形式、適切なサイズ)',
        '  • サーバー応答時間の改善',
        '  • 重要でないJavaScriptの遅延読み込み',
        ''
      );
    }

    if (!status.fid.passed && status.fid.value) {
      recommendations.push(
        `⚡ FID改善 (現在: ${status.fid.value.toFixed(2)}ms):`,
        '  • JavaScriptバンドルの分割',
        '  • 重い処理の Web Workers への移行',
        '  • 不要なポリフィルの削除',
        '  • コードスプリッティングの実装',
        ''
      );
    }

    if (!status.cls.passed && status.cls.value) {
      recommendations.push(
        `📐 CLS改善 (現在: ${status.cls.value.toFixed(3)}):`,
        '  • 画像・動画のサイズ属性指定',
        '  • フォント読み込み最適化 (font-display: swap)',
        '  • 動的コンテンツの事前領域確保',
        '  • 広告・埋め込みコンテンツのサイズ固定',
        ''
      );
    }

    if (status.overall) {
      recommendations.push('🎉 Core Web Vitalsは全て基準をクリアしています！');
    }

    return recommendations;
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
