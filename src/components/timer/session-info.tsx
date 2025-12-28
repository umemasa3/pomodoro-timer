import React from 'react';
import { motion } from 'framer-motion';
import {
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

interface SessionInfoProps {
  completedSessions: number;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
  completedSessions,
  sessionType,
}) => {
  // 長い休憩までの残りセッション数
  const sessionsUntilLongBreak = 4 - (completedSessions % 4);

  // セッションインジケーターを生成
  const renderSessionIndicators = () => {
    const indicators = [];
    const sessionsInCurrentCycle = completedSessions % 4;

    for (let i = 0; i < 4; i++) {
      const isCompleted = i < sessionsInCurrentCycle;
      indicators.push(
        <motion.div
          key={i}
          className={`session-indicator ${isCompleted ? 'completed' : 'pending'}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          whileHover={{ scale: 1.2 }}
        />
      );
    }

    return indicators;
  };

  // セッションタイプに応じたメッセージとアイコン
  const getSessionMessage = () => {
    switch (sessionType) {
      case 'pomodoro':
        return {
          message: '集中して作業しましょう！',
          icon: <FireIcon className="w-5 h-5 text-pomodoro-500" />,
          bgColor: 'bg-pomodoro-50 dark:bg-pomodoro-900/20',
          textColor: 'text-pomodoro-700 dark:text-pomodoro-300',
        };
      case 'short_break':
        return {
          message: '短い休憩でリフレッシュ！',
          icon: <ClockIcon className="w-5 h-5 text-break-500" />,
          bgColor: 'bg-break-50 dark:bg-break-900/20',
          textColor: 'text-break-700 dark:text-break-300',
        };
      case 'long_break':
        return {
          message: 'しっかり休んでエネルギー回復！',
          icon: <CheckCircleIcon className="w-5 h-5 text-blue-500" />,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
        };
      default:
        return {
          message: '準備完了',
          icon: <ClockIcon className="w-5 h-5 text-gray-500" />,
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          textColor: 'text-gray-700 dark:text-gray-300',
        };
    }
  };

  const sessionInfo = getSessionMessage();

  return (
    <motion.div
      className="mt-8 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* セッション統計カード */}
      <div className="card-glass p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pomodoro-100 dark:bg-pomodoro-900/30 rounded-lg">
              <FireIcon className="w-6 h-6 text-pomodoro-600 dark:text-pomodoro-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                完了セッション
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                今日の実績
              </p>
            </div>
          </div>
          <motion.div
            className="text-3xl font-bold gradient-text"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {completedSessions}
          </motion.div>
        </div>

        {/* セッションインジケーター */}
        {sessionType === 'pomodoro' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                現在のサイクル進捗
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {completedSessions % 4}/4
              </span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              {renderSessionIndicators()}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                長い休憩まで{' '}
                <span className="font-semibold text-pomodoro-600 dark:text-pomodoro-400">
                  {sessionsUntilLongBreak}
                </span>{' '}
                セッション
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 現在のセッション状態 */}
      <motion.div
        className={`${sessionInfo.bgColor} p-4 rounded-xl border border-opacity-20`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {sessionInfo.icon}
          </motion.div>
          <p className={`font-medium ${sessionInfo.textColor}`}>
            {sessionInfo.message}
          </p>
        </div>
      </motion.div>

      {/* 今日の目標進捗（オプション） */}
      {completedSessions > 0 && (
        <motion.div
          className="card-glass p-4 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                今日の目標
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {Math.min(completedSessions, 8)}/8 セッション
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((completedSessions / 8) * 100, 100)}%`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
