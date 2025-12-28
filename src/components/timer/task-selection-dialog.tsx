import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../../stores/timer-store';
import { DatabaseService } from '../../services/database-service';
import type { Task } from '../../types';

interface TaskSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * セッション開始時のタスク選択ダイアログ
 * 要件10.1: ユーザーがポモドーロセッションを開始する際にタスクの選択を促す
 */
export const TaskSelectionDialog: React.FC<TaskSelectionDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const { setCurrentTask, startTimer } = useTimerStore();

  // タスク一覧を取得
  useEffect(() => {
    if (isOpen) {
      loadTasks();
    }
  }, [isOpen]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const databaseService = DatabaseService.getInstance();
      // 未完了のタスクのみを取得
      const allTasks = await databaseService.getTasks({
        limit: 20,
      });

      // 完了していないタスクをフィルタリング
      const incompleteTasks = allTasks.filter(
        task => task.status !== 'completed'
      );
      setTasks(incompleteTasks);

      // デフォルトで最初のタスクを選択
      if (incompleteTasks.length > 0) {
        setSelectedTaskId(incompleteTasks[0].id);
      }
    } catch (error) {
      console.error('タスク取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWithTask = async () => {
    const selectedTask = tasks.find(task => task.id === selectedTaskId);
    if (selectedTask) {
      setCurrentTask(selectedTask);
      onClose();
      await startTimer();
    }
  };

  const handleStartWithoutTask = async () => {
    setCurrentTask(null);
    onClose();
    await startTimer();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">
          タスクを選択してください
        </h2>

        <p className="text-gray-600 mb-4">
          このポモドーロセッションで取り組むタスクを選択してください。
        </p>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {tasks.length > 0 ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タスク一覧
                </label>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {tasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.completed_pomodoros}/
                      {task.estimated_pomodoros} ポモドーロ)
                    </option>
                  ))}
                </select>

                {selectedTaskId && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    {tasks.find(t => t.id === selectedTaskId)?.description ||
                      '説明なし'}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 text-sm">
                  利用可能なタスクがありません。先にタスクを作成するか、タスクなしでセッションを開始してください。
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {tasks.length > 0 && selectedTaskId && (
                <button
                  onClick={handleStartWithTask}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  選択したタスクで開始
                </button>
              )}

              <button
                onClick={handleStartWithoutTask}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                タスクなしで開始
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
