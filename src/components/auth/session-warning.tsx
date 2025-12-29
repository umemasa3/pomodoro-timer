import React, { useState, useEffect, useCallback } from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { sessionManager } from '../../services/session-manager';

interface SessionWarningProps {
  onExtendSession?: () => void;
  onDismiss?: () => void;
}

export const SessionWarning: React.FC<SessionWarningProps> = ({
  onExtendSession,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    const handleSessionWarning = (event: CustomEvent) => {
      const { message: msg } = event.detail;
      setMessage(msg);
      setIsVisible(true);
    };

    const handleSessionExpired = () => {
      setIsVisible(false);
    };

    // Escapeキーでの閉じる機能
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleDismiss();
      }
    };

    // カスタムイベントリスナーを追加
    window.addEventListener(
      'sessionWarning',
      handleSessionWarning as EventListener
    );
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'sessionWarning',
        handleSessionWarning as EventListener
      );
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, handleDismiss]);

  const handleExtendSession = async () => {
    try {
      const success = await sessionManager.extendSession();
      if (success) {
        setIsVisible(false);
        onExtendSession?.();
      }
    } catch (error) {
      console.error('セッション延長エラー:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div
        className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-lg p-4"
        role="alertdialog"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-message"
        aria-live="assertive"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon
              className="h-5 w-5 text-yellow-400"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3 flex-1">
            <h3
              id="session-warning-title"
              className="text-sm font-medium text-yellow-800 dark:text-yellow-200"
            >
              セッション期限警告
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p id="session-warning-message">{message}</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                type="button"
                onClick={handleExtendSession}
                className="bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                data-testid="extend-session-button"
                aria-describedby="session-warning-message"
              >
                セッションを延長
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-yellow-700 dark:text-yellow-300 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-100 dark:hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                data-testid="dismiss-warning-button"
                aria-describedby="session-warning-message"
              >
                後で
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-400 hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              aria-label="警告を閉じる"
            >
              <span className="sr-only">閉じる</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
