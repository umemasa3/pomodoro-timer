import React from 'react';
import { useTimerStore } from '../../stores/timer-store';

/**
 * セッション中の現在のタスク表示コンポーネント
 * 要件10.2: タスクが選択された場合、セッション中にタスク名を表示する
 */
export const CurrentTaskDisplay: React.FC = () => {
  const { currentTask, sessionType, isRunning } = useTimerStore();

  // ポモドーロセッション中でタスクが選択されている場合のみ表示
  if (sessionType !== 'pomodoro' || !currentTask) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-blue-900 mb-1">
            現在のタスク
          </h3>
          <p className="text-blue-800 font-semibold">{currentTask.title}</p>
          {currentTask.description && (
            <p className="text-blue-600 text-sm mt-1">
              {currentTask.description}
            </p>
          )}
        </div>

        <div className="ml-4 text-right">
          <div className="text-sm text-blue-600">進捗</div>
          <div className="text-lg font-semibold text-blue-900">
            {currentTask.completed_pomodoros}/{currentTask.estimated_pomodoros}
          </div>
          <div className="text-xs text-blue-500">ポモドーロ</div>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-blue-600 mb-1">
          <span>進捗</span>
          <span>
            {Math.round(
              (currentTask.completed_pomodoros /
                currentTask.estimated_pomodoros) *
                100
            )}
            %
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min((currentTask.completed_pomodoros / currentTask.estimated_pomodoros) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* セッション状態インジケーター */}
      {isRunning && (
        <div className="mt-2 flex items-center text-sm text-blue-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          セッション実行中
        </div>
      )}
    </div>
  );
};
