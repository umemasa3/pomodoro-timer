import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface TagStatData {
  tagId: string;
  tagName: string;
  tagColor: string;
  completedTasks: number;
  totalWorkTime: number;
  sessionCount: number;
  averageTaskCompletion: number;
}

/**
 * タグ別統計コンポーネント（要件3.12, 3.17対応）
 * タグごとの完了タスク数と作業時間を表示
 */
export const TagStatistics: React.FC = () => {
  const [data, setData] = useState<TagStatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const tagStats = await DatabaseService.getTagStatistics();
        setData(tagStats);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'タグ別統計データの取得に失敗しました'
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
          タグ別統計
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
          タグ別統計
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タグ別統計
        </h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <p>タグ付きタスクがありません</p>
          <p className="text-sm mt-2">
            タスクにタグを追加すると、ここに統計が表示されます
          </p>
        </div>
      </div>
    );
  }

  // 総作業時間を計算
  const totalWorkTime = data.reduce((sum, item) => sum + item.totalWorkTime, 0);
  const totalSessions = data.reduce((sum, item) => sum + item.sessionCount, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3
        className="text-lg font-semibold text-gray-900 dark:text-white mb-6"
        data-testid="tag-statistics-title"
      >
        タグ別統計
      </h3>

      <div className="space-y-6">
        {/* タグ別詳細統計 */}
        <div className="space-y-4">
          {data
            .sort((a, b) => b.totalWorkTime - a.totalWorkTime)
            .map(tag => {
              const workTimePercentage =
                totalWorkTime > 0
                  ? Math.round((tag.totalWorkTime / totalWorkTime) * 100)
                  : 0;

              return (
                <div
                  key={tag.tagId}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
                  data-testid="tag-stat-item"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.tagColor }}
                      ></div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {tag.tagName}
                      </h4>
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {workTimePercentage}% の時間
                    </div>
                  </div>

                  {/* 進捗バー */}
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: tag.tagColor,
                          width: `${workTimePercentage}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* 統計情報グリッド */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {tag.completedTasks}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        完了タスク
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {tag.totalWorkTime}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        作業時間（分）
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {tag.sessionCount}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        セッション数
                      </div>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {tag.averageTaskCompletion}%
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        完了率
                      </div>
                    </div>
                  </div>

                  {/* 効率性指標 */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        効率性スコア:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {tag.sessionCount > 0
                          ? Math.round(
                              (tag.totalWorkTime / tag.sessionCount) * 10
                            ) / 10
                          : 0}{' '}
                        分/セッション
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* 全体サマリー */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            タグ別統計サマリー
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                使用中のタグ
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalWorkTime}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                総作業時間（分）
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalSessions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                総セッション数
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {data.length > 0
                  ? Math.round(
                      data.reduce(
                        (sum, tag) => sum + tag.averageTaskCompletion,
                        0
                      ) / data.length
                    )
                  : 0}
                %
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                平均完了率
              </div>
            </div>
          </div>
        </div>

        {/* 上位タグのハイライト */}
        {data.length > 0 && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              トップパフォーマンス
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 最も作業時間の多いタグ */}
              {(() => {
                const topWorkTimeTag = [...data].sort(
                  (a, b) => b.totalWorkTime - a.totalWorkTime
                )[0];
                return (
                  <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: topWorkTimeTag.tagColor }}
                      ></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        最多作業時間
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {topWorkTimeTag.tagName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {topWorkTimeTag.totalWorkTime}分
                    </div>
                  </div>
                );
              })()}

              {/* 最も完了率の高いタグ */}
              {(() => {
                const topCompletionTag = [...data].sort(
                  (a, b) => b.averageTaskCompletion - a.averageTaskCompletion
                )[0];
                return (
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: topCompletionTag.tagColor }}
                      ></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        最高完了率
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {topCompletionTag.tagName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {topCompletionTag.averageTaskCompletion}%
                    </div>
                  </div>
                );
              })()}

              {/* 最も効率的なタグ */}
              {(() => {
                const topEfficiencyTag = [...data]
                  .filter(tag => tag.sessionCount > 0)
                  .sort(
                    (a, b) =>
                      b.totalWorkTime / b.sessionCount -
                      a.totalWorkTime / a.sessionCount
                  )[0];
                return topEfficiencyTag ? (
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: topEfficiencyTag.tagColor }}
                      ></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        最高効率
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {topEfficiencyTag.tagName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(
                        (topEfficiencyTag.totalWorkTime /
                          topEfficiencyTag.sessionCount) *
                          10
                      ) / 10}{' '}
                      分/セッション
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
