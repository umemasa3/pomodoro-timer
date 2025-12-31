/**
 * Core Web Vitals監視コンポーネント
 * リアルタイムでCore Web Vitalsを表示し、基準値チェックを行う
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getPerformanceMonitor } from '../services/performance-monitor';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';

interface CoreWebVitalsStatus {
  lcp: { value: number | null; passed: boolean; threshold: number };
  fid: { value: number | null; passed: boolean; threshold: number };
  cls: { value: number | null; passed: boolean; threshold: number };
  overall: boolean;
}

export function CoreWebVitalsMonitor() {
  const [status, setStatus] = useState<CoreWebVitalsStatus | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const monitor = getPerformanceMonitor();

    // 定期的にCore Web Vitalsの状態を更新
    const updateStatus = () => {
      const currentStatus = monitor.getCoreWebVitalsStatus();
      const currentRecommendations =
        monitor.generateOptimizationRecommendations();

      setStatus(currentStatus);
      setRecommendations(currentRecommendations);
    };

    // 初回更新
    updateStatus();

    // 5秒ごとに更新
    const interval = setInterval(updateStatus, 5000);

    // 開発環境でのみ表示（次のレンダリングサイクルで状態を更新）
    if (import.meta.env.DEV) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 0);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!isVisible || !status) {
    return null;
  }

  const getStatusIcon = (passed: boolean, value: number | null) => {
    if (value === null) {
      return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
    return passed ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
    );
  };

  const getStatusColor = (passed: boolean, value: number | null) => {
    if (value === null) return 'text-gray-500';
    return passed ? 'text-green-600' : 'text-red-600';
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return 'N/A';
    if (unit === 'ms') return `${value.toFixed(2)}ms`;
    return value.toFixed(3);
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Core Web Vitals
        </h3>
        <div
          className={`text-xs px-2 py-1 rounded-full ${
            status.overall
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {status.overall ? '✅ 合格' : '❌ 要改善'}
        </div>
      </div>

      <div className="space-y-2">
        {/* LCP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BoltIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              LCP
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs ${getStatusColor(status.lcp.passed, status.lcp.value)}`}
            >
              {formatValue(status.lcp.value, 'ms')}
            </span>
            {getStatusIcon(status.lcp.passed, status.lcp.value)}
          </div>
        </div>

        {/* FID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              FID
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs ${getStatusColor(status.fid.passed, status.fid.value)}`}
            >
              {formatValue(status.fid.value, 'ms')}
            </span>
            {getStatusIcon(status.fid.passed, status.fid.value)}
          </div>
        </div>

        {/* CLS */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RectangleStackIcon className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              CLS
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs ${getStatusColor(status.cls.passed, status.cls.value)}`}
            >
              {formatValue(status.cls.value, '')}
            </span>
            {getStatusIcon(status.cls.passed, status.cls.value)}
          </div>
        </div>
      </div>

      {/* 基準値表示 */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          基準値: LCP &lt; 2.5s, FID &lt; 100ms, CLS &lt; 0.1
        </div>
      </div>

      {/* 改善推奨事項（基準値を満たしていない場合のみ） */}
      {!status.overall && recommendations.length > 0 && (
        <details className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <summary className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            改善推奨事項
          </summary>
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="text-xs">
                {rec}
              </div>
            ))}
          </div>
        </details>
      )}
    </motion.div>
  );
}

/**
 * Core Web Vitalsの詳細レポートを表示するモーダル
 */
interface CoreWebVitalsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CoreWebVitalsReportModal({
  isOpen,
  onClose,
}: CoreWebVitalsReportModalProps) {
  const [report, setReport] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // 非同期でデータを取得
      const loadData = async () => {
        const monitor = getPerformanceMonitor();
        const currentReport = monitor.generateCoreWebVitalsReport();
        const currentRecommendations =
          monitor.generateOptimizationRecommendations();

        setReport(currentReport);
        setRecommendations(currentRecommendations);
      };

      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Core Web Vitals 詳細レポート
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* レポート内容 */}
          <div className="mb-6">
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              {report}
            </pre>
          </div>

          {/* 改善推奨事項 */}
          {recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                改善推奨事項
              </h3>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
