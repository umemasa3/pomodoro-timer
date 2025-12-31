/**
 * 応答時間監視ダッシュボードコンポーネント
 * リアルタイムで応答時間を表示し、2秒以内の目標達成状況を監視
 */

import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getPerformanceMonitor } from '../../services/performance-monitor';

interface ResponseTimeStats {
  apiResponseTime: { average: number; p95: number; p99: number; count: number };
  pageTransitionTime: {
    average: number;
    p95: number;
    p99: number;
    count: number;
  };
  routeChangeTime: { average: number; p95: number; p99: number; count: number };
  componentRenderTime: {
    average: number;
    p95: number;
    p99: number;
    count: number;
  };
  navigationTime: { average: number; p95: number; p99: number; count: number };
  overall: {
    averageResponseTime: number;
    targetsMet: {
      api: boolean;
      pageTransition: boolean;
      routeChange: boolean;
      component: boolean;
      navigation: boolean;
    };
  };
}

interface ResponseTimeDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  refreshInterval?: number;
  showRecommendations?: boolean;
  compact?: boolean;
}

/**
 * 応答時間ダッシュボードコンポーネント
 */
export function ResponseTimeDashboard({
  isOpen,
  onClose,
  refreshInterval = 5000,
  showRecommendations = true,
  compact = false,
}: ResponseTimeDashboardProps) {
  const [stats, setStats] = useState<ResponseTimeStats | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const performanceMonitor = getPerformanceMonitor();

  // 統計データの更新
  const updateStats = useCallback(() => {
    try {
      const responseTimeStats = performanceMonitor.getResponseTimeStats();
      setStats(responseTimeStats);

      if (showRecommendations) {
        const newRecommendations =
          performanceMonitor.generateResponseTimeOptimizationRecommendations();
        setRecommendations(newRecommendations);
      }

      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (error) {
      console.error('応答時間統計の取得に失敗:', error);
      setIsLoading(false);
    }
  }, [performanceMonitor, showRecommendations]);

  // 定期更新の設定
  useEffect(() => {
    if (!isOpen) return;

    // 初期データ読み込みを非同期で実行
    const loadInitialData = async () => {
      await updateStats();
    };

    loadInitialData();

    const interval = setInterval(updateStats, refreshInterval);

    return () => clearInterval(interval);
  }, [isOpen, refreshInterval, showRecommendations, updateStats]);

  // 目標達成状況の表示色を取得
  const getStatusColor = (targetMet: boolean): string => {
    return targetMet ? 'text-green-600' : 'text-red-600';
  };

  // 目標達成状況のアイコンを取得
  const getStatusIcon = (targetMet: boolean): string => {
    return targetMet ? '✅' : '❌';
  };

  // 時間の表示フォーマット
  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">応答時間監視</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center text-gray-500">
            応答時間データがありません
          </div>
        </div>
      </div>
    );
  }

  const allTargetsMet = Object.values(stats.overall.targetsMet).every(
    met => met
  );

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">応答時間監視</h3>
          <div
            className={`text-sm font-medium ${getStatusColor(allTargetsMet)}`}
          >
            {getStatusIcon(allTargetsMet)}{' '}
            {allTargetsMet ? '目標達成' : '要改善'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">平均応答時間</div>
            <div className="font-medium">
              {formatTime(stats.overall.averageResponseTime)}
            </div>
          </div>
          <div>
            <div className="text-gray-600">API応答時間</div>
            <div
              className={`font-medium ${getStatusColor(stats.overall.targetsMet.api)}`}
            >
              {formatTime(stats.apiResponseTime.average)}
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          最終更新: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            ⚡ 応答時間監視ダッシュボード
          </h2>
          <div className="flex items-center space-x-4">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                allTargetsMet
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {getStatusIcon(allTargetsMet)}{' '}
              {allTargetsMet ? '全目標達成' : '改善が必要'}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 総合統計 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            📊 総合統計
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(stats.overall.averageResponseTime)}
              </div>
              <div className="text-sm text-gray-600">全体平均応答時間</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  Object.values(stats.overall.targetsMet).filter(met => met)
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">目標達成項目数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(stats).reduce((total, stat) => {
                  return (
                    total +
                    (typeof stat === 'object' && 'count' in stat
                      ? stat.count
                      : 0)
                  );
                }, 0)}
              </div>
              <div className="text-sm text-gray-600">総測定回数</div>
            </div>
          </div>
        </div>

        {/* 詳細統計 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* API応答時間 */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">🌐 API応答時間</h4>
              <span
                className={`text-sm font-medium ${getStatusColor(stats.overall.targetsMet.api)}`}
              >
                {getStatusIcon(stats.overall.targetsMet.api)} 目標: 2秒以内
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">平均:</span>
                <span className="font-medium">
                  {formatTime(stats.apiResponseTime.average)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">95%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.apiResponseTime.p95)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">99%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.apiResponseTime.p99)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">測定回数:</span>
                <span className="font-medium">
                  {stats.apiResponseTime.count}
                </span>
              </div>
            </div>
          </div>

          {/* ページ遷移時間 */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">📄 ページ遷移時間</h4>
              <span
                className={`text-sm font-medium ${getStatusColor(stats.overall.targetsMet.pageTransition)}`}
              >
                {getStatusIcon(stats.overall.targetsMet.pageTransition)} 目標:
                1秒以内
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">平均:</span>
                <span className="font-medium">
                  {formatTime(stats.pageTransitionTime.average)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">95%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.pageTransitionTime.p95)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">99%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.pageTransitionTime.p99)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">測定回数:</span>
                <span className="font-medium">
                  {stats.pageTransitionTime.count}
                </span>
              </div>
            </div>
          </div>

          {/* ルート変更時間 */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">🛣️ ルート変更時間</h4>
              <span
                className={`text-sm font-medium ${getStatusColor(stats.overall.targetsMet.routeChange)}`}
              >
                {getStatusIcon(stats.overall.targetsMet.routeChange)} 目標:
                800ms以内
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">平均:</span>
                <span className="font-medium">
                  {formatTime(stats.routeChangeTime.average)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">95%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.routeChangeTime.p95)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">99%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.routeChangeTime.p99)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">測定回数:</span>
                <span className="font-medium">
                  {stats.routeChangeTime.count}
                </span>
              </div>
            </div>
          </div>

          {/* コンポーネント描画時間 */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">
                🧩 コンポーネント描画時間
              </h4>
              <span
                className={`text-sm font-medium ${getStatusColor(stats.overall.targetsMet.component)}`}
              >
                {getStatusIcon(stats.overall.targetsMet.component)} 目標:
                100ms以内
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">平均:</span>
                <span className="font-medium">
                  {formatTime(stats.componentRenderTime.average)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">95%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.componentRenderTime.p95)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">99%ile:</span>
                <span className="font-medium">
                  {formatTime(stats.componentRenderTime.p99)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">測定回数:</span>
                <span className="font-medium">
                  {stats.componentRenderTime.count}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 最適化推奨事項 */}
        {showRecommendations && recommendations.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              💡 最適化推奨事項
            </h3>
            <div className="space-y-2 text-sm text-yellow-700">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="whitespace-pre-line">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 更新情報 */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          最終更新: {lastUpdated.toLocaleString()} | 自動更新間隔:{' '}
          {refreshInterval / 1000}秒
        </div>
      </div>
    </div>
  );
}

export default ResponseTimeDashboard;
