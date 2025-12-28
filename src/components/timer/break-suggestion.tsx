import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BreakSuggestionProps {
  isVisible: boolean;
  breakType: 'short' | 'long';
  onAccept: () => void;
  onDecline: () => void;
  onStartPomodoro: () => void;
}

export const BreakSuggestion: React.FC<BreakSuggestionProps> = ({
  isVisible,
  breakType,
  onAccept,
  onDecline,
  onStartPomodoro,
}) => {
  const getBreakInfo = () => {
    if (breakType === 'long') {
      return {
        title: '長い休憩の時間です！',
        description: '15分間しっかりと休憩しましょう。',
        duration: '15分',
        color: 'blue',
        icon: '🛌',
      };
    } else {
      return {
        title: '短い休憩の時間です！',
        description: '5分間リフレッシュしましょう。',
        duration: '5分',
        color: 'green',
        icon: '☕',
      };
    }
  };

  const breakInfo = getBreakInfo();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4 shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="text-center">
              {/* アイコン */}
              <div className="text-6xl mb-4">{breakInfo.icon}</div>

              {/* タイトル */}
              <h2
                className={`text-2xl font-bold mb-2 text-${breakInfo.color}-600 dark:text-${breakInfo.color}-400`}
              >
                {breakInfo.title}
              </h2>

              {/* 説明 */}
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {breakInfo.description}
              </p>

              {/* 休憩時間表示 */}
              <div
                className={`inline-block px-4 py-2 bg-${breakInfo.color}-100 dark:bg-${breakInfo.color}-900/30 rounded-lg mb-6`}
              >
                <span
                  className={`text-${breakInfo.color}-800 dark:text-${breakInfo.color}-200 font-semibold`}
                >
                  {breakInfo.duration}の休憩
                </span>
              </div>

              {/* ボタン */}
              <div className="space-y-3">
                <motion.button
                  className={`w-full btn-primary bg-${breakInfo.color}-500 hover:bg-${breakInfo.color}-600`}
                  onClick={onAccept}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  休憩を開始する
                </motion.button>

                <div className="flex space-x-3">
                  <motion.button
                    className="flex-1 btn-secondary text-sm"
                    onClick={onStartPomodoro}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    次のポモドーロを開始
                  </motion.button>

                  <motion.button
                    className="flex-1 btn-secondary text-sm"
                    onClick={onDecline}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    後で決める
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
