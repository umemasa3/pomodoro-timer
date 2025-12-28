import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';
import type { Session, Task } from '../../types';

interface SessionWithTask extends Session {
  task?: Task;
}

/**
 * セッション履歴を表示するコンポーネント
 * 要件3.4: セッション履歴の表示
 */
const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<SessionWithTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pomodoro' | 'break'>('all');

  // セッション履歴の取得
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // 過去7日間のセッションを取得
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const sessionsData = await DatabaseService.getSessions({
        startDate: sevenDaysAgo.toISOString(),
        completed: true,
        limit: 50,
      });

      // 各セッションに関連するタスク情報を取得
      const sessionsWithTasks: SessionWithTask[] = [];

      for (const session of sessionsData) {
        const sessionWithTask: SessionWithTask = { ...session };

        if (session.task_id) {
          try {
            const task = await DatabaseService.getTaskById(session.task_id);
            if (task) {
              sessionWithTask.task = task;
            }
          } catch (err) {
            console.warn(`タスク取得エラー (ID: ${session.task_id}):`, err);
          }
        }

        sessionsWithTasks.push(sessionWithTask);
      }

      setSessions(sessionsWithTasks);
    } catch (err) {
      console.error('セッション履歴取得エラー:', err);
      setError('セッション履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // フィルタリングされたセッション
  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    if (filter === 'pomodoro') return session.type === 'pomodoro';
    if (filter === 'break')
      return session.type === 'short_break' || session.type === 'long_break';
    return true;
  });

  // セッションタイプのアイコンと色
  const getSessionTypeInfo = (type: Session['type']) => {
    switch (type) {
      case 'pomodoro':
        return {
          icon: '🍅',
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900',
        };
      case 'short_break':
        return {
          icon: '☕',
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900',
        };
      case 'long_break':
        return {
          icon: '🛋️',
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-900',
        };
      default:
        return {
          icon: '⏱️',
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-900',
        };
    }
  };

  // セッションタイプの日本語名
  const getSessionTypeName = (type: Session['type']) => {
    switch (type) {
      case 'pomodoro':
        return 'ポモドーロ';
      case 'short_break':
        return '短い休憩';
      case 'long_break':
        return '長い休憩';
      default:
        return 'セッション';
    }
  };

  // 時間のフォーマット
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  // 日時のフォーマット
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return `今日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `昨日 ${date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
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
            onClick={fetchSessions}
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
      {/* ヘッダーとフィルター */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-0">
          セッション履歴
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('pomodoro')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'pomodoro'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            作業
          </button>
          <button
            onClick={() => setFilter('break')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'break'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            休憩
          </button>
        </div>
      </div>

      {/* セッション一覧 */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all'
              ? 'セッション履歴がありません'
              : `${filter === 'pomodoro' ? '作業' : '休憩'}セッションがありません`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map(session => {
            const typeInfo = getSessionTypeInfo(session.type);
            return (
              <div
                key={session.id}
                className={`${typeInfo.bg} rounded-lg p-4 border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className={`font-medium ${typeInfo.color}`}>
                        {getSessionTypeName(session.type)}
                      </h3>
                      {session.task && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          タスク: {session.task.title}
                        </p>
                      )}
                      {session.task_completion_status &&
                        session.type === 'pomodoro' && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {session.task_completion_status === 'completed' &&
                              '✅ 完了'}
                            {session.task_completion_status === 'continued' &&
                              '🔄 継続'}
                            {session.task_completion_status === 'paused' &&
                              '⏸️ 一時停止'}
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatTime(session.actual_duration)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDateTime(
                        session.completed_at || session.started_at
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 更新ボタン */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          履歴を更新
        </button>
      </div>
    </div>
  );
};

export default SessionHistory;
