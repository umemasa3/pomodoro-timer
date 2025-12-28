import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface ProductivityData {
  mostProductiveTag: string;
  bestTimeSlot: string;
  productivity: number;
  tagTimeAnalysis: Array<{
    tagName: string;
    timeSlot: string;
    sessionCount: number;
    completionRate: number;
    averageWorkTime: number;
  }>;
}

/**
 * 生産性分析コンポーネント（要件3.13対応）
 * 最も生産的なタグと時間帯の組み合わせを表示
 */
export const ProductivityAnalysis: React.FC = () => {
  const [data, setData] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const productivityData =
          await DatabaseService.getMostProductiveTagTimeSlots();
        setData(productivityData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '生産性分析データの取得に失敗しました'
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
          生産性分析
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
          生産性分析
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.tagTimeAnalysis.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          生産性分析
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>分析に十分なデータがありません</p>
          <p className="text-sm mt-2">
            タグ付きタスクでセッションを完了すると、生産性分析が表示されます
          </p>
        </div>
      </div>
    );
  }

  const getTimeSlotIcon = (timeSlot: string) => {
    if (timeSlot.includes('朝')) return '🌅';
    if (timeSlot.includes('昼')) return '☀️';
    if (timeSlot.includes('夜')) return '🌆';
    if (timeSlot.includes('深夜')) return '🌙';
    return '⏰';
  };

  const getProductivityColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (rate >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProductivityBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (rate >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (rate >= 40) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        生産性分析
      </h3>

      <div className="space-y-6">
        {/* 最も生産的な組み合わせ */}
        {data.mostProductiveTag && (
          <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">🏆</div>
              <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                最も生産的な組み合わせ
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  タグ
                </div>
                <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                  {data.mostProductiveTag}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  時間帯
                </div>
                <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                  {getTimeSlotIcon(data.bestTimeSlot)} {data.bestTimeSlot}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  生産性
                </div>
                <div className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                  {data.productivity}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タグ・時間帯別分析 */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            タグ・時間帯別詳細分析
          </h4>
          <div className="space-y-3">
            {data.tagTimeAnalysis
              .filter(item => item.sessionCount >= 2) // 最低2セッション以上のデータのみ表示
              .slice(0, 10) // 上位10件のみ表示
              .map((item, index) => (
                <div
                  key={`${item.tagName}-${item.timeSlot}`}
                  className={`p-4 rounded-lg border ${getProductivityBg(
                    item.completionRate
                  )} border-gray-200 dark:border-gray-700`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg">
                        {index === 0
                          ? '🥇'
                          : index === 1
                            ? '🥈'
                            : index === 2
                              ? '🥉'
                              : '📊'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.tagName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {getTimeSlotIcon(item.timeSlot)} {item.timeSlot}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-lg font-bold ${getProductivityColor(
                          item.completionRate
                        )}`}
                      >
                        {item.completionRate}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        完了率
                      </div>
                    </div>
                  </div>

                  {/* 進捗バー */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          item.completionRate >= 80
                            ? 'bg-green-500'
                            : item.completionRate >= 60
                              ? 'bg-yellow-500'
                              : item.completionRate >= 40
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                        }`}
                        style={{ width: `${item.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 詳細統計 */}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {item.sessionCount}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        セッション数
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {item.averageWorkTime}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        平均作業時間（分）
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {item.sessionCount > 0
                          ? Math.round(
                              (item.averageWorkTime / 25) * 100 * 100
                            ) / 100
                          : 0}
                        %
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        効率性
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 時間帯別サマリー */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            時間帯別生産性サマリー
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              '朝（6-12時）',
              '昼（12-18時）',
              '夜（18-24時）',
              '深夜（0-6時）',
            ].map(timeSlot => {
              const timeSlotData = data.tagTimeAnalysis.filter(item =>
                item.timeSlot.includes(timeSlot.split('（')[0])
              );
              const avgProductivity =
                timeSlotData.length > 0
                  ? Math.round(
                      timeSlotData.reduce(
                        (sum, item) => sum + item.completionRate,
                        0
                      ) / timeSlotData.length
                    )
                  : 0;
              const totalSessions = timeSlotData.reduce(
                (sum, item) => sum + item.sessionCount,
                0
              );

              return (
                <div
                  key={timeSlot}
                  className={`p-4 rounded-lg ${getProductivityBg(
                    avgProductivity
                  )} border border-gray-200 dark:border-gray-700`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {getTimeSlotIcon(timeSlot)}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      {timeSlot}
                    </div>
                    <div
                      className={`text-xl font-bold ${getProductivityColor(
                        avgProductivity
                      )}`}
                    >
                      {avgProductivity}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {totalSessions} セッション
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 推奨事項 */}
        {data.mostProductiveTag && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              生産性向上の推奨事項
            </h4>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-600 dark:text-blue-400 text-lg">
                    💡
                  </div>
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      最適な作業時間
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      「{data.mostProductiveTag}」タスクは{data.bestTimeSlot}
                      に取り組むと最も効率的です（{data.productivity}%の完了率）
                    </div>
                  </div>
                </div>
              </div>

              {data.tagTimeAnalysis.length > 1 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <div className="text-green-600 dark:text-green-400 text-lg">
                      📈
                    </div>
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                        パフォーマンス向上のヒント
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        生産性の高い時間帯とタグの組み合わせを意識して、重要なタスクをスケジュールしましょう
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
