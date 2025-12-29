/**
 * パフォーマンス監視ダッシュボードコンポーネント
 * Core Web Vitalsとカスタムメトリクスをリアルタイムで表示
 */

import React, { useState, useEffect } from 'react';
import {
  getPerformanceMonitor,
  PerformanceMetric,
} from '../services/performance-monitor';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// メトリクス統計の型定義
interface MetricStats {
  count: number;
  average: number;
  min: number;
  max: number;
}

// ダッシュボードの状態
interface DashboardState {
  isMonitoring: boolean;
  metrics: Record<string, MetricStats>;
  recentMetrics: PerformanceMetric[];
  lastUpdate: Date;
}

// プロパティの型定義
interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * パフォーマンス監視ダッシュボード（モーダル形式）
 */
export function MonitoringDashboard({
  isOpen,
  onClose,
}: MonitoringDashboardProps): JSX.Element {
  const [state, setState] = useState<DashboardState>({
    isMonitoring: false,
    metrics: {},
    recentMetrics: [],
    lastUpdate: new Date(),
  });

  const performanceMonitor = getPerformanceMonitor();

  // 監視状態の更新
  useEffect(() => {
    const updateInterval = setInterval(() => {
      const stats = performanceMonitor.getMetricsStats();
      setState(prev => ({
        ...prev,
        metrics: stats,
        lastUpdate: new Date(),
      }));
    }, 5000); // 5秒ごとに更新

    return () => clearInterval(updateInterval);
  }, [performanceMonitor]);

  // 監視の開始/停止
  const toggleMonitoring = () => {
    if (state.isMonitoring) {
      performanceMonitor.stopMonitoring();
    } else {
      performanceMonitor.startMonitoring();
    }
    setState(prev => ({ ...prev, isMonitoring: !prev.isMonitoring }));
  };

  // Core Web Vitalsの状態を判定
  const getVitalStatus = (
    metricName: string,
    value: number
  ): 'good' | 'needs-improvement' | 'poor' => {
    switch (metricName) {
      case 'LCP':
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
      case 'FID':
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
      case 'CLS':
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
      default:
        return 'good';
    }
  };

  // 状態に応じた色を取得
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-100';
      case 'needs-improvement':
        return 'text-yellow-600 bg-yellow-100';
      case 'poor':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // メトリクス値をフォーマット
  const formatMetricValue = (metricName: string, value: number): string => {
    if (
      metricName.includes('time') ||
      metricName === 'LCP' ||
      metricName === 'FID'
    ) {
      return `${value.toFixed(0)}ms`;
    }
    if (metricName === 'CLS') {
      return value.toFixed(3);
    }
    if (metricName.includes('memory')) {
      return `${(value / 1024 / 1024).toFixed(1)}MB`;
    }
    return value.toFixed(2);
  };

  // Core Web Vitalsメトリクス
  const coreWebVitals = ['LCP', 'FID', 'CLS'];
  const coreVitalsData = coreWebVitals
    .map(name => ({ name, stats: state.metrics[name] }))
    .filter(item => item.stats);

  // その他のメトリクス
  const otherMetrics = Object.entries(state.metrics)
    .filter(([name]) => !coreWebVitals.includes(name))
    .map(([name, stats]) => ({ name, stats }));

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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  パフォーマンス監視ダッシュボード
                </h2>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    最終更新: {state.lastUpdate.toLocaleTimeString()}
                  </span>
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
                {/* Core Web Vitals セクション */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Core Web Vitals
                  </h3>
                  {coreVitalsData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {coreVitalsData.map(({ name, stats }) => {
                        const status = getVitalStatus(name, stats.average);
                        const statusColor = getStatusColor(status);

                        return (
                          <div
                            key={name}
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                              >
                                {status === 'good'
                                  ? '良好'
                                  : status === 'needs-improvement'
                                    ? '要改善'
                                    : '不良'}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">
                                  平均:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {formatMetricValue(name, stats.average)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">
                                  最小:
                                </span>
                                <span className="text-gray-900 dark:text-white">
                                  {formatMetricValue(name, stats.min)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">
                                  最大:
                                </span>
                                <span className="text-gray-900 dark:text-white">
                                  {formatMetricValue(name, stats.max)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">
                                  測定回数:
                                </span>
                                <span className="text-gray-900 dark:text-white">
                                  {stats.count}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Core Web
                      Vitalsのデータがありません。監視を開始してください。
                    </div>
                  )}
                </div>

                {/* その他のメトリクス セクション */}
                {otherMetrics.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      その他のメトリクス
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherMetrics.map(({ name, stats }) => (
                        <div
                          key={name}
                          className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                        >
                          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                            {name
                              .replace(/-/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">
                                平均:
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatMetricValue(name, stats.average)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">
                                最小:
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {formatMetricValue(name, stats.min)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">
                                最大:
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {formatMetricValue(name, stats.max)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">
                                測定回数:
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {stats.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 監視状態の説明 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    監視について
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>
                      • <strong>LCP (Largest Contentful Paint):</strong>{' '}
                      最大コンテンツの描画時間
                    </p>
                    <p>
                      • <strong>FID (First Input Delay):</strong>{' '}
                      初回入力遅延時間
                    </p>
                    <p>
                      • <strong>CLS (Cumulative Layout Shift):</strong>{' '}
                      累積レイアウトシフト
                    </p>
                    <p>• メトリクスは5秒ごとに更新されます</p>
                    <p>• 閾値を超えた場合、自動的にアラートが生成されます</p>
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

export default MonitoringDashboard;
