/**
 * エラー率監視サービス
 * 継続監視項目: エラー率 < 1%
 *
 * リアルタイムでエラー率を計算し、1%を超えた場合にアラートを発生させる
 */

import { ErrorMonitoringService } from './error-monitoring';

// エラー率統計の型定義
export interface ErrorRateStats {
  totalRequests: number;
  totalErrors: number;
  errorRate: number; // パーセンテージ
  timeWindow: number; // 統計期間（分）
  timestamp: Date;
  breakdown: {
    [errorType: string]: {
      count: number;
      rate: number;
    };
  };
}

// エラー率アラートの型定義
export interface ErrorRateAlert {
  currentRate: number;
  threshold: number;
  timeWindow: number;
  timestamp: Date;
  severity: 'warning' | 'critical';
  details: {
    totalRequests: number;
    totalErrors: number;
    topErrors: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
}

// エラー率監視設定
export interface ErrorRateMonitorConfig {
  enabled: boolean;
  threshold: number; // エラー率の閾値（パーセンテージ）
  timeWindow: number; // 監視時間窓（分）
  checkInterval: number; // チェック間隔（秒）
  alertCooldown: number; // アラート送信間隔（分）
  enableConsoleLogging: boolean;
}

// リクエスト記録の型定義
interface RequestRecord {
  id: string;
  timestamp: Date;
  type: 'success' | 'error';
  errorType?: string;
  url?: string;
  userId?: string;
}

/**
 * エラー率監視クラス
 * リアルタイムでエラー率を監視し、閾値を超えた場合にアラートを発生
 */
export class ErrorRateMonitor {
  private requests: RequestRecord[] = [];
  private checkTimer: number | null = null;
  private lastAlertTime: Date | null = null;
  private config: ErrorRateMonitorConfig;
  private isMonitoring = false;

  // デフォルト設定
  private static readonly DEFAULT_CONFIG: ErrorRateMonitorConfig = {
    enabled: true,
    threshold: 1.0, // 1%
    timeWindow: 5, // 5分間
    checkInterval: 30, // 30秒ごと
    alertCooldown: 10, // 10分間
    enableConsoleLogging: import.meta.env.DEV,
  };

  constructor(config: Partial<ErrorRateMonitorConfig> = {}) {
    this.config = { ...ErrorRateMonitor.DEFAULT_CONFIG, ...config };
  }

  /**
   * エラー率監視を開始
   */
  startMonitoring(): void {
    if (!this.config.enabled || this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // 定期的なエラー率チェックを開始
    this.checkTimer = setInterval(() => {
      this.checkErrorRate();
    }, this.config.checkInterval * 1000);

    // 古いレコードのクリーンアップを開始
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60000); // 1分ごと

    if (this.config.enableConsoleLogging) {
      console.log('ErrorRateMonitor: エラー率監視を開始しました', {
        threshold: `${this.config.threshold}%`,
        timeWindow: `${this.config.timeWindow}分`,
        checkInterval: `${this.config.checkInterval}秒`,
      });
    }
  }

  /**
   * エラー率監視を停止
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
      console.log('ErrorRateMonitor: エラー率監視を停止しました');
    }
  }

  /**
   * 成功リクエストを記録
   */
  recordSuccess(url?: string, userId?: string): void {
    const record: RequestRecord = {
      id: this.generateRecordId(),
      timestamp: new Date(),
      type: 'success',
      url,
      userId,
    };

    this.requests.push(record);
    this.logRecord('SUCCESS', record);
  }

  /**
   * エラーリクエストを記録
   */
  recordError(errorType: string, url?: string, userId?: string): void {
    const record: RequestRecord = {
      id: this.generateRecordId(),
      timestamp: new Date(),
      type: 'error',
      errorType,
      url,
      userId,
    };

    this.requests.push(record);
    this.logRecord('ERROR', record);

    // エラー監視サービスにも記録
    ErrorMonitoringService.addBreadcrumb(
      `Error recorded: ${errorType}`,
      'error-rate-monitor',
      'error'
    );
  }

  /**
   * API呼び出しの結果を記録
   */
  recordApiCall(
    success: boolean,
    endpoint: string,
    errorType?: string,
    userId?: string
  ): void {
    if (success) {
      this.recordSuccess(endpoint, userId);
    } else {
      this.recordError(errorType || 'api-error', endpoint, userId);
    }
  }

  /**
   * ページ読み込みの結果を記録
   */
  recordPageLoad(success: boolean, url?: string, errorType?: string): void {
    if (success) {
      this.recordSuccess(url);
    } else {
      this.recordError(errorType || 'page-load-error', url);
    }
  }

  /**
   * 現在のエラー率統計を取得
   */
  getCurrentStats(): ErrorRateStats {
    const now = new Date();
    const timeWindowMs = this.config.timeWindow * 60 * 1000;
    const cutoffTime = new Date(now.getTime() - timeWindowMs);

    // 時間窓内のリクエストをフィルタ
    const recentRequests = this.requests.filter(
      record => record.timestamp >= cutoffTime
    );

    const totalRequests = recentRequests.length;
    const errorRequests = recentRequests.filter(
      record => record.type === 'error'
    );
    const totalErrors = errorRequests.length;

    const errorRate =
      totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // エラータイプ別の内訳を計算
    const breakdown: { [errorType: string]: { count: number; rate: number } } =
      {};
    errorRequests.forEach(record => {
      const errorType = record.errorType || 'unknown';
      if (!breakdown[errorType]) {
        breakdown[errorType] = { count: 0, rate: 0 };
      }
      breakdown[errorType].count++;
      breakdown[errorType].rate =
        (breakdown[errorType].count / totalRequests) * 100;
    });

    return {
      totalRequests,
      totalErrors,
      errorRate,
      timeWindow: this.config.timeWindow,
      timestamp: now,
      breakdown,
    };
  }

  /**
   * エラー率をチェックし、必要に応じてアラートを発生
   */
  private checkErrorRate(): void {
    const stats = this.getCurrentStats();

    if (this.config.enableConsoleLogging) {
      console.log(
        `ErrorRateMonitor: 現在のエラー率 ${stats.errorRate.toFixed(2)}%`,
        {
          totalRequests: stats.totalRequests,
          totalErrors: stats.totalErrors,
          threshold: `${this.config.threshold}%`,
        }
      );
    }

    // 閾値チェック
    if (stats.errorRate > this.config.threshold) {
      this.handleErrorRateExceeded(stats);
    }
  }

  /**
   * エラー率が閾値を超えた場合の処理
   */
  private handleErrorRateExceeded(stats: ErrorRateStats): void {
    // アラートクールダウンチェック
    if (this.lastAlertTime) {
      const cooldownMs = this.config.alertCooldown * 60 * 1000;
      const timeSinceLastAlert = Date.now() - this.lastAlertTime.getTime();

      if (timeSinceLastAlert < cooldownMs) {
        return; // クールダウン中はアラートを送信しない
      }
    }

    const severity: 'warning' | 'critical' =
      stats.errorRate > this.config.threshold * 2 ? 'critical' : 'warning';

    // トップエラーを計算
    const topErrors = Object.entries(stats.breakdown)
      .map(([type, data]) => ({
        type,
        count: data.count,
        percentage: data.rate,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const alert: ErrorRateAlert = {
      currentRate: stats.errorRate,
      threshold: this.config.threshold,
      timeWindow: this.config.timeWindow,
      timestamp: stats.timestamp,
      severity,
      details: {
        totalRequests: stats.totalRequests,
        totalErrors: stats.totalErrors,
        topErrors,
      },
    };

    this.sendAlert(alert);
    this.lastAlertTime = new Date();
  }

  /**
   * アラートを送信
   */
  private sendAlert(alert: ErrorRateAlert): void {
    const message = `🚨 エラー率アラート: ${alert.currentRate.toFixed(2)}% (閾値: ${alert.threshold}%)`;

    console.error(message, alert);

    // エラー監視サービスにアラートを記録
    ErrorMonitoringService.captureMessage(
      `Error rate exceeded: ${alert.currentRate.toFixed(2)}%`,
      'error'
    );

    // 外部監視システムへの通知
    this.notifyExternalSystems(alert);

    // ダッシュボードへの通知
    this.notifyDashboard(alert);
  }

  /**
   * 外部監視システムへの通知
   */
  private notifyExternalSystems(alert: ErrorRateAlert): void {
    // Sentry、Slack、メール等への通知
    if (this.config.enableConsoleLogging) {
      console.log('External systems notified:', alert);
    }

    // 実際の実装では、以下のような通知を行う：
    // - Slack webhook
    // - メール送信
    // - PagerDuty
    // - Discord webhook
    // - Teams webhook
  }

  /**
   * ダッシュボードへの通知
   */
  private notifyDashboard(alert: ErrorRateAlert): void {
    // リアルタイムダッシュボードへの通知
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent('error-rate-alert', {
        detail: alert,
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * 古いレコードをクリーンアップ
   */
  private cleanupOldRecords(): void {
    const now = new Date();
    const maxAge = this.config.timeWindow * 2 * 60 * 1000; // 時間窓の2倍の期間
    const cutoffTime = new Date(now.getTime() - maxAge);

    const beforeCount = this.requests.length;
    this.requests = this.requests.filter(
      record => record.timestamp >= cutoffTime
    );
    const afterCount = this.requests.length;

    if (this.config.enableConsoleLogging && beforeCount !== afterCount) {
      console.log(
        `ErrorRateMonitor: 古いレコードをクリーンアップ (${beforeCount} → ${afterCount})`
      );
    }
  }

  /**
   * エラー率レポートを生成
   */
  generateErrorRateReport(): string {
    const stats = this.getCurrentStats();

    let report = '📊 エラー率監視レポート\n';
    report += '================================\n\n';

    // 基本統計
    report += `📈 基本統計 (過去${stats.timeWindow}分間)\n`;
    report += `   総リクエスト数: ${stats.totalRequests.toLocaleString()}\n`;
    report += `   エラー数: ${stats.totalErrors.toLocaleString()}\n`;
    report += `   エラー率: ${stats.errorRate.toFixed(2)}%\n`;
    report += `   閾値: ${this.config.threshold}%\n`;
    report += `   ステータス: ${stats.errorRate <= this.config.threshold ? '✅ 正常' : '❌ 閾値超過'}\n\n`;

    // エラータイプ別内訳
    if (Object.keys(stats.breakdown).length > 0) {
      report += `🔍 エラータイプ別内訳\n`;
      Object.entries(stats.breakdown)
        .sort(([, a], [, b]) => b.count - a.count)
        .forEach(([errorType, data]) => {
          report += `   ${errorType}: ${data.count}件 (${data.rate.toFixed(2)}%)\n`;
        });
      report += '\n';
    }

    // 推奨アクション
    report += `💡 推奨アクション\n`;
    if (stats.errorRate <= this.config.threshold) {
      report += `   現在のエラー率は正常範囲内です。継続監視を続けてください。\n`;
    } else {
      report += `   エラー率が閾値を超えています。以下の対応を検討してください：\n`;
      report += `   • 最も頻発するエラーの原因調査\n`;
      report += `   • サーバーリソースの確認\n`;
      report += `   • ネットワーク接続の確認\n`;
      report += `   • 最近のデプロイメントの確認\n`;
      report += `   • ユーザーフィードバックの確認\n`;
    }

    report += `\n生成日時: ${stats.timestamp.toLocaleString()}\n`;

    return report;
  }

  /**
   * エラー率トレンドデータを取得
   */
  getErrorRateTrend(intervalMinutes: number = 1): Array<{
    timestamp: Date;
    errorRate: number;
    totalRequests: number;
    totalErrors: number;
  }> {
    const now = new Date();
    const intervalMs = intervalMinutes * 60 * 1000;
    const trend: Array<{
      timestamp: Date;
      errorRate: number;
      totalRequests: number;
      totalErrors: number;
    }> = [];

    // 時間窓を間隔で分割
    for (let i = 0; i < this.config.timeWindow; i += intervalMinutes) {
      const endTime = new Date(now.getTime() - i * 60 * 1000);
      const startTime = new Date(endTime.getTime() - intervalMs);

      const intervalRequests = this.requests.filter(
        record => record.timestamp >= startTime && record.timestamp < endTime
      );

      const totalRequests = intervalRequests.length;
      const totalErrors = intervalRequests.filter(
        r => r.type === 'error'
      ).length;
      const errorRate =
        totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

      trend.unshift({
        timestamp: endTime,
        errorRate,
        totalRequests,
        totalErrors,
      });
    }

    return trend;
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<ErrorRateMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enableConsoleLogging) {
      console.log('ErrorRateMonitor: 設定を更新しました', this.config);
    }
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): ErrorRateMonitorConfig {
    return { ...this.config };
  }

  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.requests = [];
    this.lastAlertTime = null;

    if (this.config.enableConsoleLogging) {
      console.log('ErrorRateMonitor: 統計をリセットしました');
    }
  }

  /**
   * レコードIDを生成
   */
  private generateRecordId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * レコードをログ出力
   */
  private logRecord(type: 'SUCCESS' | 'ERROR', record: RequestRecord): void {
    if (!this.config.enableConsoleLogging) {
      return;
    }

    const emoji = type === 'SUCCESS' ? '✅' : '❌';
    console.log(`${emoji} ${type}: ${record.url || 'unknown'} (${record.id})`);
  }
}

// シングルトンインスタンス
let errorRateMonitorInstance: ErrorRateMonitor | null = null;

/**
 * エラー率監視インスタンスを取得
 */
export function getErrorRateMonitor(
  config?: Partial<ErrorRateMonitorConfig>
): ErrorRateMonitor {
  if (!errorRateMonitorInstance) {
    errorRateMonitorInstance = new ErrorRateMonitor(config);
  }
  return errorRateMonitorInstance;
}

/**
 * シングルトンインスタンスをリセット（テスト用）
 */
export function resetErrorRateMonitorInstance(): void {
  if (errorRateMonitorInstance) {
    errorRateMonitorInstance.stopMonitoring();
    errorRateMonitorInstance = null;
  }
}

/**
 * エラー率監視を初期化して開始
 */
export function initializeErrorRateMonitoring(
  config?: Partial<ErrorRateMonitorConfig>
): ErrorRateMonitor {
  const monitor = getErrorRateMonitor(config);
  monitor.startMonitoring();
  return monitor;
}

/**
 * グローバルエラーハンドラーを設定
 */
export function setupGlobalErrorTracking(): void {
  const monitor = getErrorRateMonitor();

  // JavaScript エラーをキャッチ
  window.addEventListener('error', () => {
    monitor.recordError('javascript-error', window.location.href);
  });

  // Promise rejection をキャッチ
  window.addEventListener('unhandledrejection', () => {
    monitor.recordError('promise-rejection', window.location.href);
  });

  // Fetch API をラップしてエラーを追跡
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);

      if (response.ok) {
        monitor.recordSuccess(args[0]?.toString());
      } else {
        monitor.recordError(`http-${response.status}`, args[0]?.toString());
      }

      return response;
    } catch (error) {
      monitor.recordError('network-error', args[0]?.toString());
      throw error;
    }
  };
}
