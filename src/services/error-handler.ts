/**
 * 包括的なエラーハンドリングサービス
 * 要件12.6: エラーハンドリング・監視の実装
 */

export interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  additionalData?: Record<string, any>;
}

export interface ErrorReport {
  id: string;
  type: ErrorType;
  message: string;
  stack?: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  createdAt: string;
}

export type ErrorType =
  | 'network'
  | 'database'
  | 'authentication'
  | 'validation'
  | 'ui'
  | 'sync'
  | 'unknown';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * エラーハンドリングサービス
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private retryQueue: Map<
    string,
    { operation: () => Promise<any>; config: RetryConfig; attempts: number }
  > = new Map();
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.initializeNetworkMonitoring();
    this.initializeGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * ネットワーク状態の監視を初期化
   */
  private initializeNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * グローバルエラーハンドラーを初期化
   */
  private initializeGlobalErrorHandlers(): void {
    // JavaScript エラーをキャッチ
    window.addEventListener('error', event => {
      this.handleError(new Error(event.message), {
        type: 'unknown',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Promise の未処理拒否をキャッチ
    window.addEventListener('unhandledrejection', event => {
      this.handleError(event.reason, {
        type: 'unknown',
        context: {
          promise: 'unhandled rejection',
        },
      });
    });
  }

  /**
   * エラーを処理する
   */
  async handleError(
    error: Error | unknown,
    options: {
      type?: ErrorType;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      context?: Record<string, any>;
      showToUser?: boolean;
      retry?: boolean;
    } = {}
  ): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      type: options.type || this.classifyError(errorObj),
      message: errorObj.message,
      stack: errorObj.stack,
      context: this.buildErrorContext(options.context),
      severity:
        options.severity || this.determineSeverity(errorObj, options.type),
      resolved: false,
      createdAt: new Date().toISOString(),
    };

    // エラーをキューに追加
    this.errorQueue.push(errorReport);

    // ログに記録
    this.logError(errorReport);

    // ユーザーに表示するかどうか
    if (options.showToUser !== false) {
      this.showUserFriendlyError(errorReport);
    }

    // 重要なエラーの場合は即座に報告
    if (
      errorReport.severity === 'critical' ||
      errorReport.severity === 'high'
    ) {
      await this.reportError(errorReport);
    }

    // リトライが必要な場合
    if (options.retry && this.isRetryableError(errorReport)) {
      // リトライロジックは呼び出し元で実装
    }
  }

  /**
   * ネットワークエラーを処理
   */
  async handleNetworkError(
    error: Error,
    operation: () => Promise<any>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<any> {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      ...retryConfig,
    };

    return this.executeWithRetry(operation, config, {
      type: 'network',
      context: { originalError: error.message },
    });
  }

  /**
   * データベースエラーを処理
   */
  async handleDatabaseError(
    error: Error,
    operation?: () => Promise<any>,
    context?: Record<string, any>
  ): Promise<any> {
    await this.handleError(error, {
      type: 'database',
      severity: 'high',
      context: {
        ...context,
        operation: operation?.name || 'unknown',
      },
      showToUser: true,
    });

    // データベースエラーの場合、オフライン対応を提案
    if (!this.isOnline) {
      this.showOfflineMessage();
    }

    if (operation) {
      return this.executeWithRetry(operation, {
        maxRetries: 2,
        baseDelayMs: 2000,
        maxDelayMs: 8000,
        backoffMultiplier: 2,
      });
    }
  }

  /**
   * 認証エラーを処理
   */
  async handleAuthError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(error, {
      type: 'authentication',
      severity: 'high',
      context,
      showToUser: true,
    });

    // 認証エラーの場合、ログイン画面にリダイレクト
    if (this.isTokenExpiredError(error)) {
      this.redirectToLogin();
    }
  }

  /**
   * バリデーションエラーを処理
   */
  async handleValidationError(
    error: Error,
    fieldName?: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(error, {
      type: 'validation',
      severity: 'low',
      context: {
        ...context,
        fieldName,
      },
      showToUser: true,
    });
  }

  /**
   * UIエラーを処理
   */
  async handleUIError(error: Error, componentName?: string): Promise<void> {
    await this.handleError(error, {
      type: 'ui',
      severity: 'medium',
      context: {
        componentName,
      },
      showToUser: false, // UIエラーは通常ユーザーに直接表示しない
    });
  }

  /**
   * 同期エラーを処理
   */
  async handleSyncError(
    error: Error,
    syncType: 'task' | 'session' | 'tag' | 'general',
    context?: Record<string, any>
  ): Promise<void> {
    await this.handleError(error, {
      type: 'sync',
      severity: 'medium',
      context: {
        ...context,
        syncType,
      },
      showToUser: true,
    });
  }

  /**
   * リトライ機能付きで操作を実行
   */
  private async executeWithRetry(
    operation: () => Promise<any>,
    config: RetryConfig,
    errorOptions?: { type?: ErrorType; context?: Record<string, any> }
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === config.maxRetries) {
          // 最後の試行でも失敗した場合
          await this.handleError(lastError, {
            ...errorOptions,
            severity: 'high',
            context: {
              ...errorOptions?.context,
              attempts: attempt + 1,
              maxRetries: config.maxRetries,
            },
          });
          throw lastError;
        }

        // 次の試行まで待機
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelayMs
        );

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * リトライキューを処理
   */
  private async processRetryQueue(): Promise<void> {
    if (!this.isOnline) return;

    const retryPromises = Array.from(this.retryQueue.entries()).map(
      async ([id, { operation, config, attempts }]) => {
        try {
          await operation();
          this.retryQueue.delete(id);
        } catch (error) {
          if (attempts >= config.maxRetries) {
            this.retryQueue.delete(id);
            await this.handleError(error as Error, {
              type: 'network',
              severity: 'high',
              context: { retryId: id, finalAttempt: true },
            });
          } else {
            // リトライ回数を増やして再度キューに追加
            this.retryQueue.set(id, {
              operation,
              config,
              attempts: attempts + 1,
            });
          }
        }
      }
    );

    await Promise.allSettled(retryPromises);
  }

  /**
   * エラーを分類
   */
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('database') || message.includes('supabase')) {
      return 'database';
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return 'authentication';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('sync') || message.includes('conflict')) {
      return 'sync';
    }

    return 'unknown';
  }

  /**
   * エラーの重要度を判定
   */
  private determineSeverity(
    error: Error,
    type?: ErrorType
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (type === 'authentication' || type === 'database') {
      return 'high';
    }
    if (type === 'network' || type === 'sync') {
      return 'medium';
    }
    if (type === 'validation') {
      return 'low';
    }

    // メッセージから重要度を判定
    const message = error.message.toLowerCase();
    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }

    return 'medium';
  }

  /**
   * エラーコンテキストを構築
   */
  private buildErrorContext(
    additionalData?: Record<string, any>
  ): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...additionalData,
    };
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを表示
   */
  private showUserFriendlyError(errorReport: ErrorReport): void {
    const userMessage = this.getUserFriendlyMessage(errorReport);

    // カスタムトースト通知を表示（実装は別途必要）
    this.showToast(userMessage, errorReport.severity);
  }

  /**
   * ユーザーフレンドリーなメッセージを生成
   */
  private getUserFriendlyMessage(errorReport: ErrorReport): string {
    switch (errorReport.type) {
      case 'network':
        return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      case 'database':
        return 'データの保存に失敗しました。しばらく待ってから再度お試しください。';
      case 'authentication':
        return '認証に失敗しました。再度ログインしてください。';
      case 'validation':
        return '入力内容に問題があります。入力内容を確認してください。';
      case 'sync':
        return 'データの同期に失敗しました。ネットワーク接続を確認してください。';
      default:
        return '予期しないエラーが発生しました。ページを再読み込みしてください。';
    }
  }

  /**
   * トースト通知を表示
   */
  private showToast(message: string, severity: string): void {
    // 実際の実装では、UIライブラリのトースト機能を使用
    console.error(`[${severity.toUpperCase()}] ${message}`);

    // 簡易的な通知表示（実際の実装では適切なUIコンポーネントを使用）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('ポモドーロタイマー', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }

  /**
   * オフラインメッセージを表示
   */
  private showOfflineMessage(): void {
    this.showToast(
      'オフラインモードです。データは後で同期されます。',
      'medium'
    );
  }

  /**
   * ログイン画面にリダイレクト
   */
  private redirectToLogin(): void {
    // 実際の実装では、ルーターを使用してログイン画面に遷移
    console.log('認証エラー: ログイン画面にリダイレクトが必要です');
  }

  /**
   * トークン期限切れエラーかどうかを判定
   */
  private isTokenExpiredError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('token') &&
      (message.includes('expired') ||
        message.includes('invalid') ||
        message.includes('unauthorized'))
    );
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryableError(errorReport: ErrorReport): boolean {
    return (
      errorReport.type === 'network' ||
      errorReport.type === 'database' ||
      errorReport.type === 'sync'
    );
  }

  /**
   * エラーをログに記録
   */
  private logError(errorReport: ErrorReport): void {
    const logLevel = this.getLogLevel(errorReport.severity);
    const logMessage = `[${errorReport.type.toUpperCase()}] ${errorReport.message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, errorReport);
        break;
      case 'warn':
        console.warn(logMessage, errorReport);
        break;
      case 'info':
        console.info(logMessage, errorReport);
        break;
      default:
        console.log(logMessage, errorReport);
    }
  }

  /**
   * ログレベルを取得
   */
  private getLogLevel(severity: string): 'error' | 'warn' | 'info' | 'log' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * エラーを外部サービスに報告
   */
  private async reportError(errorReport: ErrorReport): Promise<void> {
    try {
      // 実際の実装では、Sentry、LogRocket、または独自のログサービスに送信
      console.log('エラー報告:', errorReport);

      // 開発環境では詳細なエラー情報をコンソールに出力
      if (import.meta.env.DEV) {
        console.group(
          `🚨 Error Report [${errorReport.severity.toUpperCase()}]`
        );
        console.error('Message:', errorReport.message);
        console.error('Type:', errorReport.type);
        console.error('Stack:', errorReport.stack);
        console.error('Context:', errorReport.context);
        console.groupEnd();
      }
    } catch (reportingError) {
      console.error('エラー報告に失敗:', reportingError);
    }
  }

  /**
   * エラーIDを生成
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * エラー統計を取得
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const errorsByType: Record<ErrorType, number> = {
      network: 0,
      database: 0,
      authentication: 0,
      validation: 0,
      ui: 0,
      sync: 0,
      unknown: 0,
    };

    const errorsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    this.errorQueue.forEach(error => {
      errorsByType[error.type]++;
      errorsBySeverity[error.severity]++;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: this.errorQueue.slice(-10), // 最新10件
    };
  }

  /**
   * エラーキューをクリア
   */
  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  /**
   * 特定のエラーを解決済みとしてマーク
   */
  markErrorAsResolved(errorId: string): void {
    const error = this.errorQueue.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const errorHandler = ErrorHandler.getInstance();
