import React from 'react';
import { motion } from 'framer-motion';

interface TimerDisplayProps {
  currentTime: number;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
  isRunning: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  currentTime,
  sessionType,
  isRunning,
}) => {
  // 時間を分:秒形式にフォーマット
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // セッションタイプに応じた表示テキスト
  const getSessionLabel = (): string => {
    switch (sessionType) {
      case 'pomodoro':
        return 'ポモドーロ';
      case 'short_break':
        return '短い休憩';
      case 'long_break':
        return '長い休憩';
      default:
        return 'ポモドーロ';
    }
  };

  // セッションタイプに応じたスタイルクラス
  const getCircleClass = (): string => {
    const baseClass = 'timer-circle';
    if (sessionType === 'short_break' || sessionType === 'long_break') {
      return `${baseClass} break-mode`;
    }
    return baseClass;
  };

  return (
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
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <motion.div
          className="text-6xl font-bold mb-2"
          animate={{
            opacity: isRunning ? [1, 0.8, 1] : 1,
          }}
          transition={{
            duration: 1,
            repeat: isRunning ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {formatTime(currentTime)}
        </motion.div>
        <div className="text-xl font-medium">{getSessionLabel()}</div>
        {isRunning && (
          <motion.div
            className="mt-2 text-sm opacity-75"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            実行中...
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
