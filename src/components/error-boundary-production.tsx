import React, { Component, type ReactNode } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import {
  ErrorMonitoringService,
  type ErrorReport,
  type ErrorRecoveryActions,
} from '../services/error-monitoring';
import { BugReportForm } from './bug-report-form';

interface Props {
  children: ReactNode;
  fallback?: (
    error: Error,
    errorInfo: React.ErrorInfo,
    actions: ErrorRecoveryActions
  ) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorReport: ErrorReport | null;
  isReporting: boolean;
  reportSent: boolean;
}

/**
 * 製品用エラー境界コンポーネント
 * 要件3.1: エラーハンドリングシステムの実装
 */
export class ProductionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorReport: null,
      isReporting: false,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // エラーレポートを生成
    const errorReport = ErrorMonitoringService.generateErrorReport(
      error,
      errorInfo.componentStack || undefined
    );

    // Sentryにエラーを送信
    const errorId = ErrorMonitoringService.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      severity: ErrorMonitoringService.classifyErrorSeverity(error),
    });

    // ブレッドクラムを追加
    ErrorMonitoringService.addBreadcrumb(
      `Error caught by boundary: ${error.message}`,
      'error',
      'error'
    );

    this.setState({
      errorInfo,
      errorReport: { ...errorReport, id: errorId },
    });

    // カスタムエラーハンドラーを呼び出し
    this.props.onError?.(error, errorInfo);

    console.error('ProductionErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * エラー回復アクションを生成
   */
  private getRecoveryActions = (): ErrorRecoveryActions => ({
    retry: () => {
      ErrorMonitoringService.addBreadcrumb(
        'User clicked retry',
        'user',
        'info'
      );
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorReport: null,
        isReporting: false,
        reportSent: false,
      });
    },

    reset: () => {
      ErrorMonitoringService.addBreadcrumb(
        'User clicked reset',
        'user',
        'info'
      );
      // ローカルストレージをクリア（設定は保持）
      const settings = localStorage.getItem('pomodoro-settings');
      localStorage.clear();
      if (settings) {
        localStorage.setItem('pomodoro-settings', settings);
      }
      window.location.reload();
    },

    reportBug: async (description: string) => {
      this.setState({ isReporting: true });

      try {
        // バグレポートを送信
        ErrorMonitoringService.captureMessage(
          `User bug report: ${description}`,
          'info'
        );

        ErrorMonitoringService.addBreadcrumb(
          'User submitted bug report',
          'user',
          'info'
        );

        this.setState({
          isReporting: false,
          reportSent: true,
        });
      } catch (error) {
        console.error('Failed to send bug report:', error);
        this.setState({ isReporting: false });
      }
    },

    goHome: () => {
      ErrorMonitoringService.addBreadcrumb(
        'User clicked go home',
        'user',
        'info'
      );
      window.location.href = '/';
    },
  });

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorReport } = this.state;
      const actions = this.getRecoveryActions();

      // カスタムフォールバックが提供されている場合
      if (this.props.fallback && error && errorInfo) {
        return this.props.fallback(error, errorInfo, actions);
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              予期しないエラーが発生しました
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              申し訳ございません。アプリケーションでエラーが発生しました。
              以下のオプションをお試しください。
            </p>

            {/* エラー詳細（開発環境のみ） */}
            {import.meta.env.DEV && error && (
              <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <details>
                  <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
                    エラー詳細
                  </summary>
                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    <p>
                      <strong>メッセージ:</strong> {error.message}
                    </p>
                    {errorReport?.id && (
                      <p>
                        <strong>エラーID:</strong> {errorReport.id}
                      </p>
                    )}
                    {error.stack && (
                      <pre className="mt-2 text-xs overflow-auto">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* 回復アクション */}
            <div className="space-y-3">
              <button
                onClick={actions.retry}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                再試行
              </button>

              <button
                onClick={actions.reset}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                アプリをリセット
              </button>

              <BugReportForm
                onSubmit={actions.reportBug}
                isSubmitting={this.state.isReporting}
                isSubmitted={this.state.reportSent}
              />
            </div>

            {/* エラーID表示 */}
            {errorReport?.id && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  エラーID: <code className="font-mono">{errorReport.id}</code>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  サポートにお問い合わせの際は、このIDをお知らせください。
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
