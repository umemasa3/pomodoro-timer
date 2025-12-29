/**
 * 監視・ログサービス
 * 要件12.6: エラーハンドリング・監視の実装
 */

export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTimes: Record<string, number[]>;
  renderTimes: Record<string, number>;
  memoryUsage?: number;
  networkStatus: 'online' | 'offline';
  timestamp: string;
}

export interface UserActivity {
  userId?: string;
  action: string;
  component?: string;
  duration?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface SystemHealth {
  isOnline: boolean;
  lastSyncTime?: string;
  pendingOperations: number;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage?: number;
  timestamp: string;
}

/**
 * 監視サービス
 */
export class MonitoringService {
  private static instance: MonitoringService;
  private performanceMetrics: PerformanceMetrics[] = [];
  private userActivities: UserActivity[] = [];
  private apiResponseTimes: Map<string, number[]> = new Map();
  private renderTimes: Map<string, number> = new Map();
  private isMonitoring: boolean = false;
  private performanceObserver?: PerformanceObserver;

  private constructor() {
    this.initializePerformanceMonitoring();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * 監視を開始
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.initializePerformanceMonitoring();
    this.startPeriodicHealthCheck();

    console.log('📊 監視サービスが開始されました');
  }

  /**
   * 監視を停止
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    console.log('📊 監視サービスが停止されました');
  }

  /**
   * パフォーマンス監視を初期化
   */
  private initializePerformanceMonitoring(): void {
    // Performance Observer API を使用してパフォーマンスを監視
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();

        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            this.recordPageLoadTime(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'measure') {
            this.recordCustomMeasure(entry);
          }
        });
      });

      try {
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'measure', 'paint'],
        });
      } catch (error) {
        console.warn('Performance Observer の初期化に失敗:', error);
      }
    }

    // ページロード時間を記録
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.recordInitialPageLoadMetrics();
      }, 100);
    });
  }

  /**
   * 初期ページロードメトリクスを記録
   */
  private recordInitialPageLoadMetrics(): void {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    if (navigation) {
      this.recordPageLoadTime(navigation);
    }

    // Paint メトリクスを記録
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      this.renderTimes.set(entry.name, entry.startTime);
    });
  }

  /**
   * ページロード時間を記録
   */
  private recordPageLoadTime(navigation: PerformanceNavigationTiming): void {
    const metrics: PerformanceMetrics = {
      pageLoadTime:
        navigation.loadEventEnd - (navigation as any).navigationStart,
      apiResponseTimes: Object.fromEntries(this.apiResponseTimes),
      renderTimes: Object.fromEntries(this.renderTimes),
      networkStatus: navigator.onLine ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    };

    // メモリ使用量を記録（対応ブラウザのみ）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metrics.memoryUsage = memory.usedJSHeapSize;
    }

    this.performanceMetrics.push(metrics);
    this.trimMetricsHistory();
  }

  /**
   * カスタム測定を記録
   */
  private recordCustomMeasure(entry: PerformanceEntry): void {
    this.renderTimes.set(entry.name, entry.duration);
  }

  /**
   * API レスポンス時間を記録
   */
  recordApiCall(endpoint: string, duration: number): void {
    if (!this.apiResponseTimes.has(endpoint)) {
      this.apiResponseTimes.set(endpoint, []);
    }

    const times = this.apiResponseTimes.get(endpoint)!;
    times.push(duration);

    // 最新100件のみ保持
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * ユーザーアクティビティを記録
   */
  recordUserActivity(activity: Omit<UserActivity, 'timestamp'>): void {
    const userActivity: UserActivity = {
      ...activity,
      timestamp: new Date().toISOString(),
    };

    this.userActivities.push(userActivity);
    this.trimActivityHistory();
  }

  /**
   * コンポーネントのレンダリング時間を測定開始
   */
  startRenderMeasure(componentName: string): void {
    performance.mark(`${componentName}-render-start`);
  }

  /**
   * コンポーネントのレンダリング時間を測定終了
   */
  endRenderMeasure(componentName: string): void {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    const measureName = `${componentName}-render-duration`;

    performance.mark(endMark);

    try {
      performance.measure(measureName, startMark, endMark);

      // 測定結果を取得
      const measure = performance.getEntriesByName(measureName)[0];
      if (measure) {
        this.renderTimes.set(componentName, measure.duration);
      }
    } catch (error) {
      console.warn(`レンダリング時間の測定に失敗: ${componentName}`, error);
    }
  }

  /**
   * システムヘルス状態を取得
   */
  getSystemHealth(): SystemHealth {
    const now = new Date().toISOString();

    // エラー率を計算（簡易版）
    const recentActivities = this.userActivities.slice(-100);
    const errorActivities = recentActivities.filter(
      activity =>
        activity.action.includes('error') || activity.action.includes('fail')
    );
    const errorRate =
      recentActivities.length > 0
        ? (errorActivities.length / recentActivities.length) * 100
        : 0;

    // 平均レスポンス時間を計算
    const allResponseTimes: number[] = [];
    this.apiResponseTimes.forEach(times => {
      allResponseTimes.push(...times.slice(-10)); // 最新10件
    });
    const averageResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((sum, time) => sum + time, 0) /
          allResponseTimes.length
        : 0;

    // メモリ使用量を取得
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize;
    }

    return {
      isOnline: navigator.onLine,
      lastSyncTime: this.getLastSyncTime(),
      pendingOperations: this.getPendingOperationsCount(),
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      memoryUsage,
      timestamp: now,
    };
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStatistics(): {
    averagePageLoadTime: number;
    averageApiResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
    renderPerformance: Array<{ component: string; averageTime: number }>;
    memoryTrend: Array<{ timestamp: string; usage: number }>;
  } {
    // 平均ページロード時間
    const averagePageLoadTime =
      this.performanceMetrics.length > 0
        ? this.performanceMetrics.reduce((sum, m) => sum + m.pageLoadTime, 0) /
          this.performanceMetrics.length
        : 0;

    // 平均API レスポンス時間
    const allApiTimes: number[] = [];
    this.apiResponseTimes.forEach(times => allApiTimes.push(...times));
    const averageApiResponseTime =
      allApiTimes.length > 0
        ? allApiTimes.reduce((sum, time) => sum + time, 0) / allApiTimes.length
        : 0;

    // 最も遅いエンドポイント
    const slowestEndpoints = Array.from(this.apiResponseTimes.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    // レンダリングパフォーマンス
    const renderPerformance = Array.from(this.renderTimes.entries())
      .map(([component, time]) => ({
        component,
        averageTime: time,
      }))
      .sort((a, b) => b.averageTime - a.averageTime);

    // メモリ使用量の推移
    const memoryTrend = this.performanceMetrics
      .filter(m => m.memoryUsage !== undefined)
      .map(m => ({
        timestamp: m.timestamp,
        usage: m.memoryUsage!,
      }));

    return {
      averagePageLoadTime: Math.round(averagePageLoadTime),
      averageApiResponseTime: Math.round(averageApiResponseTime),
      slowestEndpoints,
      renderPerformance,
      memoryTrend,
    };
  }

  /**
   * ユーザーアクティビティ統計を取得
   */
  getUserActivityStatistics(): {
    totalActivities: number;
    mostCommonActions: Array<{ action: string; count: number }>;
    activityByHour: Record<number, number>;
    averageSessionDuration: number;
  } {
    const actionCounts: Record<string, number> = {};
    const activityByHour: Record<number, number> = {};

    // 時間別アクティビティを初期化
    for (let i = 0; i < 24; i++) {
      activityByHour[i] = 0;
    }

    this.userActivities.forEach(activity => {
      // アクション別カウント
      actionCounts[activity.action] = (actionCounts[activity.action] || 0) + 1;

      // 時間別アクティビティ
      const hour = new Date(activity.timestamp).getHours();
      activityByHour[hour]++;
    });

    // 最も多いアクション
    const mostCommonActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 平均セッション時間（簡易計算）
    const sessionsWithDuration = this.userActivities.filter(a => a.duration);
    const averageSessionDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) /
          sessionsWithDuration.length
        : 0;

    return {
      totalActivities: this.userActivities.length,
      mostCommonActions,
      activityByHour,
      averageSessionDuration: Math.round(averageSessionDuration),
    };
  }

  /**
   * 定期的なヘルスチェックを開始
   */
  private startPeriodicHealthCheck(): void {
    setInterval(() => {
      if (!this.isMonitoring) return;

      const health = this.getSystemHealth();

      // 重要な問題を検出した場合の警告
      if (health.errorRate > 10) {
        console.warn('⚠️ 高いエラー率を検出:', health.errorRate + '%');
      }

      if (health.averageResponseTime > 5000) {
        console.warn(
          '⚠️ 遅いレスポンス時間を検出:',
          health.averageResponseTime + 'ms'
        );
      }

      if (health.memoryUsage && health.memoryUsage > 100 * 1024 * 1024) {
        // 100MB
        console.warn(
          '⚠️ 高いメモリ使用量を検出:',
          Math.round(health.memoryUsage / 1024 / 1024) + 'MB'
        );
      }
    }, 60000); // 1分ごと
  }

  /**
   * 最後の同期時間を取得
   */
  private getLastSyncTime(): string | undefined {
    // 実際の実装では、RealtimeSyncService から取得
    return localStorage.getItem('lastSyncTime') || undefined;
  }

  /**
   * 保留中の操作数を取得
   */
  private getPendingOperationsCount(): number {
    // 実際の実装では、RealtimeSyncService から取得
    try {
      const pendingChanges = localStorage.getItem('pendingChanges');
      return pendingChanges ? JSON.parse(pendingChanges).length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * メトリクス履歴をトリム
   */
  private trimMetricsHistory(): void {
    // 最新1000件のみ保持
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  /**
   * アクティビティ履歴をトリム
   */
  private trimActivityHistory(): void {
    // 最新5000件のみ保持
    if (this.userActivities.length > 5000) {
      this.userActivities = this.userActivities.slice(-5000);
    }
  }

  /**
   * 監視データをエクスポート
   */
  exportMonitoringData(): {
    performanceMetrics: PerformanceMetrics[];
    userActivities: UserActivity[];
    systemHealth: SystemHealth;
    statistics: {
      performance: ReturnType<MonitoringService['getPerformanceStatistics']>;
      userActivity: ReturnType<MonitoringService['getUserActivityStatistics']>;
    };
  } {
    return {
      performanceMetrics: this.performanceMetrics,
      userActivities: this.userActivities,
      systemHealth: this.getSystemHealth(),
      statistics: {
        performance: this.getPerformanceStatistics(),
        userActivity: this.getUserActivityStatistics(),
      },
    };
  }

  /**
   * 監視データをクリア
   */
  clearMonitoringData(): void {
    this.performanceMetrics = [];
    this.userActivities = [];
    this.apiResponseTimes.clear();
    this.renderTimes.clear();
  }
}

// シングルトンインスタンスをエクスポート
export const monitoringService = MonitoringService.getInstance();
