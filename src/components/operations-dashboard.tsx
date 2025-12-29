/**
 * 運用ダッシュボードコンポーネント
 * ヘルスチェック結果、アラート、システム統計をリアルタイムで表示
 */

import React, { useState, useEffect } from 'react';
import {
  getHealthMonitor,
  HealthCheck,
  HealthAlert,
  HealthStats,
} from '../services/health-monitor';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// ダッシュボードの状態
interface DashboardState {
  isMonitoring: boolean;
  currentHealth: Record<string, HealthCheck>;
  healthStats: Record<string, HealthStats>;
  recentAlerts: HealthAlert[];
  lastUpdate: Date;
}

// プロパティの型定義
interface OperationsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 運用ダッシュボード（モーダル形式）
 */
export function OperationsDashboard({
  isOpen,
  onClose,
}: OperationsDashboardProps): JSX.Element {
  const [state, setState] = useState<DashboardState>({
    isMonitoring: false,
    currentHealth: {},
    healthStats: {},
    recentAlerts: [],
    lastUpdate: new Date(),
  });

  const healthMonitor = getHealthMonitor();

  // 監視状態の更新
  useEffect(() => {
    if (!isOpen) return;

    const updateDashboard = () => {
      const currentHealth = healthMonitor.getCurrentHealth();
      const healthStats = healthMonitor.getHealthStats();
      const recentAlerts = healthMonitor.getAlertHistory(10);

      setState(prev => ({
        ...prev,
        currentHealth,
        healthStats,
        recentAlerts,
        lastUpdate: new Date(),
      }));
    };

    // 初回更新
    updateDashboard();

    // 定期更新
    const updateInterval = setInterval(updateDashboard, 10000); // 10秒ごと

    return () => clearInterval(updateInterval);
  }, [isOpen, healthMonitor]);

  // 監視の開始/停止
  const toggleMonitoring = () => {
    if (state.isMonitoring) {
      healthMonitor.stopMonitoring();
    } else {
      healthMonitor.startMonitoring();
    }
    setState(prev => ({ ...prev, isMonitoring: !prev.isMonitoring }));
  };

  // 手動ヘルスチェック実行
  const runManualCheck = async () => {
    try {
      await healthMonitor.runHealthCheck();
      // 結果を即座に更新
      const currentHealth = healthMonitor.getCurrentHealth();
      setState(prev => ({
        ...prev,
        currentHealth,
        lastUpdate: new Date(),
      }));
    } catch (error) {
      console.error('Manual health check failed:', error);
    }
  };

  // ステータスアイコンを取得
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  // ステータス色を取得
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'unhealthy':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
    }
  };

  // アップタイムの表示
  const formatUptime = (uptime: number): string => {
    return `${(uptime * 100).toFixed(1)}%`;
  };

  // 応答時間の表示
  const formatResponseTime = (time: number): string => {
    return `${time.toFixed(0)}ms`;
  };

  // 相対時間の表示
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return '今';
  };

  // 全体的なシステム状態を判定
  const getOverallStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
    const healthChecks = Object.values(state.currentHealth);
    if (healthChecks.length === 0) return 'healthy';

    const unhealthyCount = healthChecks.filter(
      check => check.status === 'unhealthy'
    ).length;
    const degradedCount = healthChecks.filter(
      check => check.status === 'degraded'
    ).length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  };

  const overallStatus = getOverallStatus();
  const healthCheckEntries = Object.entries(state.currentHealth);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* モーダルコンテンツ */}
          <motion.div
            className="fixed inset-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="h-full flex flex-col">
              {/* ヘッダー */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    運用ダッシュボード
                  </h2>
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(overallStatus)}`}
                  >
                    {getStatusIcon(overallStatus)}
                    <span>
                      {overallStatus === 'healthy'
                        ? 'システム正常'
                        : overallStatus === 'degraded'
                          ? 'パフォーマンス低下'
                          : 'システム異常'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    最終更新: {state.lastUpdate.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={runManualCheck}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    手動チェック
                  </button>
                  <button
                    onClick={toggleMonitoring}
                    className={`px-4 py-2 rounded-md font-medium ${
                      state.isMonitoring
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {state.isMonitoring ? '監視停止' : '監視開始'}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* スクロール可能なコンテンツ */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ヘルスチェック結果 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      ヘルスチェック結果
                    </h3>
                    {healthCheckEntries.length > 0 ? (
                      <div className="space-y-3">
                        {healthCheckEntries.map(([name, check]) => (
                          <div
                            key={name}
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(check.status)}
                                <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                                  {name.replace(/-/g, ' ')}
                                </h4>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}
                              >
                                {check.status === 'healthy'
                                  ? '正常'
                                  : check.status === 'degraded'
                                    ? '低下'
                                    : '異常'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-300">
                                  最終チェック:
                                </span>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {formatRelativeTime(check.lastCheck)}
                                </div>
                              </div>
                              {check.responseTime && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    応答時間:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {formatResponseTime(check.responseTime)}
                                  </div>
                                </div>
                              )}
                            </div>
                            {check.error && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                                {check.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        ヘルスチェックデータがありません。監視を開始してください。
                      </div>
                    )}
                  </div>

                  {/* 統計情報 */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      システム統計
                    </h3>
                    {Object.entries(state.healthStats).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(state.healthStats).map(
                          ([name, stats]) => (
                            <div
                              key={name}
                              className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            >
                              <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                                {name.replace(/-/g, ' ')}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    アップタイム:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {formatUptime(stats.uptime)}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    平均応答時間:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {formatResponseTime(
                                      stats.averageResponseTime
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    総チェック数:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {stats.totalChecks}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-300">
                                    失敗数:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {stats.failedChecks}
                                  </div>
                                </div>
                              </div>
                              {stats.lastFailure && (
                                <div className="mt-2 text-sm">
                                  <span className="text-gray-600 dark:text-gray-300">
                                    最終失敗:
                                  </span>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {formatRelativeTime(stats.lastFailure)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        統計データがありません。
                      </div>
                    )}
                  </div>
                </div>

                {/* アラート履歴 */}
                {state.recentAlerts.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      最近のアラート
                    </h3>
                    <div className="space-y-3">
                      {state.recentAlerts.map((alert, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${
                            alert.severity === 'critical'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <ExclamationTriangleIcon
                                className={`w-5 h-5 ${
                                  alert.severity === 'critical'
                                    ? 'text-red-500'
                                    : 'text-yellow-500'
                                }`}
                              />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {alert.checkName}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  alert.severity === 'critical'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                }`}
                              >
                                {alert.severity === 'critical'
                                  ? '重大'
                                  : '警告'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(alert.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {alert.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 監視設定の説明 */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    監視について
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>
                      • <strong>Database:</strong>{' '}
                      データベース接続とクエリ応答性
                    </p>
                    <p>
                      • <strong>Auth:</strong> 認証サービスの可用性
                    </p>
                    <p>
                      • <strong>Realtime:</strong> リアルタイム通信の接続状態
                    </p>
                    <p>
                      • <strong>Storage:</strong> ファイルストレージサービス
                    </p>
                    <p>
                      • <strong>External APIs:</strong> 外部API接続
                    </p>
                    <p>
                      • <strong>Browser APIs:</strong> ブラウザAPI機能
                    </p>
                    <p>• ヘルスチェックは1分ごとに自動実行されます</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default OperationsDashboard;
