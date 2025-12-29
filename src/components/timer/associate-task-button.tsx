import React from 'react';
import { LinkIcon } from '@heroicons/react/24/outline';
import { useTimerStore } from '../../stores/timer-store';

export const AssociateTaskButton: React.FC = () => {
  const { sessionType, currentTask, setShowTaskSelection } = useTimerStore();

  // ポモドーロセッション中で、タスクが関連付けられていない場合に表示
  if (sessionType !== 'pomodoro' || currentTask) {
    return null;
  }

  const handleAssociateTask = () => {
    console.log('タスク関連付けボタンがクリックされました');
    setShowTaskSelection(true);
  };

  return (
    <button
      onClick={handleAssociateTask}
      className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors border border-blue-200 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
      data-testid="associate-task-button"
    >
      <LinkIcon className="h-4 w-4" />
      <span>タスクを関連付ける</span>
    </button>
  );
};
