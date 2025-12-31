/**
 * エラー率監視ダッシュボード
 * 継続監視項目: エラー率 < 1%
 *
 * リアルタイムでエラー率を表示し、アラート状況を監視
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  getErrorRateMonitor,
  type ErrorRateStats,
  type ErrorRateAlert,
} from '../../services/error-rate-monitor';

interface ErrorRateDashboardProps {
  className?: string;
  refreshInterval?: number; // 更新間隔（秒）
  showTrend?: boolean; // トレンドグラフを表示するか
  compact?: boolean; // コンパクト表示
}

/**
 * エラー率監視ダッシュボードコンポーネント
 */
export function ErrorRateDashboard({
  className = '',
  refreshInterval = 30,
  compact = false,
}: ErrorRateDashboardProps) {
  const [stats, setStats] = useState<ErrorRateStats | null>(null);
  const [alerts, setAlerts] = useState<ErrorRateAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const monitor = getErrorRateMonitor();

  // 統計データを更新
  const updateStats = useCallback(() => {
    try {
      const currentStats = monitor.getCurrentStats();
      setStats(currentStats);
      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('エラー率統計の取得に失敗:', error);
      setIsLoading(false);
    }
  }, [monitor]);

  // エラー率アラートを処理
  const handleErrorRateAlert = useCallback(
    (event: CustomEvent<ErrorRateAlert>) => {
      const alert = event.detail;
      setAlerts(prev => [alert, ...prev.slice(0, 4)]); // 最新5件を保持
    },
    []
  );

  // 初期化とイベントリスナー設定
  useEffect(() => {
    // 初期データ読み込みを非同期で実行
    const loadInitialData = async () => {
      await updateStats();
    };

    loadInitialData();

    // 定期更新
    const interval = setInterval(updateStats, refreshInterval * 1000);

    // エラー率アラートのリスナー
    window.addEventListener(
      'error-rate-alert',
      handleErrorRateAlert as EventListener
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        'error-rate-alert',
        handleErrorRateAlert as EventListener
      );
    };
  }, [updateStats, refreshInterval, handleErrorRateAlert]);

  // 手動更新
  const handleManualRefresh = () => {
    setIsLoading(true);
    updateStats();
  };

  // エラー率のステータスを判定
  const getErrorRateStatus = (errorRate: number, threshold: number) => {
    if (errorRate <= threshold * 0.5) {
      return {
        status: 'excellent',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    } else if (errorRate <= threshold) {
      return { status: 'good', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    } else if (errorRate <= threshold * 1.5) {
      return {
        status: 'warning',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    } else {
      return {
        status: 'critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    }
  };

  if (isLoading && !stats) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow ${className}`}>
        <div className="text-center text-gray-500">
          <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
          <p>エラー率データを取得できませんでした</p>
          <button
            onClick={handleManualRefresh}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  const threshold = monitor.getConfig().threshold;
  const statusInfo = getErrorRateStatus(stats.errorRate, threshold);

  if (compact) {
    return (
      <div className={`p-3 bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {stats.errorRate <= threshold ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">エラー率</span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${statusInfo.color}`}>
              {stats.errorRate.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">閾値: {threshold}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ChartBarIcon className="h-6 w-6 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              エラー率監視
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {lastUpdate && (
              <div className="flex items-center text-sm text-gray-500">
                <ClockIcon className="h-4 w-4 mr-1" />
                {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="手動更新"
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* メイン統計 */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* エラー率 */}
          <div className={`p-4 rounded-lg ${statusInfo.bgColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  現在のエラー率
                </p>
                <p className={`text-2xl font-bold ${statusInfo.color}`}>
                  {stats.errorRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">閾値: {threshold}%</p>
              </div>
              {stats.errorRate <= threshold ? (
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>

          {/* 総リクエスト数 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">
                総リクエスト数
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                過去{stats.timeWindow}分間
              </p>
            </div>
          </div>

          {/* エラー数 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">エラー数</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.totalErrors.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                過去{stats.timeWindow}分間
              </p>
            </div>
          </div>
        </div>

        {/* エラータイプ別内訳 */}
        {Object.keys(stats.breakdown).length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              エラータイプ別内訳
            </h4>
            <div className="space-y-2">
              {Object.entries(stats.breakdown)
                .sort(([, a], [, b]) => b.count - a.count)
                .slice(0, 5)
                .map(([errorType, data]) => (
                  <div
                    key={errorType}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm text-gray-700">{errorType}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {data.count}件
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({data.rate.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 最近のアラート */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <BellIcon className="h-4 w-4 mr-1" />
              最近のアラート
            </h4>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-400'
                      : 'bg-yellow-50 border-yellow-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        エラー率: {alert.currentRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-600">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alert.severity === 'critical' ? '重大' : '警告'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ステータスメッセージ */}
        <div className="text-center">
          {stats.errorRate <= threshold ? (
            <div className="text-green-600">
              <CheckCircleIcon className="h-6 w-6 mx-auto mb-1" />
              <p className="text-sm font-medium">エラー率は正常範囲内です</p>
            </div>
          ) : (
            <div className="text-red-600">
              <ExclamationTriangleIcon className="h-6 w-6 mx-auto mb-1" />
              <p className="text-sm font-medium">
                エラー率が閾値を超えています
              </p>
              <p className="text-xs text-gray-600 mt-1">
                システム管理者に連絡してください
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * エラー率監視の簡易ウィジェット
 */
export function ErrorRateWidget({ className = '' }: { className?: string }) {
  return (
    <ErrorRateDashboard
      className={className}
      compact={true}
      showTrend={false}
      refreshInterval={60}
    />
  );
}

/**
 * エラー率アラートバナー
 */
export function ErrorRateAlertBanner() {
  const [alert, setAlert] = useState<ErrorRateAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleAlert = (event: CustomEvent<ErrorRateAlert>) => {
      setAlert(event.detail);
      setIsVisible(true);
    };

    window.addEventListener('error-rate-alert', handleAlert as EventListener);

    return () => {
      window.removeEventListener(
        'error-rate-alert',
        handleAlert as EventListener
      );
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !alert) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg ${
        alert.severity === 'critical'
          ? 'bg-red-100 border border-red-400'
          : 'bg-yellow-100 border border-yellow-400'
      }`}
    >
      <div className="flex items-start">
        <ExclamationTriangleIcon
          className={`h-5 w-5 mt-0.5 mr-3 ${
            alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
          }`}
        />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            エラー率アラート
          </h4>
          <p className="text-sm text-gray-700 mt-1">
            現在のエラー率: {alert.currentRate.toFixed(2)}%
            <br />
            閾値: {alert.threshold}%
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {alert.timestamp.toLocaleString()}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">閉じる</span>×
        </button>
      </div>
    </div>
  );
}
