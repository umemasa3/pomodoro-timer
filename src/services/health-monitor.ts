/**
 * ヘルスチェック・監視システム
 * データベース、認証、リアルタイム接続の健全性を監視し、自動アラート機能を提供
 */

import { supabase } from './supabase';

// ヘルスチェック結果の型定義
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

// ヘルスチェック設定
export interface HealthMonitorConfig {
  enabled: boolean;
  checkInterval: number; // ms
  timeout: number; // ms
  retryAttempts: number;
  alertThresholds: {
    responseTime: number; // ms
    errorRate: number; // 0-1
    consecutiveFailures: number;
  };
  enableConsoleLogging: boolean;
}

// アラートの型定義
export interface HealthAlert {
  checkName: string;
  status: 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  severity: 'warning' | 'critical';
  details?: Record<string, any>;
}

// ヘルスチェック統計
export interface HealthStats {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number; // 0-1
  lastFailure?: Date;
}

/**
 * ヘルスモニタークラス
 * システムの各コンポーネントの健全性を定期的にチェック
 */
export class HealthMonitor {
  private config: HealthMonitorConfig;
  private checkTimer: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private healthHistory: Map<string, HealthCheck[]> = new Map();
  private alertHistory: HealthAlert[] = [];
  private consecutiveFailures: Map<string, number> = new Map();

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: HealthMonitorConfig = {
    enabled: true,
    checkInterval: 60000, // 1分
    timeout: 10000, // 10秒
    retryAttempts: 3,
    alertThresholds: {
      responseTime: 5000, // 5秒
      errorRate: 0.1, // 10%
      consecutiveFailures: 3,
    },
    enableConsoleLogging: process.env.NODE_ENV === 'development',
  };

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    this.config = { ...HealthMonitor.DEFAULT_CONFIG, ...config };
  }

  /**
   * ヘルスチェック監視を開始
   */
  startMonitoring(): void {
    if (!this.config.enabled || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // 初回チェックを即座に実行
    this.performAllHealthChecks();

    // 定期的なヘルスチェックを開始
    this.checkTimer = setInterval(() => {
      this.performAllHealthChecks();
    }, this.config.checkInterval);

    if (this.config.enableConsoleLogging) {
      console.log('HealthMonitor: 監視を開始しました');
    }
  }

  /**
   * ヘルスチェック監視を停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    if (this.config.enableConsoleLogging) {
      console.log('HealthMonitor: 監視を停止しました');
    }
  }

  /**
   * すべてのヘルスチェックを実行
   */
  async performAllHealthChecks(): Promise<HealthCheck[]> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnection(),
      this.checkAuthService(),
      this.checkRealtimeConnection(),
      this.checkStorageService(),
      this.checkExternalAPIs(),
      this.checkBrowserAPIs(),
    ]);

    const results: HealthCheck[] = [];
    const checkNames = [
      'database',
      'auth',
      'realtime',
      'storage',
      'external-apis',
      'browser-apis',
    ];

    checks.forEach((result, index) => {
      const checkName = checkNames[index];
      let healthCheck: HealthCheck;

      if (result.status === 'fulfilled') {
        healthCheck = result.value;
      } else {
        healthCheck = {
          name: checkName,
          status: 'unhealthy',
          lastCheck: new Date(),
          error: result.reason?.message || 'Unknown error',
        };
      }

      results.push(healthCheck);
      this.recordHealthCheck(healthCheck);
    });

    return results;
  }

  /**
   * データベース接続チェック
   */
  async checkDatabaseConnection(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'database';

    try {
      // 軽量なクエリでデータベース接続を確認
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - start;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return {
        name: checkName,
        status:
          responseTime > this.config.alertThresholds.responseTime
            ? 'degraded'
            : 'healthy',
        lastCheck: new Date(),
        responseTime,
        details: {
          queryType: 'count',
          recordsReturned: data?.length || 0,
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * 認証サービスチェック
   */
  async checkAuthService(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'auth';

    try {
      // 現在のセッション状態を確認
      const { data: session, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - start;

      if (error) {
        throw new Error(`Auth service error: ${error.message}`);
      }

      return {
        name: checkName,
        status:
          responseTime > this.config.alertThresholds.responseTime
            ? 'degraded'
            : 'healthy',
        lastCheck: new Date(),
        responseTime,
        details: {
          hasSession: !!session.session,
          sessionValid: session.session
            ? !this.isSessionExpired(session.session)
            : false,
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown auth error',
      };
    }
  }

  /**
   * リアルタイム接続チェック
   */
  async checkRealtimeConnection(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'realtime';

    try {
      // Supabaseのリアルタイム接続状態を確認
      const channels = supabase.getChannels();
      const responseTime = Date.now() - start;

      // アクティブなチャンネルの状態を確認
      const activeChannels = channels.filter(
        channel => channel.state === 'joined' || channel.state === 'joining'
      );

      const hasHealthyConnections = activeChannels.length > 0;

      return {
        name: checkName,
        status: hasHealthyConnections ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        responseTime,
        details: {
          totalChannels: channels.length,
          activeChannels: activeChannels.length,
          channelStates: channels.map(ch => ({
            topic: ch.topic,
            state: ch.state,
          })),
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error:
          error instanceof Error ? error.message : 'Unknown realtime error',
      };
    }
  }

  /**
   * ストレージサービスチェック
   */
  async checkStorageService(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'storage';

    try {
      // ストレージバケットの一覧を取得してサービスの健全性を確認
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const responseTime = Date.now() - start;

      if (error) {
        throw new Error(`Storage service error: ${error.message}`);
      }

      return {
        name: checkName,
        status:
          responseTime > this.config.alertThresholds.responseTime
            ? 'degraded'
            : 'healthy',
        lastCheck: new Date(),
        responseTime,
        details: {
          bucketsCount: buckets?.length || 0,
          buckets: buckets?.map(bucket => bucket.name) || [],
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown storage error',
      };
    }
  }

  /**
   * 外部APIチェック
   */
  async checkExternalAPIs(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'external-apis';

    try {
      // Supabase APIの基本的な接続確認
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: 'HEAD',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        }
      );

      const responseTime = Date.now() - start;

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      return {
        name: checkName,
        status:
          responseTime > this.config.alertThresholds.responseTime
            ? 'degraded'
            : 'healthy',
        lastCheck: new Date(),
        responseTime,
        details: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown API error',
      };
    }
  }

  /**
   * ブラウザAPIチェック
   */
  async checkBrowserAPIs(): Promise<HealthCheck> {
    const start = Date.now();
    const checkName = 'browser-apis';

    try {
      const checks = {
        localStorage: this.checkLocalStorage(),
        sessionStorage: this.checkSessionStorage(),
        indexedDB: await this.checkIndexedDB(),
        notifications: this.checkNotificationAPI(),
        performance: this.checkPerformanceAPI(),
      };

      const responseTime = Date.now() - start;
      const failedChecks = Object.entries(checks).filter(
        ([, result]) => !result
      );
      const status =
        failedChecks.length === 0
          ? 'healthy'
          : failedChecks.length <= 2
            ? 'degraded'
            : 'unhealthy';

      return {
        name: checkName,
        status,
        lastCheck: new Date(),
        responseTime,
        details: {
          checks,
          failedChecks: failedChecks.map(([name]) => name),
        },
      };
    } catch (error) {
      return {
        name: checkName,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: Date.now() - start,
        error:
          error instanceof Error ? error.message : 'Unknown browser API error',
      };
    }
  }

  /**
   * ヘルスチェック結果を記録
   */
  private recordHealthCheck(healthCheck: HealthCheck): void {
    // 履歴に追加
    if (!this.healthHistory.has(healthCheck.name)) {
      this.healthHistory.set(healthCheck.name, []);
    }

    const history = this.healthHistory.get(healthCheck.name)!;
    history.push(healthCheck);

    // 履歴は最新100件まで保持
    if (history.length > 100) {
      history.shift();
    }

    // 連続失敗回数を更新
    if (healthCheck.status === 'unhealthy') {
      const failures = this.consecutiveFailures.get(healthCheck.name) || 0;
      this.consecutiveFailures.set(healthCheck.name, failures + 1);
    } else {
      this.consecutiveFailures.set(healthCheck.name, 0);
    }

    // アラートチェック
    this.checkForAlerts(healthCheck);

    // ログ出力
    if (this.config.enableConsoleLogging) {
      const statusIcon =
        healthCheck.status === 'healthy'
          ? '✅'
          : healthCheck.status === 'degraded'
            ? '⚠️'
            : '❌';
      console.log(
        `HealthCheck ${statusIcon} ${healthCheck.name}: ${healthCheck.status}`,
        healthCheck
      );
    }
  }

  /**
   * アラート条件をチェック
   */
  private checkForAlerts(healthCheck: HealthCheck): void {
    const failures = this.consecutiveFailures.get(healthCheck.name) || 0;

    // 連続失敗によるアラート
    if (failures >= this.config.alertThresholds.consecutiveFailures) {
      this.generateAlert({
        checkName: healthCheck.name,
        status: 'unhealthy',
        message: `${healthCheck.name}が${failures}回連続で失敗しています`,
        timestamp: new Date(),
        severity: 'critical',
        details: {
          consecutiveFailures: failures,
          lastError: healthCheck.error,
        },
      });
    }

    // 応答時間によるアラート
    if (
      healthCheck.responseTime &&
      healthCheck.responseTime > this.config.alertThresholds.responseTime
    ) {
      this.generateAlert({
        checkName: healthCheck.name,
        status: 'degraded',
        message: `${healthCheck.name}の応答時間が閾値を超えています (${healthCheck.responseTime}ms)`,
        timestamp: new Date(),
        severity: 'warning',
        details: {
          responseTime: healthCheck.responseTime,
          threshold: this.config.alertThresholds.responseTime,
        },
      });
    }
  }

  /**
   * アラートを生成
   */
  private generateAlert(alert: HealthAlert): void {
    this.alertHistory.push(alert);

    // アラート履歴は最新50件まで保持
    if (this.alertHistory.length > 50) {
      this.alertHistory.shift();
    }

    // ログ出力
    if (this.config.enableConsoleLogging) {
      const severityIcon = alert.severity === 'critical' ? '🚨' : '⚠️';
      console.warn(
        `HealthAlert ${severityIcon} [${alert.severity}]: ${alert.message}`,
        alert
      );
    }

    // 外部アラートシステムへの通知
    this.sendAlert(alert);
  }

  /**
   * アラートを外部システムに送信
   */
  private sendAlert(alert: HealthAlert): void {
    // 実際の送信処理（実装は環境に依存）
    // 例: Slack, Discord, メール通知等
    if (this.config.enableConsoleLogging) {
      console.log('Alert sent to external system:', alert);
    }
  }

  /**
   * セッションの有効期限チェック
   */
  private isSessionExpired(session: any): boolean {
    if (!session.expires_at) return false;
    return new Date(session.expires_at * 1000) < new Date();
  }

  /**
   * LocalStorageの動作確認
   */
  private checkLocalStorage(): boolean {
    try {
      const testKey = 'health-check-test';
      const testValue = 'test-value';
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * SessionStorageの動作確認
   */
  private checkSessionStorage(): boolean {
    try {
      const testKey = 'health-check-test';
      const testValue = 'test-value';
      sessionStorage.setItem(testKey, testValue);
      const retrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * IndexedDBの動作確認
   */
  private async checkIndexedDB(): Promise<boolean> {
    try {
      if (!('indexedDB' in window)) return false;

      return new Promise(resolve => {
        const request = indexedDB.open('health-check-test', 1);
        request.onerror = () => resolve(false);
        request.onsuccess = event => {
          const db = (event.target as IDBOpenDBRequest).result;
          db.close();
          indexedDB.deleteDatabase('health-check-test');
          resolve(true);
        };
      });
    } catch {
      return false;
    }
  }

  /**
   * Notification APIの動作確認
   */
  private checkNotificationAPI(): boolean {
    return 'Notification' in window;
  }

  /**
   * Performance APIの動作確認
   */
  private checkPerformanceAPI(): boolean {
    return 'performance' in window && 'now' in performance;
  }

  /**
   * 現在のヘルス状態を取得
   */
  getCurrentHealth(): Record<string, HealthCheck> {
    const currentHealth: Record<string, HealthCheck> = {};

    this.healthHistory.forEach((history, name) => {
      if (history.length > 0) {
        currentHealth[name] = history[history.length - 1];
      }
    });

    return currentHealth;
  }

  /**
   * ヘルス統計を取得
   */
  getHealthStats(checkName?: string): Record<string, HealthStats> {
    const stats: Record<string, HealthStats> = {};

    const checkNames = checkName
      ? [checkName]
      : Array.from(this.healthHistory.keys());

    checkNames.forEach(name => {
      const history = this.healthHistory.get(name) || [];
      if (history.length === 0) return;

      const totalChecks = history.length;
      const successfulChecks = history.filter(
        check => check.status === 'healthy'
      ).length;
      const failedChecks = totalChecks - successfulChecks;

      const responseTimes = history
        .filter(check => check.responseTime !== undefined)
        .map(check => check.responseTime!);

      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      const uptime = successfulChecks / totalChecks;

      const lastFailure = history
        .slice()
        .reverse()
        .find(check => check.status === 'unhealthy')?.lastCheck;

      stats[name] = {
        totalChecks,
        successfulChecks,
        failedChecks,
        averageResponseTime,
        uptime,
        lastFailure,
      };
    });

    return stats;
  }

  /**
   * アラート履歴を取得
   */
  getAlertHistory(limit?: number): HealthAlert[] {
    const alerts = [...this.alertHistory].reverse();
    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<HealthMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enableConsoleLogging) {
      console.log('HealthMonitor: 設定を更新しました', this.config);
    }

    // 監視中の場合は再起動
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * 手動でヘルスチェックを実行
   */
  async runHealthCheck(checkName?: string): Promise<HealthCheck[]> {
    if (checkName) {
      // 特定のチェックのみ実行
      switch (checkName) {
        case 'database':
          return [await this.checkDatabaseConnection()];
        case 'auth':
          return [await this.checkAuthService()];
        case 'realtime':
          return [await this.checkRealtimeConnection()];
        case 'storage':
          return [await this.checkStorageService()];
        case 'external-apis':
          return [await this.checkExternalAPIs()];
        case 'browser-apis':
          return [await this.checkBrowserAPIs()];
        default:
          throw new Error(`Unknown health check: ${checkName}`);
      }
    } else {
      // すべてのチェックを実行
      return await this.performAllHealthChecks();
    }
  }
}

// シングルトンインスタンス
let healthMonitorInstance: HealthMonitor | null = null;

/**
 * ヘルスモニターインスタンスを取得
 */
export function getHealthMonitor(
  config?: Partial<HealthMonitorConfig>
): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor(config);
  }
  return healthMonitorInstance;
}

/**
 * ヘルスモニターを初期化して開始
 */
export function initializeHealthMonitoring(
  config?: Partial<HealthMonitorConfig>
): HealthMonitor {
  const monitor = getHealthMonitor(config);
  monitor.startMonitoring();
  return monitor;
}
