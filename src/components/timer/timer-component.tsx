import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useTimerStore } from '../../stores/timer-store';
import { useAuthStore } from '../../stores/auth-store';
import { useBreakpoints } from '../../hooks/use-responsive';
import { TimerDisplay } from './timer-display';
import { TimerControls } from './timer-controls';
import { SessionInfo } from './session-info';
import { BreakSuggestion } from './break-suggestion';
import { SessionCompleteNotification } from './session-complete-notification';
import { TaskSelectionDialog } from './task-selection-dialog';
import { TaskCompletionDialog } from './task-completion-dialog';
import { CurrentTaskDisplay } from './current-task-display';
import { ModeSelectionDialog } from './mode-selection-dialog';
import { AssociateTaskButton } from './associate-task-button';
import { SettingsModal } from '../settings/settings-modal';
import {
  ResponsiveContainer,
  ResponsiveCard,
} from '../layout/responsive-layout';

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
    showModeSelection,
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
    setShowModeSelection,
  } = useTimerStore();

  const { user } = useAuthStore();
  const { isMobile } = useBreakpoints();
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
    <ResponsiveContainer>
      <ResponsiveCard
        className={`text-center relative ${isMobile ? 'p-6' : 'p-8'}`}
        padding={isMobile ? 'md' : 'lg'}
        data-testid="timer-component"
      >
        {/* 設定ボタン */}
        <motion.button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
          title="設定"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          data-testid="settings-button"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </motion.button>

        {/* タイマー表示 */}
        <div
          className={`${isMobile ? 'mb-6' : 'mb-8'}`}
          data-testid="timer-animation"
        >
          <TimerDisplay
            currentTime={currentTime}
            sessionType={sessionType}
            isRunning={isRunning}
          />
        </div>

        {/* 現在のタスク表示 */}
        {sessionType === 'pomodoro' && (
          <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
            <CurrentTaskDisplay />
          </div>
        )}

        {/* タスク関連付けボタン（スタンドアロンモード時） */}
        <div className="flex justify-center mb-4">
          <AssociateTaskButton />
        </div>

        {/* タイマー制御ボタン */}
        <div className={`${isMobile ? 'mb-4' : 'mb-6'}`}>
          <TimerControls
            isRunning={isRunning}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
          />
        </div>

        {/* セッション情報 */}
        <SessionInfo
          completedSessions={completedSessions}
          sessionType={sessionType}
        />
      </ResponsiveCard>

      {/* モード選択ダイアログ */}
      <ModeSelectionDialog
        isOpen={showModeSelection}
        onClose={() => setShowModeSelection(false)}
      />

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
    </ResponsiveContainer>
  );
};
