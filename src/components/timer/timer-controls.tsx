import React from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';

interface TimerControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onStart,
  onPause,
  onReset,
}) => {
  return (
    <div className="flex items-center justify-center space-x-6">
      {/* メイン制御ボタン（開始/一時停止） */}
      <motion.button
        className={`
          relative overflow-hidden px-10 py-4 rounded-2xl font-semibold text-lg
          transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${
            isRunning
              ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 focus:ring-orange-500'
              : 'bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 hover:from-pomodoro-600 hover:to-pomodoro-700 text-white shadow-lg shadow-pomodoro-500/25 focus:ring-pomodoro-500'
          }
        `}
        onClick={isRunning ? onPause : onStart}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {/* シマー効果 */}
        <div className="absolute inset-0 shimmer opacity-20" />

        <div className="relative flex items-center space-x-3">
          <motion.div
            animate={{ rotate: isRunning ? 0 : 360 }}
            transition={{ duration: 0.3 }}
          >
            {isRunning ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </motion.div>
          <span>{isRunning ? '一時停止' : '開始'}</span>
        </div>

        {/* グロー効果 */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      </motion.button>

      {/* リセットボタン */}
      <motion.button
        className="
          relative overflow-hidden px-6 py-4 rounded-xl font-medium
          bg-white/10 hover:bg-white/20 dark:bg-gray-800/50 dark:hover:bg-gray-700/50
          text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
          border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-300/60 dark:hover:border-gray-500/60
          backdrop-blur-sm transition-all duration-300 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          shadow-lg hover:shadow-xl
        "
        onClick={onReset}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <div className="flex items-center space-x-2">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowPathIcon className="w-5 h-5" />
          </motion.div>
          <span>リセット</span>
        </div>
      </motion.button>

      {/* 装飾的な要素 */}
      <motion.div
        className="absolute -z-10"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <SparklesIcon className="w-8 h-8 text-pomodoro-200/20 dark:text-pomodoro-800/20" />
      </motion.div>
    </div>
  );
};
