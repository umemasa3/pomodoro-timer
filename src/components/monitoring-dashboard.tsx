import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CpuChipIcon,
  SignalIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  monitoringService,
  type SystemHealth,
} from '../services/monitoring-service';
import { errorHandler } from '../services/error-handler';

interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 監視ダッシュボードコンポーネント
 * システムの健全性とパフォーマンスを表示
 */
export function MonitoringDashboard({
  isOpen,
  onClose,
}: MonitoringDashboardProps) {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [userActivityStats, setUserActivityStats] = useState<any>(null);
  const [errorStats, setErrorStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
      const interval = setInterval(loadDashboardData, 30000); // 30秒ごとに更新
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // 各種統計データを取得
      const [health, performance, userActivity, errors] = await Promise.all([
        Promise.resolve(monitoringService.getSystemHealth()),
        Promise.resolve(monitoringService.getPerformanceStatistics()),
        Promise.resolve(monitoringService.getUserActivityStatistics()),
        Promise.resolve(errorHandler.getErrorStatistics()),
      ]);

      setSystemHealth(health);
      setPerformanceStats(performance);
      setUserActivityStats(userActivity);
      setErrorStats(errors);
    } catch (error) {
      console.error('ダッシュボードデータの読み込みに失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = monitoringService.exportMonitoringData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('データエクスポートに失敗:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">監視ダッシュボード</h2>
                <p className="text-blue-100">
                  システムの健全性とパフォーマンス
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportData}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>エクスポート</span>
              </button>
              <button
                onClick={loadDashboardData}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>更新</span>
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* システムヘルス */}
              {systemHealth && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <HealthCard
                    title="ネットワーク状態"
                    value={systemHealth.isOnline ? 'オンライン' : 'オフライン'}
                    icon={SignalIcon}
                    color={systemHealth.isOnline ? 'green' : 'red'}
                  />
                  <HealthCard
                    title="エラー率"
                    value={`${systemHealth.errorRate}%`}
                    icon={ExclamationTriangleIcon}
                    color={
                      systemHealth.errorRate > 5
                        ? 'red'
                        : systemHealth.errorRate > 2
                          ? 'yellow'
                          : 'green'
                    }
                  />
                  <HealthCard
                    title="平均レスポンス時間"
                    value={`${systemHealth.averageResponseTime}ms`}
                    icon={ClockIcon}
                    color={
                      systemHealth.averageResponseTime > 2000
                        ? 'red'
                        : systemHealth.averageResponseTime > 1000
                          ? 'yellow'
                          : 'green'
                    }
                  />
                  <HealthCard
                    title="メモリ使用量"
                    value={
                      systemHealth.memoryUsage
                        ? `${Math.round(systemHealth.memoryUsage / 1024 / 1024)}MB`
                        : 'N/A'
                    }
                    icon={CpuChipIcon}
                    color={
                      systemHealth.memoryUsage &&
                      systemHealth.memoryUsage > 100 * 1024 * 1024
                        ? 'red'
                        : 'green'
                    }
                  />
                </div>
              )}

              {/* パフォーマンス統計 */}
              {performanceStats && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    パフォーマンス統計
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        平均ページロード時間
                      </h4>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {performanceStats.averagePageLoadTime}ms
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        平均API レスポンス時間
                      </h4>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {performanceStats.averageApiResponseTime}ms
                      </p>
                    </div>
                  </div>

                  {/* 最も遅いエンドポイント */}
                  {performanceStats.slowestEndpoints.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                        最も遅いエンドポイント
                      </h4>
                      <div className="space-y-2">
                        {performanceStats.slowestEndpoints
                          .slice(0, 3)
                          .map((endpoint: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-white dark:bg-gray-600 p-3 rounded-lg"
                            >
                              <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                {endpoint.endpoint}
                              </span>
                              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                {Math.round(endpoint.averageTime)}ms
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ユーザーアクティビティ */}
              {userActivityStats && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    ユーザーアクティビティ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        総アクティビティ数
                      </h4>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {userActivityStats.totalActivities}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        平均セッション時間
                      </h4>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {Math.round(
                          userActivityStats.averageSessionDuration / 60
                        )}
                        分
                      </p>
                    </div>
                  </div>

                  {/* 最も多いアクション */}
                  {userActivityStats.mostCommonActions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                        最も多いアクション
                      </h4>
                      <div className="space-y-2">
                        {userActivityStats.mostCommonActions
                          .slice(0, 5)
                          .map((action: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center bg-white dark:bg-gray-600 p-3 rounded-lg"
                            >
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {action.action}
                              </span>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {action.count}回
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* エラー統計 */}
              {errorStats && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    エラー統計
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        総エラー数
                      </h4>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {errorStats.totalErrors}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                        エラータイプ別
                      </h4>
                      <div className="space-y-1">
                        {Object.entries(errorStats.errorsByType).map(
                          ([type, count]) => (
                            <div
                              key={type}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-600 dark:text-gray-300">
                                {type}
                              </span>
                              <span className="font-semibold">
                                {count as number}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 最近のエラー */}
                  {errorStats.recentErrors.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                        最近のエラー
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {errorStats.recentErrors.map(
                          (error: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white dark:bg-gray-600 p-3 rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {error.message}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {error.type} •{' '}
                                    {new Date(error.createdAt).toLocaleString(
                                      'ja-JP'
                                    )}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    error.severity === 'critical'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      : error.severity === 'high'
                                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                        : error.severity === 'medium'
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                  }`}
                                >
                                  {error.severity}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * ヘルスカードコンポーネント
 */
function HealthCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    green:
      'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    yellow:
      'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  const iconColorClasses = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center space-x-3">
        <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
