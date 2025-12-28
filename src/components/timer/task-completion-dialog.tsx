import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../../stores/timer-store';

interface TaskCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * セッション完了時のタスク完了確認ダイアログ
 * 要件10.1: セッション終了時にタスクの完了状態確認ダイアログを表示
 */
export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [autoSelectCountdown, setAutoSelectCountdown] = useState(30);
  const { currentTask, completeTaskInSession } = useTimerStore();

  // 30秒後の自動選択カウントダウン
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleComplete = async (
      status: 'completed' | 'continued' | 'paused'
    ) => {
      try {
        await completeTaskInSession(status);
        onClose();
      } catch (error) {
        console.error('タスク完了処理エラー:', error);
      }
    };

    // カウントダウンを開始
    let countdown = 30;

    const interval = setInterval(() => {
      countdown -= 1;
      setAutoSelectCountdown(countdown);

      if (countdown <= 0) {
        // 30秒経過したら自動的に「継続」を選択
        handleComplete('continued');
        clearInterval(interval);
      }
    }, 1000);

    // 初期値を設定（非同期で）
    setTimeout(() => setAutoSelectCountdown(30), 0);

    return () => clearInterval(interval);
  }, [isOpen, completeTaskInSession, onClose]);

  const handleComplete = async (
    status: 'completed' | 'continued' | 'paused'
  ) => {
    try {
      await completeTaskInSession(status);
      onClose();
    } catch (error) {
      console.error('タスク完了処理エラー:', error);
    }
  };

  if (!isOpen || !currentTask) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          タスクの状態を確認してください
        </h2>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-1">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-gray-600 text-sm">{currentTask.description}</p>
          )}
          <div className="mt-2 text-sm text-gray-500">
            進捗: {currentTask.completed_pomodoros + 1}/
            {currentTask.estimated_pomodoros} ポモドーロ
          </div>
        </div>

        <p className="text-gray-600 mb-6">
          このポモドーロセッションでタスクはどのような状態になりましたか？
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleComplete('completed')}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-left"
          >
            <div className="font-medium">完了</div>
            <div className="text-sm text-green-100">タスクが完了しました</div>
          </button>

          <button
            onClick={() => handleComplete('continued')}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left"
          >
            <div className="font-medium">継続</div>
            <div className="text-sm text-blue-100">
              タスクを継続して次のセッションでも作業します
            </div>
          </button>

          <button
            onClick={() => handleComplete('paused')}
            className="w-full bg-yellow-600 text-white px-4 py-3 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 text-left"
          >
            <div className="font-medium">一時停止</div>
            <div className="text-sm text-yellow-100">
              タスクを一時停止して後で再開します
            </div>
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          {autoSelectCountdown > 0 ? (
            <>{autoSelectCountdown}秒後に自動的に「継続」が選択されます</>
          ) : (
            '自動選択中...'
          )}
        </div>
      </div>
    </div>
  );
};
