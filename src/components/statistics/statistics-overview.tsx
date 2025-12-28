import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface StatisticsData {
  totalSessions: number;
  pomodoroSessions: number;
  totalWorkTime: number;
  averageSessionLength: number;
  completedTasks: number;
}

interface TimeRange {
  label: string;
  value: 'today' | 'week' | 'month';
  startDate: string;
  endDate: string;
}

/**
 * 基本統計情報を表示するコンポーネント
 * 要件3.1-3.5: 日別・週別・月別のセッション数、完了タスク数の統計表示
 */
const StatisticsOverview: React.FC = () => {
  const [statistics, setStatistics] = useState<StatisticsData>({
    totalSessions: 0,
    pomodoroSessions: 0,
    totalWorkTime: 0,
    averageSessionLength: 0,
    completedTasks: 0,
  });
  const [selectedRange, setSelectedRange] =
    useState<TimeRange['value']>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 時間範囲の計算
  const getTimeRanges = (): TimeRange[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // 日曜日を週の開始とする
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return [
      {
        label: '今日',
        value: 'today',
        startDate: today.toISOString(),
        endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        label: '今週',
        value: 'week',
        startDate: weekStart.toISOString(),
        endDate: now.toISOString(),
      },
      {
        label: '今月',
        value: 'month',
        startDate: monthStart.toISOString(),
        endDate: now.toISOString(),
      },
    ];
  };

  // 統計データの取得
  const fetchStatistics = async (range: TimeRange) => {
    try {
      setLoading(true);
      setError(null);

      // セッション統計の取得
      const sessions = await DatabaseService.getSessions({
        startDate: range.startDate,
        endDate: range.endDate,
        completed: true,
      });

      // タスク統計の取得
      const dbService = DatabaseService.getInstance();
      const allTasks = await dbService.getTasks();
      const completedTasks = allTasks.filter(
        task =>
          task.status === 'completed' &&
          task.completed_at &&
          new Date(task.completed_at) >= new Date(range.startDate) &&
          new Date(task.completed_at) <= new Date(range.endDate)
      );

      // 統計データの計算
      const pomodoroSessions = sessions.filter(s => s.type === 'pomodoro');
      const totalWorkTime = pomodoroSessions.reduce(
        (sum, session) => sum + (session.actual_duration || 0),
        0
      );

      setStatistics({
        totalSessions: sessions.length,
        pomodoroSessions: pomodoroSessions.length,
        totalWorkTime,
        averageSessionLength:
          sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0) /
              sessions.length
            : 0,
        completedTasks: completedTasks.length,
      });
    } catch (err) {
      console.error('統計データ取得エラー:', err);
      setError('統計データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 選択された時間範囲が変更された時の処理
  useEffect(() => {
    const ranges = getTimeRanges();
    const currentRange = ranges.find(r => r.value === selectedRange);
    if (currentRange) {
      fetchStatistics(currentRange);
    }
  }, [selectedRange]);

  // 時間のフォーマット（分 → 時間:分）
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p>{error}</p>
          <button
            onClick={() => {
              const ranges = getTimeRanges();
              const currentRange = ranges.find(r => r.value === selectedRange);
              if (currentRange) {
                fetchStatistics(currentRange);
              }
            }}
            className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* ヘッダーと時間範囲選択 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-0">
          統計概要
        </h2>
        <div className="flex space-x-2">
          {getTimeRanges().map(range => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedRange === range.value
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 総セッション数 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
                総セッション数
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {statistics.totalSessions}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">📊</span>
            </div>
          </div>
        </div>

        {/* ポモドーロセッション数 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-300">
                作業セッション
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {statistics.pomodoroSessions}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">🍅</span>
            </div>
          </div>
        </div>

        {/* 総作業時間 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-300">
                総作業時間
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatTime(statistics.totalWorkTime)}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">⏰</span>
            </div>
          </div>
        </div>

        {/* 完了タスク数 */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-300">
                完了タスク
              </p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {statistics.completedTasks}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* 追加統計情報 */}
      {statistics.totalSessions > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                平均セッション時間
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatTime(statistics.averageSessionLength)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                セッション完了率
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {statistics.totalSessions > 0
                  ? Math.round(
                      (statistics.pomodoroSessions / statistics.totalSessions) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsOverview;
