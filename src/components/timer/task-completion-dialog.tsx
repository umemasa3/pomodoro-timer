import React, { useState, useEffect, useCallback } from 'react';
import { useTimerStore } from '../../stores/timer-store';

interface TaskCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * セッション完了時のタスク完了確認ダイアログ
 * 要件10.1: セッション終了時にタスクの完了状態確認ダイアログを表示
 *
 * 機能:
 * - 「完了」「継続」「一時停止」の選択肢を提供
 * - 30秒後の自動選択機能（デフォルト: 継続）
 * - セッション履歴への記録
 * - エラーハンドリング
 */
export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [autoSelectCountdown, setAutoSelectCountdown] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentTask, completeTaskInSession } = useTimerStore();

  // タスク完了処理のハンドラー（エラーハンドリング強化）
  const handleComplete = useCallback(
    async (status: 'completed' | 'continued' | 'paused') => {
      if (isProcessing) return; // 重複処理を防ぐ

      setIsProcessing(true);
      setError(null);

      try {
        await completeTaskInSession(status);
        onClose();
      } catch (error) {
        console.error('タスク完了処理エラー:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'タスクの完了処理中にエラーが発生しました。もう一度お試しください。'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, completeTaskInSession, onClose]
  );

  // 30秒後の自動選択カウントダウン（改善版）
  useEffect(() => {
    if (!isOpen || isProcessing) {
      setAutoSelectCountdown(30);
      return;
    }

    let countdown = 30;
    setAutoSelectCountdown(countdown);

    const interval = setInterval(() => {
      countdown -= 1;
      setAutoSelectCountdown(countdown);

      if (countdown <= 0) {
        // 30秒経過したら自動的に「継続」を選択
        handleComplete('continued');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isProcessing, handleComplete]);

  // キーボードショートカット対応
  useEffect(() => {
    if (!isOpen || isProcessing) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // モーダル内でのみ動作するように制限
      if (
        event.target !== document.body &&
        !(event.target as Element)?.closest('.task-completion-dialog')
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          handleComplete('completed');
          break;
        case 'enter':
          event.preventDefault();
          handleComplete('continued');
          break;
        case 'p':
          event.preventDefault();
          handleComplete('paused');
          break;
        case 'escape':
          event.preventDefault();
          // Escapeキーでは何もしない（自動選択を待つ）
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isProcessing, handleComplete]);

  if (!isOpen || !currentTask) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="task-completion-dialog"
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl task-completion-dialog">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          タスクの状態を確認してください
        </h2>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-1">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-gray-600 text-sm mb-2">
              {currentTask.description}
            </p>
          )}
          <div className="text-sm text-gray-500">
            進捗: {currentTask.completed_pomodoros + 1}/
            {currentTask.estimated_pomodoros} ポモドーロ
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          このポモドーロセッションでタスクはどのような状態になりましたか？
        </p>

        {/* エラーメッセージ表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleComplete('completed')}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="task-completed-button"
          >
            <div className="font-medium">
              {isProcessing ? '処理中...' : '完了'}
            </div>
            <div className="text-sm text-green-100">タスクが完了しました</div>
          </button>

          <button
            onClick={() => handleComplete('continued')}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="task-continued-button"
          >
            <div className="font-medium">
              {isProcessing ? '処理中...' : '継続'}
            </div>
            <div className="text-sm text-blue-100">
              タスクを継続して次のセッションでも作業します
            </div>
          </button>

          <button
            onClick={() => handleComplete('paused')}
            disabled={isProcessing}
            className="w-full bg-yellow-600 text-white px-4 py-3 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="task-paused-button"
          >
            <div className="font-medium">
              {isProcessing ? '処理中...' : '一時停止'}
            </div>
            <div className="text-sm text-yellow-100">
              タスクを一時停止して後で再開します
            </div>
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          {isProcessing ? (
            '処理中です...'
          ) : autoSelectCountdown > 0 ? (
            <>{autoSelectCountdown}秒後に自動的に「継続」が選択されます</>
          ) : (
            '自動選択中...'
          )}
        </div>

        {/* キーボードショートカットのヒント */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            キーボード: C (完了) / Enter (継続) / P (一時停止)
          </p>
        </div>
      </div>
    </div>
  );
};
