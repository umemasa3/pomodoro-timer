import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  BugAntIcon,
} from '@heroicons/react/24/outline';
import { errorHandler } from '../services/error-handler';
import { monitoringService } from '../services/monitoring-service';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * React エラーバウンダリーコンポーネント
 * UIエラーをキャッチして適切に処理する
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーハンドラーに報告
    errorHandler
      .handleError(error, {
        type: 'ui',
        severity: 'medium',
        context: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          retryCount: this.state.retryCount,
        },
        showToUser: false,
      })
      .then(errorId => {
        this.setState({ errorId: errorId as any });
      });

    // 監視サービスに記録
    monitoringService.recordUserActivity({
      action: 'error_boundary_triggered',
      component: 'ErrorBoundary',
      metadata: {
        errorMessage: error.message,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount,
      },
    });

    // カスタムエラーハンドラーを呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error(
      'ErrorBoundary がエラーをキャッチしました:',
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    const { retryCount } = this.state;

    // 最大3回までリトライ
    if (retryCount >= 3) {
      this.handleReload();
      return;
    }

    monitoringService.recordUserActivity({
      action: 'error_boundary_retry',
      component: 'ErrorBoundary',
      metadata: {
        retryCount: retryCount + 1,
      },
    });

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: retryCount + 1,
    });
  };

  handleReload = () => {
    monitoringService.recordUserActivity({
      action: 'error_boundary_reload',
      component: 'ErrorBoundary',
    });

    window.location.reload();
  };

  handleGoHome = () => {
    monitoringService.recordUserActivity({
      action: 'error_boundary_go_home',
      component: 'ErrorBoundary',
    });

    // ホームページに遷移（実際の実装ではルーターを使用）
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorId } = this.state;

    monitoringService.recordUserActivity({
      action: 'error_boundary_report_bug',
      component: 'ErrorBoundary',
      metadata: {
        errorId,
      },
    });

    // バグ報告機能（実際の実装では適切な報告システムを使用）
    const reportData = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    console.log('バグ報告データ:', reportData);

    // 簡易的な報告（実際の実装では適切なAPIエンドポイントに送信）
    alert('バグ報告が送信されました。ご協力ありがとうございます。');
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900 flex items-center justify-center p-4">
          <motion.div
            className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* エラーアイコン */}
            <motion.div
              className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <ExclamationTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
            </motion.div>

            {/* エラーメッセージ */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                予期しないエラーが発生しました
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                申し訳ございません。アプリケーションでエラーが発生しました。
                以下のオプションをお試しください。
              </p>

              {/* エラー詳細（開発環境のみ） */}
              {import.meta.env.DEV && this.state.error && (
                <motion.div
                  className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    エラー詳細 (開発環境)
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      エラーID: {this.state.errorId}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* アクションボタン */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {/* リトライボタン */}
              <button
                onClick={this.handleRetry}
                disabled={this.state.retryCount >= 3}
                className="w-full flex items-center justify-center space-x-2 bg-pomodoro-500 hover:bg-pomodoro-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>
                  {this.state.retryCount >= 3
                    ? 'リトライ上限に達しました'
                    : 'もう一度試す'}
                </span>
              </button>

              {/* ホームに戻るボタン */}
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <HomeIcon className="w-5 h-5" />
                <span>ホームに戻る</span>
              </button>

              {/* ページ再読み込みボタン */}
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>ページを再読み込み</span>
              </button>

              {/* バグ報告ボタン */}
              <button
                onClick={this.handleReportBug}
                className="w-full flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              >
                <BugAntIcon className="w-5 h-5" />
                <span>バグを報告</span>
              </button>
            </motion.div>

            {/* リトライ回数表示 */}
            {this.state.retryCount > 0 && (
              <motion.p
                className="text-sm text-gray-500 dark:text-gray-400 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                リトライ回数: {this.state.retryCount}/3
              </motion.p>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
