import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface ChartData {
  date: string;
  sessions: number;
  workTime: number;
}

/**
 * 統計チャートを表示するコンポーネント
 * 要件3.2: 過去7日間のセッション数表示
 */
const StatisticsChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チャートデータの取得
  const fetchChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 過去7日間のデータを取得
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const sessions = await DatabaseService.getSessions({
        startDate: sevenDaysAgo.toISOString(),
        completed: true,
      });

      // 日付別にデータを集計
      const dataByDate: Record<string, { sessions: number; workTime: number }> =
        {};

      // 過去7日間の日付を初期化
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dataByDate[dateKey] = { sessions: 0, workTime: 0 };
      }

      // セッションデータを日付別に集計
      sessions.forEach(session => {
        const sessionDate = new Date(
          session.completed_at || session.started_at
        );
        const dateKey = sessionDate.toISOString().split('T')[0];

        if (dataByDate[dateKey]) {
          dataByDate[dateKey].sessions += 1;
          if (session.type === 'pomodoro') {
            dataByDate[dateKey].workTime += session.actual_duration || 0;
          }
        }
      });

      // チャートデータに変換
      const chartDataArray: ChartData[] = Object.entries(dataByDate).map(
        ([date, data]) => ({
          date,
          sessions: data.sessions,
          workTime: data.workTime,
        })
      );

      setChartData(chartDataArray);
    } catch (err) {
      console.error('チャートデータ取得エラー:', err);
      setError('チャートデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, []);

  // 日付のフォーマット
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今日';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // 時間のフォーマット
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins}m`;
    }
    return `${mins}m`;
  };

  // 最大値を取得（チャートの高さ調整用）
  const maxSessions = Math.max(...chartData.map(d => d.sessions), 1);
  const maxWorkTime = Math.max(...chartData.map(d => d.workTime), 1);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            onClick={fetchChartData}
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
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        過去7日間の活動
      </h2>

      {/* セッション数チャート */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
          セッション数
        </h3>
        <div className="flex items-end justify-between h-32 space-x-2">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col justify-end h-24 mb-2">
                <div
                  className="bg-blue-500 dark:bg-blue-400 rounded-t transition-all duration-300 hover:bg-blue-600 dark:hover:bg-blue-300"
                  style={{
                    height: `${(data.sessions / maxSessions) * 100}%`,
                    minHeight: data.sessions > 0 ? '4px' : '0px',
                  }}
                  title={`${data.sessions}セッション`}
                ></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                <div className="font-medium">{data.sessions}</div>
                <div>{formatDate(data.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 作業時間チャート */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
          作業時間
        </h3>
        <div className="flex items-end justify-between h-32 space-x-2">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col justify-end h-24 mb-2">
                <div
                  className="bg-green-500 dark:bg-green-400 rounded-t transition-all duration-300 hover:bg-green-600 dark:hover:bg-green-300"
                  style={{
                    height: `${(data.workTime / maxWorkTime) * 100}%`,
                    minHeight: data.workTime > 0 ? '4px' : '0px',
                  }}
                  title={`${formatTime(data.workTime)}`}
                ></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                <div className="font-medium">{formatTime(data.workTime)}</div>
                <div>{formatDate(data.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 更新ボタン */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchChartData}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          データを更新
        </button>
      </div>
    </div>
  );
};

export default StatisticsChart;
