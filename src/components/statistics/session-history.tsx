import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';
import type { Session } from '../../types';

/**
 * セッション履歴コンポーネント（要件3.4対応）
 * 過去7日間のセッション履歴を表示
 */
export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError(null);

        // 過去7日間のセッションを取得
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentSessions = await DatabaseService.getSessions({
          completed: true,
          startDate: sevenDaysAgo.toISOString(),
          limit: 20,
        });

        setSessions(recentSessions);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'セッション履歴の取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `今日 ${date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffDays === 1) {
      return `昨日 ${date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays}日前 ${date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds > 0 ? `${remainingSeconds}秒` : ''}`;
  };

  const getSessionTypeLabel = (type: Session['type']) => {
    switch (type) {
      case 'pomodoro':
        return 'ポモドーロ';
      case 'short_break':
        return '短い休憩';
      case 'long_break':
        return '長い休憩';
      default:
        return type;
    }
  };

  const getSessionTypeIcon = (type: Session['type']) => {
    switch (type) {
      case 'pomodoro':
        return '🍅';
      case 'short_break':
        return '☕';
      case 'long_break':
        return '🛋️';
      default:
        return '⏱️';
    }
  };

  const getSessionTypeColor = (type: Session['type']) => {
    switch (type) {
      case 'pomodoro':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'short_break':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      case 'long_break':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getCompletionStatusIcon = (completed: boolean) => {
    return completed ? '✅' : '⏸️';
  };

  const getCompletionStatusLabel = (completed: boolean) => {
    return completed ? '完了' : '中断';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          セッション履歴
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
          セッション履歴
        </h3>
        <div className="text-center text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          セッション履歴
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          過去7日間
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <div className="text-4xl mb-4">📝</div>
          <p>まだセッション履歴がありません</p>
          <p className="text-sm mt-2">
            最初のポモドーロセッションを開始してみましょう！
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map(session => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              data-testid="session-history-item"
            >
              <div className="flex items-center space-x-3">
                {/* セッションタイプアイコン */}
                <div
                  className={`p-2 rounded-full ${getSessionTypeColor(session.type)}`}
                >
                  <span className="text-lg">
                    {getSessionTypeIcon(session.type)}
                  </span>
                </div>

                {/* セッション情報 */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getSessionTypeLabel(session.type)}
                    </span>
                    <span className="text-sm">
                      {getCompletionStatusIcon(session.completed)}
                    </span>
                    {/* モード表示 */}
                    {session.mode === 'standalone' && (
                      <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                        スタンドアロン
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {/* セッション名またはタスク名を表示 */}
                    <div data-testid="session-task-name">
                      {session.mode === 'standalone'
                        ? session.session_name || '集中時間'
                        : session.task_id
                          ? 'タスク関連セッション'
                          : '一般作業'}
                    </div>
                    <div className="text-xs">
                      {formatDate(session.completed_at || session.started_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* セッション詳細 */}
              <div className="text-right">
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(session.actual_duration || 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {getCompletionStatusLabel(session.completed)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 統計サマリー */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {sessions.filter(s => s.type === 'pomodoro').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ポモドーロ
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {sessions.filter(s => s.type === 'short_break').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                短い休憩
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {sessions.filter(s => s.type === 'long_break').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                長い休憩
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
