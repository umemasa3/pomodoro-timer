import React from 'react';
import { motion } from 'framer-motion';
import { useTimerStore } from '../../stores/timer-store';

interface TimerDisplayProps {
  currentTime: number;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
  isRunning: boolean;
  totalTime?: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  currentTime,
  sessionType,
  isRunning,
  totalTime = 1500, // デフォルト25分
}) => {
  const { mode, currentTask, getDefaultSessionName } = useTimerStore();

  // 時間を分:秒形式にフォーマット
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // セッションタイプに応じた表示テキスト
  const getSessionLabel = (): string => {
    if (mode === 'task-based' && currentTask) {
      return currentTask.title;
    }
    return getDefaultSessionName(sessionType);
  };

  // セッションタイプに応じたスタイルクラス
  const getCircleClass = (): string => {
    const baseClass = 'timer-circle';
    if (sessionType === 'short_break' || sessionType === 'long_break') {
      return `${baseClass} break-mode`;
    }
    return baseClass;
  };

  // 進捗率を計算（0-100%）
  const progressPercentage =
    totalTime > 0 ? ((totalTime - currentTime) / totalTime) * 100 : 0;

  // 進捗リングのスタイル
  const progressRingStyle = {
    background: `conic-gradient(from 0deg, rgba(255, 255, 255, 0.3) 0deg, rgba(255, 255, 255, 0.3) ${progressPercentage * 3.6}deg, transparent ${progressPercentage * 3.6}deg)`,
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* グロー効果の背景 */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-20 blur-2xl"
        style={{
          background:
            sessionType === 'pomodoro'
              ? 'radial-gradient(circle, #ef4444 0%, transparent 70%)'
              : 'radial-gradient(circle, #22c55e 0%, transparent 70%)',
        }}
        animate={{
          scale: isRunning ? [1, 1.1, 1] : 1,
          opacity: isRunning ? [0.2, 0.4, 0.2] : 0.2,
        }}
        transition={{
          duration: 3,
          repeat: isRunning ? Infinity : 0,
          ease: 'easeInOut',
        }}
      />

      {/* メインタイマーサークル */}
      <motion.div
        className={getCircleClass()}
        animate={{
          scale: isRunning ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: isRunning ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* 進捗リング */}
        <div
          className="timer-progress"
          style={progressRingStyle}
          data-testid="timer-progress"
        />

        {/* タイマー内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
          {/* 時間表示 */}
          <motion.div
            className="text-7xl font-bold mb-3 font-display tracking-tight"
            animate={{
              opacity: isRunning ? [1, 0.9, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: isRunning ? Infinity : 0,
              ease: 'easeInOut',
            }}
            data-testid="timer-display"
          >
            {formatTime(currentTime)}
          </motion.div>

          {/* セッションラベル */}
          <motion.div
            className="text-xl font-medium mb-2 opacity-90 text-center px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.5 }}
            data-testid="session-type"
          >
            {getSessionLabel()}
          </motion.div>

          {/* モード表示（スタンドアロンモードの場合） */}
          {mode === 'standalone' && sessionType === 'pomodoro' && (
            <motion.div
              className="text-sm opacity-60 mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              data-testid="session-mode"
            >
              スタンドアロンモード
            </motion.div>
          )}

          {/* 実行中インジケーター */}
          {isRunning && (
            <motion.div
              className="flex items-center space-x-2 text-sm opacity-75"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              data-testid="timer-status"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span>実行中</span>
            </motion.div>
          )}

          {/* 停止中・一時停止インジケーター */}
          {!isRunning && (
            <motion.div
              className="text-sm opacity-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.3 }}
              data-testid="timer-status"
            >
              <span>{currentTime === totalTime ? '停止中' : '一時停止'}</span>
            </motion.div>
          )}

          {/* 進捗パーセンテージ */}
          {!isRunning && progressPercentage > 0 && (
            <motion.div
              className="text-sm opacity-60 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.3 }}
            >
              {Math.round(progressPercentage)}% 完了
            </motion.div>
          )}
        </div>

        {/* 装飾的な要素 */}
        <div className="absolute inset-4 rounded-full border border-white/10" />
        <div className="absolute inset-8 rounded-full border border-white/5" />
      </motion.div>

      {/* 浮遊する装飾要素 */}
      <motion.div
        className="absolute -top-4 -right-4 w-3 h-3 bg-white/20 rounded-full"
        animate={{
          y: [-5, 5, -5],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute -bottom-6 -left-6 w-2 h-2 bg-white/15 rounded-full"
        animate={{
          y: [5, -5, 5],
          opacity: [0.15, 0.4, 0.15],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
    </div>
  );
};
