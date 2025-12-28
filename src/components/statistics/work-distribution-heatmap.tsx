import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface WorkDistributionData {
  hourlyDistribution: Array<{
    hour: number;
    sessionCount: number;
    averageProductivity: number;
  }>;
  dailyDistribution: Array<{
    dayOfWeek: number;
    dayName: string;
    sessionCount: number;
    averageWorkTime: number;
  }>;
  heatmapData: Array<{
    day: number;
    hour: number;
    sessionCount: number;
    productivity: number;
  }>;
}

/**
 * 作業分布ヒートマップコンポーネント（要件3.15対応）
 * 時間帯別・曜日別の作業分布を表示
 */
export const WorkDistributionHeatmap: React.FC = () => {
  const [data, setData] = useState<WorkDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'heatmap' | 'hourly' | 'daily'>(
    'heatmap'
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const distributionData =
          await DatabaseService.getWorkDistributionByTimeAndDay();
        setData(distributionData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '作業分布データの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          作業分布分析
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
          作業分布分析
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          作業分布分析
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>分析に十分なデータがありません</p>
        </div>
      </div>
    );
  }

  const getIntensityColor = (value: number, maxValue: number) => {
    if (maxValue === 0) return 'bg-gray-100 dark:bg-gray-700';
    const intensity = value / maxValue;
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-700';
    if (intensity <= 0.2) return 'bg-blue-200 dark:bg-blue-900/40';
    if (intensity <= 0.4) return 'bg-blue-300 dark:bg-blue-800/60';
    if (intensity <= 0.6) return 'bg-blue-400 dark:bg-blue-700/80';
    if (intensity <= 0.8) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  };

  const getProductivityColor = (productivity: number) => {
    if (productivity === 0) return 'bg-gray-100 dark:bg-gray-700';
    if (productivity <= 20) return 'bg-red-200 dark:bg-red-900/40';
    if (productivity <= 40) return 'bg-orange-300 dark:bg-orange-800/60';
    if (productivity <= 60) return 'bg-yellow-400 dark:bg-yellow-700/80';
    if (productivity <= 80) return 'bg-green-400 dark:bg-green-600';
    return 'bg-green-500 dark:bg-green-500';
  };

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // ヒートマップ用のデータを整理
  const heatmapMatrix: Record<
    string,
    { sessionCount: number; productivity: number }
  > = {};
  data.heatmapData.forEach(item => {
    const key = `${item.day}-${item.hour}`;
    heatmapMatrix[key] = {
      sessionCount: item.sessionCount,
      productivity: item.productivity,
    };
  });

  const maxSessions = Math.max(
    ...data.heatmapData.map(item => item.sessionCount),
    1
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          作業分布分析
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'heatmap'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            ヒートマップ
          </button>
          <button
            onClick={() => setViewMode('hourly')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'hourly'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            時間帯別
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 text-sm rounded-md ${
              viewMode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            曜日別
          </button>
        </div>
      </div>

      {viewMode === 'heatmap' && (
        <div className="space-y-6">
          {/* セッション数ヒートマップ */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              セッション数ヒートマップ
            </h4>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* 時間軸ヘッダー */}
                <div className="flex">
                  <div className="w-12"></div>
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="w-8 h-6 text-xs text-center text-gray-500 dark:text-gray-400"
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* ヒートマップグリッド */}
                {dayNames.map((dayName, dayIndex) => (
                  <div key={dayIndex} className="flex">
                    <div className="w-12 h-8 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {dayName}
                    </div>
                    {hours.map(hour => {
                      const key = `${dayIndex}-${hour}`;
                      const cellData = heatmapMatrix[key] || {
                        sessionCount: 0,
                        productivity: 0,
                      };
                      return (
                        <div
                          key={hour}
                          className={`w-8 h-8 border border-gray-200 dark:border-gray-600 ${getIntensityColor(
                            cellData.sessionCount,
                            maxSessions
                          )} flex items-center justify-center text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                          title={`${dayName}曜日 ${hour}時: ${cellData.sessionCount}セッション (${cellData.productivity}%完了率)`}
                        >
                          {cellData.sessionCount > 0
                            ? cellData.sessionCount
                            : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 凡例 */}
            <div className="flex items-center justify-center mt-4 space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                少ない
              </span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 border"></div>
                <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900/40 border"></div>
                <div className="w-4 h-4 bg-blue-300 dark:bg-blue-800/60 border"></div>
                <div className="w-4 h-4 bg-blue-400 dark:bg-blue-700/80 border"></div>
                <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 border"></div>
                <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 border"></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                多い
              </span>
            </div>
          </div>

          {/* 生産性ヒートマップ */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              生産性ヒートマップ（完了率）
            </h4>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* 時間軸ヘッダー */}
                <div className="flex">
                  <div className="w-12"></div>
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className="w-8 h-6 text-xs text-center text-gray-500 dark:text-gray-400"
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* ヒートマップグリッド */}
                {dayNames.map((dayName, dayIndex) => (
                  <div key={dayIndex} className="flex">
                    <div className="w-12 h-8 flex items-center text-sm text-gray-600 dark:text-gray-400">
                      {dayName}
                    </div>
                    {hours.map(hour => {
                      const key = `${dayIndex}-${hour}`;
                      const cellData = heatmapMatrix[key] || {
                        sessionCount: 0,
                        productivity: 0,
                      };
                      return (
                        <div
                          key={hour}
                          className={`w-8 h-8 border border-gray-200 dark:border-gray-600 ${getProductivityColor(
                            cellData.productivity
                          )} flex items-center justify-center text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                          title={`${dayName}曜日 ${hour}時: ${cellData.productivity}%完了率 (${cellData.sessionCount}セッション)`}
                        >
                          {cellData.sessionCount > 0
                            ? Math.round(cellData.productivity)
                            : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 凡例 */}
            <div className="flex items-center justify-center mt-4 space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                低い
              </span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 border"></div>
                <div className="w-4 h-4 bg-red-200 dark:bg-red-900/40 border"></div>
                <div className="w-4 h-4 bg-orange-300 dark:bg-orange-800/60 border"></div>
                <div className="w-4 h-4 bg-yellow-400 dark:bg-yellow-700/80 border"></div>
                <div className="w-4 h-4 bg-green-400 dark:bg-green-600 border"></div>
                <div className="w-4 h-4 bg-green-500 dark:bg-green-500 border"></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                高い
              </span>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'hourly' && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            時間帯別分析
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* セッション数グラフ */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                時間別セッション数
              </h5>
              <div className="space-y-2">
                {data.hourlyDistribution
                  .filter(item => item.sessionCount > 0)
                  .sort((a, b) => b.sessionCount - a.sessionCount)
                  .slice(0, 12)
                  .map(item => (
                    <div
                      key={item.hour}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-12 text-sm text-gray-600 dark:text-gray-400">
                        {item.hour}時
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className="bg-blue-500 h-4 rounded-full flex items-center justify-end pr-2"
                          style={{
                            width: `${
                              (item.sessionCount /
                                Math.max(
                                  ...data.hourlyDistribution.map(
                                    h => h.sessionCount
                                  )
                                )) *
                              100
                            }%`,
                          }}
                        >
                          <span className="text-xs text-white font-medium">
                            {item.sessionCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 生産性グラフ */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                時間別生産性
              </h5>
              <div className="space-y-2">
                {data.hourlyDistribution
                  .filter(item => item.sessionCount > 0)
                  .sort((a, b) => b.averageProductivity - a.averageProductivity)
                  .slice(0, 12)
                  .map(item => (
                    <div
                      key={item.hour}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-12 text-sm text-gray-600 dark:text-gray-400">
                        {item.hour}時
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className="bg-green-500 h-4 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${item.averageProductivity}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {Math.round(item.averageProductivity)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'daily' && (
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            曜日別分析
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {data.dailyDistribution.map(item => (
              <div
                key={item.dayOfWeek}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
              >
                <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.dayName}
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {item.sessionCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      セッション
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {item.averageWorkTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      平均作業時間（分）
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* インサイト */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          作業パターンのインサイト
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 最も活発な時間帯 */}
          {(() => {
            const mostActiveHour = data.hourlyDistribution.reduce(
              (max, current) =>
                current.sessionCount > max.sessionCount ? current : max,
              data.hourlyDistribution[0]
            );
            return (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-blue-600 dark:text-blue-400 text-lg">
                    ⏰
                  </div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    最も活発な時間帯
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {mostActiveHour.hour}時台
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {mostActiveHour.sessionCount}セッション（生産性:{' '}
                  {Math.round(mostActiveHour.averageProductivity)}%）
                </div>
              </div>
            );
          })()}

          {/* 最も生産的な曜日 */}
          {(() => {
            const mostProductiveDay = data.dailyDistribution.reduce(
              (max, current) =>
                current.averageWorkTime > max.averageWorkTime ? current : max,
              data.dailyDistribution[0]
            );
            return (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="text-green-600 dark:text-green-400 text-lg">
                    📅
                  </div>
                  <span className="font-medium text-green-800 dark:text-green-200">
                    最も生産的な曜日
                  </span>
                </div>
                <div className="text-lg font-bold text-green-900 dark:text-green-100">
                  {mostProductiveDay.dayName}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  平均{mostProductiveDay.averageWorkTime}分の作業時間
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
