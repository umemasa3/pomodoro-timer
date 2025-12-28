import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface WorkStreakData {
  currentStreak: number;
  longestStreak: number;
  streakHistory: Array<{ startDate: string; endDate: string; days: number }>;
}

/**
 * 連続作業日数コンポーネント（要件3.9対応）
 * 現在の連続作業日数、最長記録、履歴を表示
 */
export const WorkStreak: React.FC = () => {
  const [data, setData] = useState<WorkStreakData>({
    currentStreak: 0,
    longestStreak: 0,
    streakHistory: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const streakData = await DatabaseService.getWorkStreakData();
        setData(streakData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '連続作業日数データの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    if (startDate === endDate) {
      return formatDate(startDate);
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStreakLevel = (days: number) => {
    if (days >= 30)
      return {
        level: 'legendary',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/20',
      };
    if (days >= 14)
      return {
        level: 'excellent',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/20',
      };
    if (days >= 7)
      return {
        level: 'great',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-100 dark:bg-orange-900/20',
      };
    if (days >= 3)
      return {
        level: 'good',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/20',
      };
    return {
      level: 'start',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    };
  };

  const getStreakMessage = (days: number) => {
    if (days === 0) return '今日から始めましょう！';
    if (days === 1) return '素晴らしいスタートです！';
    if (days < 7) return '良いペースです！';
    if (days < 14) return '素晴らしい継続力です！';
    if (days < 30) return '驚異的な継続力です！';
    return '伝説的な継続力です！';
  };

  const getStreakIcon = (days: number) => {
    if (days >= 30) return '👑';
    if (days >= 14) return '🔥';
    if (days >= 7) return '⭐';
    if (days >= 3) return '💪';
    if (days >= 1) return '🌱';
    return '🎯';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          連続作業日数
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
          連続作業日数
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const currentLevel = getStreakLevel(data.currentStreak);
  const longestLevel = getStreakLevel(data.longestStreak);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        連続作業日数
      </h3>

      <div className="space-y-6">
        {/* 現在の連続記録 */}
        <div
          className={`p-6 rounded-lg ${currentLevel.bg} border border-gray-200 dark:border-gray-700`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">
              {getStreakIcon(data.currentStreak)}
            </div>
            <div className={`text-4xl font-bold mb-2 ${currentLevel.color}`}>
              {data.currentStreak}
            </div>
            <div className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              現在の連続作業日数
            </div>
            <div className={`text-sm ${currentLevel.color}`}>
              {getStreakMessage(data.currentStreak)}
            </div>
          </div>
        </div>

        {/* 最長記録 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-lg ${longestLevel.bg} border border-gray-200 dark:border-gray-700`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className={`text-2xl font-bold mb-1 ${longestLevel.color}`}>
                {data.longestStreak}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                最長連続記録
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-2xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                {data.streakHistory.length}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                総ストリーク数
              </div>
            </div>
          </div>
        </div>

        {/* 進捗バー（次のマイルストーンまで） */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>次のマイルストーンまで</span>
            <span>
              {data.currentStreak >= 30
                ? '達成済み！'
                : data.currentStreak >= 14
                  ? `${30 - data.currentStreak}日で伝説達成`
                  : data.currentStreak >= 7
                    ? `${14 - data.currentStreak}日で素晴らしい達成`
                    : data.currentStreak >= 3
                      ? `${7 - data.currentStreak}日で1週間達成`
                      : `${3 - data.currentStreak}日で継続習慣達成`}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            {data.currentStreak < 30 && (
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (data.currentStreak /
                      (data.currentStreak >= 14
                        ? 30
                        : data.currentStreak >= 7
                          ? 14
                          : data.currentStreak >= 3
                            ? 7
                            : 3)) *
                      100,
                    100
                  )}%`,
                }}
              ></div>
            )}
          </div>
        </div>

        {/* ストリーク履歴 */}
        {data.streakHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              ストリーク履歴（最新5件）
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.streakHistory
                .sort(
                  (a, b) =>
                    new Date(b.endDate).getTime() -
                    new Date(a.endDate).getTime()
                )
                .slice(0, 5)
                .map((streak, index) => {
                  const level = getStreakLevel(streak.days);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">
                          {getStreakIcon(streak.days)}
                        </div>
                        <div>
                          <div className={`font-medium ${level.color}`}>
                            {streak.days}日間
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDateRange(streak.startDate, streak.endDate)}
                          </div>
                        </div>
                      </div>
                      {streak.days === data.longestStreak && (
                        <div className="text-yellow-500 text-sm font-medium">
                          最長記録
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 励ましメッセージ */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {data.currentStreak === 0
              ? '今日から新しいストリークを始めましょう！継続は力なりです。'
              : data.currentStreak === data.longestStreak &&
                  data.currentStreak > 0
                ? '現在、自己最高記録を更新中です！この調子で頑張りましょう！'
                : '素晴らしい継続力です！毎日の積み重ねが大きな成果につながります。'}
          </div>
        </div>
      </div>
    </div>
  );
};
