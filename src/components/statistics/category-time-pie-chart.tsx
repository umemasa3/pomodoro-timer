import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface CategoryTimeData {
  categoryData: Array<{
    tagName: string;
    tagColor: string;
    workTime: number;
    sessionCount: number;
    percentage: number;
  }>;
  totalWorkTime: number;
  totalSessions: number;
}

/**
 * タスクカテゴリ別時間配分円グラフコンポーネント（要件3.16対応）
 * タスクカテゴリ別の時間配分を円グラフで表示
 */
export const CategoryTimePieChart: React.FC = () => {
  const [data, setData] = useState<CategoryTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const categoryData =
          await DatabaseService.getTaskCategoryTimeDistribution();
        setData(categoryData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'カテゴリ別時間配分データの取得に失敗しました'
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
          カテゴリ別時間配分
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
          カテゴリ別時間配分
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.categoryData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          カテゴリ別時間配分
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>カテゴリ別データがありません</p>
          <p className="text-sm mt-2">
            タグ付きタスクで作業を開始すると、時間配分が表示されます
          </p>
        </div>
      </div>
    );
  }

  // 円グラフ用のSVGパスを計算
  const calculatePieSlices = (categories: CategoryTimeData['categoryData']) => {
    let cumulativePercentage = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    return categories.map(category => {
      const startAngle =
        (cumulativePercentage / 100) * 2 * Math.PI - Math.PI / 2;
      const endAngle =
        ((cumulativePercentage + category.percentage) / 100) * 2 * Math.PI -
        Math.PI / 2;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = category.percentage > 50 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      cumulativePercentage += category.percentage;

      return {
        ...category,
        pathData,
        startAngle,
        endAngle,
      };
    });
  };

  const pieSlices = calculatePieSlices(data.categoryData);

  // 時間を時間:分形式に変換
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      data-testid="category-time-pie-chart"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        カテゴリ別時間配分
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 円グラフ */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg width="200" height="200" className="transform rotate-0">
              {pieSlices.map(slice => (
                <path
                  key={slice.tagName}
                  d={slice.pathData}
                  fill={slice.tagColor}
                  stroke="white"
                  strokeWidth="2"
                  className={`cursor-pointer transition-all duration-200 ${
                    hoveredCategory === slice.tagName
                      ? 'opacity-80 transform scale-105'
                      : 'opacity-100'
                  }`}
                  onMouseEnter={() => setHoveredCategory(slice.tagName)}
                  onMouseLeave={() => setHoveredCategory(null)}
                />
              ))}

              {/* 中央の統計情報 */}
              <circle
                cx="100"
                cy="100"
                r="40"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="2"
                className="dark:fill-gray-800 dark:stroke-gray-600"
              />
              <text
                x="100"
                y="95"
                textAnchor="middle"
                className="text-sm font-semibold fill-gray-900 dark:fill-white"
              >
                総時間
              </text>
              <text
                x="100"
                y="110"
                textAnchor="middle"
                className="text-lg font-bold fill-blue-600 dark:fill-blue-400"
              >
                {formatTime(data.totalWorkTime)}
              </text>
            </svg>

            {/* ホバー時の詳細情報 */}
            {hoveredCategory && (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                <div className="bg-black bg-opacity-75 text-white p-3 rounded-lg text-center">
                  <div className="font-semibold">{hoveredCategory}</div>
                  <div className="text-sm">
                    {pieSlices
                      .find(s => s.tagName === hoveredCategory)
                      ?.percentage.toFixed(1)}
                    %
                  </div>
                  <div className="text-sm">
                    {formatTime(
                      pieSlices.find(s => s.tagName === hoveredCategory)
                        ?.workTime || 0
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 凡例と詳細 */}
        <div className="space-y-4" data-testid="pie-chart-legend">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            カテゴリ詳細
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.categoryData.map(category => (
              <div
                key={category.tagName}
                className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                  hoveredCategory === category.tagName
                    ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                onMouseEnter={() => setHoveredCategory(category.tagName)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.tagColor }}
                    ></div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.tagName}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">
                      作業時間
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatTime(category.workTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">
                      セッション数
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {category.sessionCount}
                    </div>
                  </div>
                </div>

                {/* 進捗バー */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: category.tagColor,
                        width: `${category.percentage}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          時間配分サマリー
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {data.categoryData.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              カテゴリ数
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatTime(data.totalWorkTime)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              総作業時間
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.totalSessions}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              総セッション数
            </div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {data.totalSessions > 0
                ? Math.round(data.totalWorkTime / data.totalSessions)
                : 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              平均セッション時間（分）
            </div>
          </div>
        </div>
      </div>

      {/* 効率性分析 */}
      {data.categoryData.length > 1 && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            効率性分析
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 最も時間を使っているカテゴリ */}
            {(() => {
              const topCategory = data.categoryData[0];
              return (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: topCategory.tagColor }}
                    ></div>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">
                      最多時間カテゴリ
                    </span>
                  </div>
                  <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                    {topCategory.tagName}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    全体の{topCategory.percentage.toFixed(1)}%（
                    {formatTime(topCategory.workTime)}）
                  </div>
                </div>
              );
            })()}

            {/* 最も効率的なカテゴリ */}
            {(() => {
              const mostEfficientCategory = [...data.categoryData]
                .filter(cat => cat.sessionCount > 0)
                .sort(
                  (a, b) =>
                    b.workTime / b.sessionCount - a.workTime / a.sessionCount
                )[0];

              return mostEfficientCategory ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: mostEfficientCategory.tagColor,
                      }}
                    ></div>
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                      最高効率カテゴリ
                    </span>
                  </div>
                  <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                    {mostEfficientCategory.tagName}
                  </div>
                  <div className="text-sm text-emerald-700 dark:text-emerald-300">
                    {Math.round(
                      mostEfficientCategory.workTime /
                        mostEfficientCategory.sessionCount
                    )}
                    分/セッション
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
