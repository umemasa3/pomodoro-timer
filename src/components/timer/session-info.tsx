import React from 'react';
import { motion } from 'framer-motion';

interface SessionInfoProps {
  completedSessions: number;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
  completedSessions,
  sessionType,
}) => {
  return (
    <motion.div
      className="mt-8 text-center text-gray-600 dark:text-gray-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-2">
        <p className="text-lg font-medium">
          完了セッション: {completedSessions}
        </p>

        {sessionType === 'pomodoro' && (
          <p className="text-sm">
            次の長い休憩まで: {4 - (completedSessions % 4)} セッション
          </p>
        )}

        {sessionType === 'short_break' && (
          <p className="text-sm text-green-600 dark:text-green-400">
            短い休憩中 - リフレッシュしましょう！
          </p>
        )}

        {sessionType === 'long_break' && (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            長い休憩中 - しっかり休んでください！
          </p>
        )}
      </div>
    </motion.div>
  );
};
