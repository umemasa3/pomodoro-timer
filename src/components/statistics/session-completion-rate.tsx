import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface SessionCompletionData {
  completionRate: number;
  totalSessions: number;
  completedSessions: number;
  averageSessionLength: number;
  focusScore: number;
}

/**
 * セッション完了率コンポーネント（要件3.10対応）
 * 平均セッション完了率と集中度指標を表示
 */
export const SessionCompletionRate: React.FC = () => {
  const [data, setData] = useState<SessionCompletionData>({
    completionRate: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageSessionLength: 0,
    focusScore: 0,
  });
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const completionData =
          await DatabaseService.getSessionCompletionRate(period);
        setData(completionData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'セッション完了率データの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const getCompletionRateLevel = (rate: number) => {
    if (rate >= 90)
      return {
        level: 'excellent',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/20',
      };
    if (rate >= 75)
      return {
        level: 'good',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
      };
    if (rate >= 60)
      return {
        level: 'average',
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      };
    if (rate >= 40)
      return {
        level: 'needs-improvement',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/20',
      };
    return {
      level: 'poor',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
    };
  };

  const getFocusScoreLevel = (score: number) => {
    if (score >= 90)
      return {
        level: 'excellent',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/20',
      };
    if (score >= 75)
      return {
        level: 'good',
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-100 dark:bg-indigo-900/20',
      };
    if (score >= 60)
      return {
        level: 'average',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/20',
      };
    if (score >= 40)
      return {
        level: 'needs-improvement',
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      };
    return {
      level: 'poor',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
    };
  };

  const getCompletionMessage = (rate: number) => {
    if (rate >= 90) return '素晴らしい完了率です！';
    if (rate >= 75) return '良い完了率を保っています！';
    if (rate >= 60) return '平均的な完了率です。';
    if (rate >= 40) return '完了率の改善が必要です。';
    return '完了率が低めです。集中環境を見直してみましょう。';
  };

  const getFocusMessage = (score: number) => {
    if (score >= 90) return '非常に高い集中力です！';
    if (score >= 75) return '良い集中力を保っています！';
    if (score >= 60) return '平均的な集中力です。';
    if (score >= 40) return '集中力の向上が必要です。';
    return '集中力が低めです。環境や時間帯を見直してみましょう。';
  };

  const getCompletionIcon = (rate: number) => {
    if (rate >= 90) return '🎯';
    if (rate >= 75) return '✅';
    if (rate >= 60) return '📊';
    if (rate >= 40) return '⚠️';
    return '🔄';
  };

  const getFocusIcon = (score: number) => {
    if (score >= 90) return '🧠';
    if (score >= 75) return '💡';
    if (score >= 60) return '🎯';
    if (score >= 40) return '⏰';
    return '💭';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          セッション完了率・集中度
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          セッション完了率・集中度
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const completionLevel = getCompletionRateLevel(data.completionRate);
  const focusLevel = getFocusScoreLevel(data.focusScore);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          セッション完了率・集中度
        </h3>
        <div className="flex space-x-2">
          {[
            { value: 7, label: '7日' },
            { value: 30, label: '30日' },
            { value: 90, label: '90日' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value as 7 | 30 | 90)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                period === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data.totalSessions === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>セッションデータがありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* メイン指標 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 完了率 */}
            <div
              className={`p-6 rounded-lg ${completionLevel.bg} border border-gray-200 dark:border-gray-700`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {getCompletionIcon(data.completionRate)}
                </div>
                <div
                  className={`text-3xl font-bold mb-2 ${completionLevel.color}`}
                >
                  {data.completionRate}%
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  セッション完了率
                </div>
                <div className={`text-sm ${completionLevel.color}`}>
                  {getCompletionMessage(data.completionRate)}
                </div>
              </div>
            </div>

            {/* 集中度スコア */}
            <div
              className={`p-6 rounded-lg ${focusLevel.bg} border border-gray-200 dark:border-gray-700`}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">
                  {getFocusIcon(data.focusScore)}
                </div>
                <div className={`text-3xl font-bold mb-2 ${focusLevel.color}`}>
                  {data.focusScore}
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  集中度スコア
                </div>
                <div className={`text-sm ${focusLevel.color}`}>
                  {getFocusMessage(data.focusScore)}
                </div>
              </div>
            </div>
          </div>

          {/* 進捗バー */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>完了率</span>
                <span>{data.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    data.completionRate >= 90
                      ? 'bg-green-500'
                      : data.completionRate >= 75
                        ? 'bg-blue-500'
                        : data.completionRate >= 60
                          ? 'bg-yellow-500'
                          : data.completionRate >= 40
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.completionRate, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>集中度スコア</span>
                <span>{data.focusScore}/100</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    data.focusScore >= 90
                      ? 'bg-purple-500'
                      : data.focusScore >= 75
                        ? 'bg-indigo-500'
                        : data.focusScore >= 60
                          ? 'bg-blue-500'
                          : data.focusScore >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.focusScore, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 詳細統計 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {data.totalSessions}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                総セッション数
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {data.completedSessions}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                完了セッション数
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {data.averageSessionLength}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                平均セッション長（分）
              </div>
            </div>
          </div>

          {/* 改善提案 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              💡 改善提案
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {data.completionRate < 75 && (
                <p>
                  • セッション完了率を上げるため、集中しやすい環境を整えましょう
                </p>
              )}
              {data.focusScore < 75 && (
                <p>
                  • 集中度を高めるため、セッション前の準備時間を設けてみましょう
                </p>
              )}
              {data.averageSessionLength < 20 && (
                <p>
                  • セッション時間が短めです。目標時間の設定を見直してみましょう
                </p>
              )}
              {data.completionRate >= 75 && data.focusScore >= 75 && (
                <p>• 素晴らしいパフォーマンスです！この調子で継続しましょう</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
