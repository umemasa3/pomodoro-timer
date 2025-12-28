import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
          icon: '🍅',
          color: 'red',
        };
      case 'short_break':
        return {
          title: '短い休憩完了！',
          message:
            'リフレッシュできましたか？次のポモドーロに向けて準備しましょう。',
          icon: '☕',
          color: 'green',
        };
      case 'long_break':
        return {
          title: '長い休憩完了！',
          message: 'しっかり休めましたね！新たな気持ちで作業を再開しましょう。',
          icon: '🛌',
          color: 'blue',
        };
      default:
        return {
          title: 'セッション完了！',
          message: 'お疲れさまでした！',
          icon: '✅',
          color: 'gray',
        };
    }
  };

  const notificationInfo = getNotificationInfo();

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
        <motion.div
          className="fixed top-4 right-4 z-50"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm border-l-4 border-${notificationInfo.color}-500`}
          >
            <div className="flex items-start">
              <div className="text-3xl mr-4">{notificationInfo.icon}</div>

              <div className="flex-1">
                <h3
                  className={`font-bold text-lg text-${notificationInfo.color}-600 dark:text-${notificationInfo.color}-400 mb-1`}
                >
                  {notificationInfo.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {notificationInfo.message}
                </p>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* プログレスバー（3秒で消える） */}
            <motion.div
              className={`mt-3 h-1 bg-${notificationInfo.color}-200 dark:bg-${notificationInfo.color}-800 rounded-full overflow-hidden`}
            >
              <motion.div
                className={`h-full bg-${notificationInfo.color}-500`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3, ease: 'linear' }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
