import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useTimerStore } from '../../stores/timer-store';
import { useAuthStore } from '../../stores/auth-store';
import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { SessionInfo } from './session-info';
import { BreakSuggestion } from './break-suggestion';
import { SessionCompleteNotification } from './session-complete-notification';
import { TaskSelectionDialog } from './task-selection-dialog';
import { TaskCompletionDialog } from './task-completion-dialog';
import { CurrentTaskDisplay } from './current-task-display';
import { SettingsModal } from '../settings/settings-modal';

export const TimerComponent: React.FC = () => {
  const {
    currentTime,
    isRunning,
    sessionType,
    completedSessions,
    showBreakSuggestion,
    suggestedBreakType,
    showCompletionNotification,
    showTaskSelection,
    showTaskCompletionDialog,
    startTimer,
    pauseTimer,
    resetTimer,
    initializeTimer,
    switchToBreak,
    switchToPomodoro,
    setShowBreakSuggestion,
    setShowCompletionNotification,
    setShowTaskSelection,
    setShowTaskCompletionDialog,
  } = useTimerStore();

  const { user } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // コンポーネントマウント時にタイマーを初期化
  useEffect(() => {
    initializeTimer();
  }, [initializeTimer]);

  // ユーザー設定が変更された時にタイマーを再初期化
  useEffect(() => {
    if (user && !isRunning) {
      initializeTimer();
    }
  }, [
    user?.settings.pomodoro_minutes,
    user?.settings.short_break_minutes,
    user?.settings.long_break_minutes,
    user,
    initializeTimer,
    isRunning,
  ]);

  // コンポーネントアンマウント時にタイマーをクリーンアップ
  useEffect(() => {
    return () => {
      if (isRunning) {
        pauseTimer();
      }
    };
  }, [isRunning, pauseTimer]);

  // 休憩提案の処理
  const handleAcceptBreak = () => {
    switchToBreak(suggestedBreakType);
  };

  const handleDeclineBreak = () => {
    setShowBreakSuggestion(false);
  };

  const handleStartPomodoro = () => {
    switchToPomodoro();
  };

  const handleCloseNotification = () => {
    setShowCompletionNotification(false);
  };

  return (
    <>
      <motion.div
        className="card p-8 text-center relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 設定ボタン */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="設定"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>

        {/* タイマー表示 */}
        <div className="mb-8">
          <TimerDisplay
            currentTime={currentTime}
            sessionType={sessionType}
            isRunning={isRunning}
          />
        </div>

        {/* 現在のタスク表示 */}
        {sessionType === 'pomodoro' && (
          <div className="mb-6">
            <CurrentTaskDisplay />
          </div>
        )}

        {/* タイマー制御ボタン */}
        <TimerControls
          isRunning={isRunning}
          onStart={startTimer}
          onPause={pauseTimer}
          onReset={resetTimer}
        />

        {/* セッション情報 */}
        <SessionInfo
          completedSessions={completedSessions}
          sessionType={sessionType}
        />
      </motion.div>

      {/* タスク選択ダイアログ */}
      <TaskSelectionDialog
        isOpen={showTaskSelection}
        onClose={() => setShowTaskSelection(false)}
      />

      {/* タスク完了確認ダイアログ */}
      <TaskCompletionDialog
        isOpen={showTaskCompletionDialog}
        onClose={() => setShowTaskCompletionDialog(false)}
      />

      {/* 休憩提案モーダル */}
      <BreakSuggestion
        isVisible={showBreakSuggestion}
        breakType={suggestedBreakType}
        onAccept={handleAcceptBreak}
        onDecline={handleDeclineBreak}
        onStartPomodoro={handleStartPomodoro}
      />

      {/* セッション完了通知 */}
      <SessionCompleteNotification
        isVisible={showCompletionNotification}
        sessionType={sessionType}
        onClose={handleCloseNotification}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
