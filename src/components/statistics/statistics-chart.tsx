import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface DailyStats {
  date: string;
  sessions: number;
  workTime: number;
  completedTasks: number;
}

/**
 * 統計チャートコンポーネント（要件3.4対応）
 * 過去7日間の日別統計をバーチャートで表示
 */
export const StatisticsChart: React.FC = () => {
  const [data, setData] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dailyStats = await DatabaseService.getDailySessionStats(7);
        setData(dailyStats);
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

  const maxSessions = Math.max(...data.map(d => d.sessions), 0);
  const maxWorkTime = Math.max(...data.map(d => d.workTime), 0);
  const maxHeight = 120; // チャートの最大高さ（px）

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  const getBarHeight = (value: number, maxValue: number) => {
    if (maxValue === 0) return 0;
    return (value / maxValue) * maxHeight;
  };

  const formatWorkTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}時間${remainingMinutes > 0 ? `${remainingMinutes}分` : ''}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          週間統計チャート
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
          週間統計チャート
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
        週間統計チャート
      </h3>

      {data.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-4xl mb-4">📊</div>
          <p>統計データがありません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* セッション数チャート */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              日別セッション数
            </h4>
            <div className="relative">
              <div className="flex items-end justify-between space-x-2 h-32 mb-2">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-blue-500 dark:bg-blue-400 rounded-t transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-300"
                      style={{
                        height: `${getBarHeight(item.sessions, maxSessions)}px`,
                      }}
                      title={`${formatDate(item.date)}: ${item.sessions}セッション`}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      {item.sessions}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                {data.map((item, index) => (
                  <div key={index} className="flex-1 text-center">
                    {formatDate(item.date)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 作業時間チャート */}
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
              日別作業時間
            </h4>
            <div className="relative">
              <div className="flex items-end justify-between space-x-2 h-32 mb-2">
                {data.map((item, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-green-500 dark:bg-green-400 rounded-t transition-all duration-300 hover:bg-green-600 dark:hover:bg-green-300"
                      style={{
                        height: `${getBarHeight(item.workTime, maxWorkTime)}px`,
                      }}
                      title={`${formatDate(item.date)}: ${formatWorkTime(item.workTime)}`}
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                      {item.workTime}分
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                {data.map((item, index) => (
                  <div key={index} className="flex-1 text-center">
                    {formatDate(item.date)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 統計サマリー */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {data.reduce((sum, item) => sum + item.sessions, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  総セッション数
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(
                    (data.reduce((sum, item) => sum + item.workTime, 0) / 60) *
                      10
                  ) / 10}
                  h
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  総作業時間
                </div>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {data.reduce((sum, item) => sum + item.completedTasks, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  完了タスク数
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {Math.round(
                    (data.reduce((sum, item) => sum + item.sessions, 0) /
                      Math.max(
                        data.filter(item => item.sessions > 0).length,
                        1
                      )) *
                      10
                  ) / 10}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  平均セッション/日
                </div>
              </div>
            </div>
          </div>

          {/* 進捗メッセージ */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {(() => {
                const totalSessions = data.reduce(
                  (sum, item) => sum + item.sessions,
                  0
                );
                const activeDays = data.filter(
                  item => item.sessions > 0
                ).length;

                if (totalSessions === 0) {
                  return '今週はまだセッションを開始していません。今日から始めてみましょう！';
                } else if (activeDays === 1) {
                  return '今週初めてのセッション、お疲れさまでした！継続していきましょう。';
                } else if (activeDays < 4) {
                  return `今週は${activeDays}日間活動しました。素晴らしいペースです！`;
                } else {
                  return `今週は${activeDays}日間も活動！驚異的な継続力ですね。`;
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
