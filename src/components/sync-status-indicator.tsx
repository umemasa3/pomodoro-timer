import React from 'react';
import { useTimerStore } from '../stores/timer-store';

/**
 * 同期状態インジケーター
 * ネットワーク状態と未同期の変更数を表示
 */
export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, pendingChangesCount, syncStatus, forcSync } =
    useTimerStore();

  const handleManualSync = async () => {
    try {
      await forcSync();
    } catch (error) {
      console.error('手動同期エラー:', error);
    }
  };

  // オンライン状態で未同期の変更がない場合は表示しない
  if (isOnline && pendingChangesCount === 0 && syncStatus === 'idle') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium
        ${
          isOnline
            ? pendingChangesCount > 0
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }
      `}
      >
        {/* ネットワーク状態アイコン */}
        <div
          className={`
          w-2 h-2 rounded-full
          ${isOnline ? 'bg-green-500' : 'bg-red-500'}
        `}
        />

        {/* 状態メッセージ */}
        <span>
          {!isOnline
            ? 'オフライン'
            : syncStatus === 'syncing'
              ? '同期中...'
              : syncStatus === 'error'
                ? '同期エラー'
                : pendingChangesCount > 0
                  ? `${pendingChangesCount}件の未同期変更`
                  : '同期済み'}
        </span>

        {/* 手動同期ボタン */}
        {isOnline && (pendingChangesCount > 0 || syncStatus === 'error') && (
          <button
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className={`
              ml-2 px-2 py-1 text-xs rounded transition-colors
              ${
                syncStatus === 'syncing'
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }
            `}
          >
            {syncStatus === 'syncing' ? '同期中' : '同期'}
          </button>
        )}
      </div>

      {/* 詳細情報（オフライン時） */}
      {!isOnline && (
        <div className="mt-2 p-2 bg-gray-100 text-gray-700 text-xs rounded border">
          オフラインモードです。変更はローカルに保存され、
          <br />
          ネットワーク復旧時に自動同期されます。
        </div>
      )}
    </div>
  );
};
