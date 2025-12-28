import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface OverviewData {
  todaySessions: number;
  weekSessions: number;
  monthSessions: number;
  totalSessions: number;
  completedTasks: number;
}

/**
 * 統計概要コンポーネント（要件3.1-3.5対応）
 * 日別・週別・月別のセッション数と完了タスク数を表示
 */
export const StatisticsOverview: React.FC = () => {
  const [data, setData] = useState<OverviewData>({
    todaySessions: 0,
    weekSessions: 0,
    monthSessions: 0,
    totalSessions: 0,
    completedTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 今日の開始時刻
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.toISOString();

        // 今週の開始時刻（月曜日）
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        const weekStartStr = weekStart.toISOString();

        // 今月の開始時刻
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStartStr = monthStart.toISOString();

        // 各期間のセッション数を取得
        const [todaySessions, weekSessions, monthSessions, totalSessions] =
          await Promise.all([
            DatabaseService.getSessions({
              type: 'pomodoro',
              completed: true,
              startDate: todayStart,
            }),
            DatabaseService.getSessions({
              type: 'pomodoro',
              completed: true,
              startDate: weekStartStr,
            }),
            DatabaseService.getSessions({
              type: 'pomodoro',
              completed: true,
              startDate: monthStartStr,
            }),
            DatabaseService.getSessions({
              type: 'pomodoro',
              completed: true,
            }),
          ]);

        // 完了タスク数を取得
        const completedTasksCount =
          await DatabaseService.getCompletedTasksCount();

        setData({
          todaySessions: todaySessions.length,
          weekSessions: weekSessions.length,
          monthSessions: monthSessions.length,
          totalSessions: totalSessions.length,
          completedTasks: completedTasksCount,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '統計データの取得に失敗しました'
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          統計概要
        </h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          統計概要
        </h2>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: '今日のセッション',
      value: data.todaySessions,
      icon: '📅',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      label: '今週のセッション',
      value: data.weekSessions,
      icon: '📊',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      label: '今月のセッション',
      value: data.monthSessions,
      icon: '📈',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      label: '総セッション数',
      value: data.totalSessions,
      icon: '🎯',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      label: '完了タスク数',
      value: data.completedTasks,
      icon: '✅',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        統計概要
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${stat.bg} border border-gray-200 dark:border-gray-700`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl">{stat.icon}</div>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* 励ましメッセージ */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <div className="text-center">
          {data.todaySessions === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              今日はまだセッションを開始していません。さあ、始めましょう！
            </p>
          ) : data.todaySessions === 1 ? (
            <p className="text-gray-600 dark:text-gray-400">
              今日の最初のセッション、お疲れさまでした！この調子で続けましょう。
            </p>
          ) : data.todaySessions < 4 ? (
            <p className="text-gray-600 dark:text-gray-400">
              今日は{data.todaySessions}
              セッション完了しました。素晴らしいペースです！
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              今日は{data.todaySessions}セッションも完了！驚異的な集中力ですね。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
