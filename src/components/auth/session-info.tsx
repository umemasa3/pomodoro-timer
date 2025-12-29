import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth-store';
import { sessionManager } from '../../services/session-manager';

export const SessionInfo: React.FC = () => {
  const { isAuthenticated, sessionExpiry, rememberMe } = useAuthStore();
  const [sessionInfo, setSessionInfo] = useState<{
    isActive: boolean;
    expiresAt: Date | null;
    timeRemaining: number | null;
  }>({ isActive: false, expiresAt: null, timeRemaining: null });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const updateSessionInfo = () => {
      const info = sessionManager.getSessionInfo();
      setSessionInfo(info);
    };

    // 初回更新
    updateSessionInfo();

    // 1分ごとに更新
    const interval = setInterval(updateSessionInfo, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiry]);

  if (!isAuthenticated || !sessionInfo.isActive) {
    return null;
  }

  const formatTimeRemaining = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  };

  const isWarningTime =
    sessionInfo.timeRemaining && sessionInfo.timeRemaining < 5 * 60 * 1000; // 5分未満

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">
          {isWarningTime ? (
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
          ) : (
            <ShieldCheckIcon className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              セッション期限:
            </span>
            <span
              className={`text-sm font-medium ${
                isWarningTime
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {sessionInfo.timeRemaining
                ? formatTimeRemaining(sessionInfo.timeRemaining)
                : '不明'}
            </span>
          </div>
          {rememberMe && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ログイン状態を保持中（30日間）
            </div>
          )}
        </div>
      </div>

      {sessionInfo.expiresAt && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          期限: {sessionInfo.expiresAt.toLocaleString()}
        </div>
      )}

      {isWarningTime && (
        <div className="mt-2">
          <button
            onClick={() => sessionManager.extendSession()}
            className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/40 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            data-testid="extend-session-quick-button"
          >
            セッションを延長
          </button>
        </div>
      )}
    </div>
  );
};
