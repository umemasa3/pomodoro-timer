import React from 'react';
import { useOnlineStatus } from '../../hooks/use-online-status';

/**
 * オフライン状態インジケーターコンポーネント
 * ネットワーク接続が切断された時にユーザーに通知する
 */
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 px-4 py-2">
      <div className="flex items-center justify-center">
        <svg
          className="mr-2 h-5 w-5 text-yellow-900"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="text-sm font-medium text-yellow-900">
          オフラインモード - データは自動的に同期されます
        </span>
      </div>
    </div>
  );
};
