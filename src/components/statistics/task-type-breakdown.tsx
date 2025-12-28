import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface TaskTypeData {
  priority: string;
  count: number;
  completedCount: number;
  totalWorkTime: number;
}

/**
 * タスク種類別内訳コンポーネント（要件3.8対応）
 * 優先度別のタスク数、完了数、作業時間を表示
 */
export const TaskTypeBreakdown: React.FC = () => {
  const [data, setData] = useState<TaskTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const breakdown = await DatabaseService.getTaskTypeBreakdown();
        setData(breakdown);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'タスク内訳データの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高優先度';
      case 'medium':
        return '中優先度';
      case 'low':
        return '低優先度';
      default:
        return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-100 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          accent: 'bg-red-500',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-800 dark:text-yellow-200',
          accent: 'bg-yellow-500',
        };
      case 'low':
        return {
          bg: 'bg-green-100 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          accent: 'bg-green-500',
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          accent: 'bg-gray-500',
        };
    }
  };

  const getCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const totalTasks = data.reduce((sum, item) => sum + item.count, 0);
  const totalCompleted = data.reduce(
    (sum, item) => sum + item.completedCount,
    0
  );
  const totalWorkTime = data.reduce((sum, item) => sum + item.totalWorkTime, 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タスク種類別内訳
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
          タスク種類別内訳
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        タスク種類別内訳
      </h3>

      {data.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>タスクデータがありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 優先度別詳細 */}
          <div className="space-y-4">
            {data.map(item => {
              const colors = getPriorityColor(item.priority);
              const completionRate = getCompletionRate(
                item.completedCount,
                item.count
              );

              return (
                <div
                  key={item.priority}
                  className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${colors.accent}`}
                      ></div>
                      <h4 className={`font-medium ${colors.text}`}>
                        {getPriorityLabel(item.priority)}
                      </h4>
                    </div>
                    <div className={`text-sm font-medium ${colors.text}`}>
                      {completionRate}% 完了
                    </div>
                  </div>

                  {/* 進捗バー */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors.accent} transition-all duration-300`}
                        style={{ width: `${completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${colors.text}`}>
                        {item.count}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        総タスク数
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${colors.text}`}>
                        {item.completedCount}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        完了数
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${colors.text}`}>
                        {item.totalWorkTime}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        作業時間（分）
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 全体サマリー */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              全体サマリー
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalTasks}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  総タスク数
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {totalCompleted}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  完了タスク数
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {getCompletionRate(totalCompleted, totalTasks)}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  全体完了率
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {totalWorkTime}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  総作業時間（分）
                </div>
              </div>
            </div>
          </div>

          {/* 円グラフ風の視覚化 */}
          {totalTasks > 0 && (
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                優先度別分布
              </h4>
              <div className="flex items-center justify-center space-x-8">
                {data.map(item => {
                  const colors = getPriorityColor(item.priority);
                  const percentage = Math.round(
                    (item.count / totalTasks) * 100
                  );

                  return (
                    <div key={item.priority} className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg
                          className="w-16 h-16 transform -rotate-90"
                          viewBox="0 0 36 36"
                        >
                          <path
                            className="text-gray-200 dark:text-gray-700"
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                          <path
                            className={colors.text}
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${percentage}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${colors.text}`}>
                        {getPriorityLabel(item.priority)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
