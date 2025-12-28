import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface WorkTimeData {
  date: string;
  workTime: number;
  sessionCount: number;
}

/**
 * 作業時間グラフコンポーネント（要件3.7対応）
 * 日別・週別・月別の作業時間をグラフで表示
 */
export const WorkTimeGraph: React.FC = () => {
  const [data, setData] = useState<WorkTimeData[]>([]);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const graphData = await DatabaseService.getWorkTimeGraphData(
          parseInt(period)
        );
        setData(graphData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '作業時間データの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const maxWorkTime = Math.max(...data.map(d => d.workTime), 0);
  const maxHeight = 200; // グラフの最大高さ（px）

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getBarHeight = (workTime: number) => {
    if (maxWorkTime === 0) return 0;
    return (workTime / maxWorkTime) * maxHeight;
  };

  const getBarColor = (workTime: number) => {
    if (workTime === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (workTime < 60) return 'bg-blue-300 dark:bg-blue-600';
    if (workTime < 120) return 'bg-green-400 dark:bg-green-500';
    if (workTime < 180) return 'bg-yellow-400 dark:bg-yellow-500';
    return 'bg-red-400 dark:bg-red-500';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          作業時間グラフ
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
          作業時間グラフ
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          作業時間グラフ
        </h3>
        <div className="flex space-x-2">
          {[
            { value: '7', label: '7日' },
            { value: '30', label: '30日' },
            { value: '90', label: '90日' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value as '7' | '30' | '90')}
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

      {data.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>作業データがありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* グラフ */}
          <div className="relative">
            <div className="flex items-end justify-between space-x-1 h-64 mb-2">
              {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${getBarColor(
                      item.workTime
                    )}`}
                    style={{ height: `${getBarHeight(item.workTime)}px` }}
                    title={`${formatDate(item.date)}: ${item.workTime}分 (${item.sessionCount}セッション)`}
                  />
                </div>
              ))}
            </div>

            {/* X軸ラベル */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              {data.map((item, index) => {
                // 表示する日付を間引く
                const shouldShow =
                  period === '7' ||
                  (period === '30' && index % 3 === 0) ||
                  (period === '90' && index % 7 === 0);

                return (
                  <div key={index} className="flex-1 text-center">
                    {shouldShow ? formatDate(item.date) : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 凡例 */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">0分</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-300 dark:bg-blue-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">1-59分</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 dark:bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">60-119分</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-400 dark:bg-yellow-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">
                120-179分
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 dark:bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">
                180分以上
              </span>
            </div>
          </div>

          {/* 統計サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.reduce((sum, item) => sum + item.workTime, 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                総作業時間（分）
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {data.reduce((sum, item) => sum + item.sessionCount, 0)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                総セッション数
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {Math.round(
                  data.reduce((sum, item) => sum + item.workTime, 0) /
                    Math.max(data.filter(item => item.workTime > 0).length, 1)
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                平均作業時間（分/日）
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {data.filter(item => item.workTime > 0).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                作業日数
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
