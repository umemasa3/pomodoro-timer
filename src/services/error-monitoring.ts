import * as Sentry from '@sentry/react';
import type { User } from '@supabase/supabase-js';

/**
 * エラー監視サービス
 * 要件3.1: エラーハンドリングシステムの実装
 */
export class ErrorMonitoringService {
  /**
   * ユーザーコンテキストを設定
   */
  static setUserContext(user: User | null): void {
    Sentry.setUser(
      user
        ? {
            id: user.id,
            email: user.email,
          }
        : null
    );
  }

  /**
   * エラーを記録
   */
  static captureError(error: Error, context?: Record<string, any>): string {
    return Sentry.captureException(error, {
      extra: context,
      tags: {
        errorBoundary: true,
      },
    });
  }

  /**
   * メッセージを記録
   */
  static captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): string {
    return Sentry.captureMessage(message, level);
  }

  /**
   * パフォーマンス監視のトランザクション開始
   */
  static startTransaction(name: string, operation: string) {
    return Sentry.startSpan(
      {
        name,
        op: operation,
      },
      span => span
    );
  }

  /**
   * カスタムメトリクスを記録
   */
  static addMetric(name: string, value: number, unit: string = 'none'): void {
    Sentry.metrics.gauge(name, value, {
      unit,
    });
  }

  /**
   * ブレッドクラムを追加（ユーザーアクションの追跡）
   */
  static addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * エラーレポートの生成
   */
  static generateErrorReport(
    error: Error,
    componentStack?: string
  ): ErrorReport {
    const errorId = this.generateErrorId();

    return {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: undefined, // ユーザーIDは別途設定される
    };
  }

  /**
   * ユニークなエラーIDを生成
   */
  private static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * エラーの重要度を判定
   */
  static classifyErrorSeverity(
    error: Error
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // クリティカル: セキュリティ関連、データ損失
    if (
      message.includes('security') ||
      message.includes('unauthorized') ||
      message.includes('data loss') ||
      stack.includes('auth')
    ) {
      return 'critical';
    }

    // 高: 機能停止、ネットワークエラー
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      error.name === 'TypeError'
    ) {
      return 'high';
    }

    // 中: UI関連、非致命的エラー
    if (
      message.includes('render') ||
      message.includes('component') ||
      error.name === 'ReferenceError'
    ) {
      return 'medium';
    }

    // 低: その他
    return 'low';
  }

  /**
   * エラー統計の取得
   */
  static getErrorStats(): ErrorStats {
    // 実際の実装では、Sentryのダッシュボードから取得
    return {
      totalErrors: 0,
      errorRate: 0,
      topErrors: [],
      lastUpdated: new Date(),
    };
  }
}

/**
 * エラーレポート型定義
 */
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: Date;
  userAgent: string;
  url: string;
  userId?: string;
}

/**
 * エラー統計型定義
 */
export interface ErrorStats {
  totalErrors: number;
  errorRate: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastSeen: Date;
  }>;
  lastUpdated: Date;
}

/**
 * エラー回復アクション型定義
 */
export interface ErrorRecoveryActions {
  retry: () => void;
  reset: () => void;
  reportBug: (description: string) => void;
  goHome: () => void;
}
