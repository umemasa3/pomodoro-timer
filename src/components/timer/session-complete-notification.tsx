import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  FireIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';

interface SessionCompleteNotificationProps {
  isVisible: boolean;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
  onClose: () => void;
}

export const SessionCompleteNotification: React.FC<
  SessionCompleteNotificationProps
> = ({ isVisible, sessionType, onClose }) => {
  const getNotificationInfo = () => {
    switch (sessionType) {
      case 'pomodoro':
        return {
          title: 'ポモドーロ完了！',
          message: 'お疲れさまでした！集中して作業できましたね。',
          emoji: '🍅',
          icon: FireIcon,
          bgGradient: 'from-pomodoro-500 to-pomodoro-600',
          bgLight: 'bg-pomodoro-50 dark:bg-pomodoro-900/20',
          textColor: 'text-pomodoro-700 dark:text-pomodoro-300',
          borderColor: 'border-pomodoro-500',
          progressColor: 'bg-pomodoro-500',
        };
      case 'short_break':
        return {
          title: '短い休憩完了！',
          message:
            'リフレッシュできましたか？次のポモドーロに向けて準備しましょう。',
          emoji: '☕',
          icon: ClockIcon,
          bgGradient: 'from-break-500 to-break-600',
          bgLight: 'bg-break-50 dark:bg-break-900/20',
          textColor: 'text-break-700 dark:text-break-300',
          borderColor: 'border-break-500',
          progressColor: 'bg-break-500',
        };
      case 'long_break':
        return {
          title: '長い休憩完了！',
          message: 'しっかり休めましたね！新たな気持ちで作業を再開しましょう。',
          emoji: '🛌',
          icon: SparklesIcon,
          bgGradient: 'from-blue-500 to-blue-600',
          bgLight: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          borderColor: 'border-blue-500',
          progressColor: 'bg-blue-500',
        };
      default:
        return {
          title: 'セッション完了！',
          message: 'お疲れさまでした！',
          emoji: '✅',
          icon: CheckCircleIcon,
          bgGradient: 'from-gray-500 to-gray-600',
          bgLight: 'bg-gray-50 dark:bg-gray-900/20',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-500',
          progressColor: 'bg-gray-500',
        };
    }
  };

  const notificationInfo = getNotificationInfo();
  const Icon = notificationInfo.icon;

  // 3秒後に自動で閉じる
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* オーバーレイ（オプション） */}
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 通知カード */}
          <motion.div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              duration: 0.5,
            }}
          >
            <div className="relative">
              {/* グロー効果 */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${notificationInfo.bgGradient} rounded-3xl blur-xl opacity-30 scale-110`}
              />

              {/* メインカード */}
              <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-md border border-white/20 dark:border-gray-700/20">
                {/* 閉じるボタン */}
                <motion.button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </motion.button>

                {/* アイコンとエモジ */}
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    className={`relative p-4 bg-gradient-to-r ${notificationInfo.bgGradient} rounded-2xl shadow-lg`}
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Icon className="w-8 h-8 text-white" />

                    {/* 浮遊するエモジ */}
                    <motion.div
                      className="absolute -top-2 -right-2 text-2xl"
                      animate={{
                        y: [-5, 5, -5],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      {notificationInfo.emoji}
                    </motion.div>
                  </motion.div>
                </div>

                {/* タイトルとメッセージ */}
                <div className="text-center space-y-3">
                  <motion.h3
                    className={`font-bold text-2xl ${notificationInfo.textColor}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {notificationInfo.title}
                  </motion.h3>

                  <motion.p
                    className="text-gray-600 dark:text-gray-300 text-base leading-relaxed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {notificationInfo.message}
                  </motion.p>
                </div>

                {/* プログレスバー */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>自動で閉じます</span>
                    <span>3秒</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className={`h-full ${notificationInfo.progressColor} rounded-full`}
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 3, ease: 'linear' }}
                    />
                  </div>
                </div>

                {/* 装飾的な要素 */}
                <div className="absolute top-6 left-6 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
                <div
                  className="absolute bottom-8 right-8 w-1 h-1 bg-white/20 rounded-full animate-pulse"
                  style={{ animationDelay: '1s' }}
                />
              </div>

              {/* 浮遊する装飾要素 */}
              <motion.div
                className="absolute -top-4 -left-4 w-3 h-3 bg-white/20 rounded-full"
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute -bottom-2 -right-2 w-2 h-2 bg-white/15 rounded-full"
                animate={{
                  y: [10, -10, 10],
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
