import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { useTimerStore } from '../../stores/timer-store';

export const AssociateTaskButton: React.FC = () => {
  const { mode, isRunning, currentTask, setShowTaskSelection } =
    useTimerStore();

  // スタンドアロンモードで実行中、かつタスクが関連付けられていない場合のみ表示
  if (mode !== 'standalone' || !isRunning || currentTask) {
    return null;
  }

  const handleAssociateTask = () => {
    setShowTaskSelection(true);
  };

  return (
    <button
      onClick={handleAssociateTask}
      className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      data-testid="associate-task-button"
    >
      <LinkIcon className="h-4 w-4" />
      <span>タスクを関連付ける</span>
    </button>
  );
};
