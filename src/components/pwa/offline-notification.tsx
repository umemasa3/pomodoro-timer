import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  OfflineSyncService,
  type OfflineState,
} from '../../services/offline-sync-service';

/**
 * オフライン通知コンポーネント
 * ネットワーク状態の変化と同期状況をユーザーに通知
 */
export const OfflineNotification: React.FC = () => {
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const offlineSync = OfflineSyncService.getInstance();

  useEffect(() => {
    // オフライン状態の監視
    const unsubscribe = offlineSync.onStateChange(state => {
      setOfflineState(state);

      // オフライン状態または未同期アクションがある場合は表示
      if (
        !state.isOnline ||
        state.pendingActions.length > 0 ||
        state.syncStatus === 'error'
      ) {
        setIsVisible(true);
        setIsDismissed(false);
      } else if (
        state.isOnline &&
        state.pendingActions.length === 0 &&
        state.syncStatus === 'idle'
      ) {
        // オンラインで同期完了時は自動的に非表示
        setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    });

    return unsubscribe;
  }, [offlineSync]);

  /**
   * 手動同期を実行
   */
  const handleManualSync = async () => {
    if (!offlineState?.isOnline || isManualSyncing) {
      return;
    }

    setIsManualSyncing(true);
    try {
      await offlineSync.forceSync();
    } catch (error) {
      console.error('手動同期エラー:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  /**
   * 通知を閉じる
   */
  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  // 状態が取得できていない、または非表示状態の場合は何も表示しない
  if (!offlineState || !isVisible || isDismissed) {
    return null;
  }

  /**
   * 通知の種類を決定
   */
  const getNotificationType = () => {
    if (!offlineState.isOnline) {
      return 'offline';
    }
    if (offlineState.syncStatus === 'syncing') {
      return 'syncing';
    }
    if (offlineState.syncStatus === 'error') {
      return 'error';
    }
    if (offlineState.pendingActions.length > 0) {
      return 'pending';
    }
    return 'online';
  };

  const notificationType = getNotificationType();

  /**
   * 通知のスタイルを取得
   */
  const getNotificationStyles = () => {
    switch (notificationType) {
      case 'offline':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'syncing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'pending':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'online':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  /**
   * アイコンを取得
   */
  const getIcon = () => {
    switch (notificationType) {
      case 'offline':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'syncing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ArrowPathIcon className="h-5 w-5 text-orange-500" />;
      case 'online':
        return <WifiIcon className="h-5 w-5 text-green-500" />;
      default:
        return <WifiIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  /**
   * メッセージを取得
   */
  const getMessage = () => {
    switch (notificationType) {
      case 'offline':
        return 'オフラインモード - 変更はローカルに保存されます';
      case 'syncing':
        return `同期中... (${offlineState.pendingActions.length}件)`;
      case 'error':
        return offlineState.errorMessage || '同期エラーが発生しました';
      case 'pending':
        return `${offlineState.pendingActions.length}件の変更が未同期です`;
      case 'online':
        return '同期完了';
      default:
        return 'ネットワーク状態を確認中...';
    }
  };

  /**
   * 詳細情報を取得
   */
  const getDetails = () => {
    if (
      notificationType === 'offline' &&
      offlineState.pendingActions.length > 0
    ) {
      return `${offlineState.pendingActions.length}件の変更がネットワーク復旧時に同期されます`;
    }
    if (
      notificationType === 'error' &&
      offlineState.pendingActions.length > 0
    ) {
      return '手動同期ボタンをクリックして再試行してください';
    }
    if (offlineState.lastSyncTime) {
      const lastSync = new Date(offlineState.lastSyncTime);
      const now = new Date();
      const diffMinutes = Math.floor(
        (now.getTime() - lastSync.getTime()) / (1000 * 60)
      );

      if (diffMinutes < 1) {
        return '最終同期: 1分未満前';
      } else if (diffMinutes < 60) {
        return `最終同期: ${diffMinutes}分前`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return `最終同期: ${diffHours}時間前`;
      }
    }
    return null;
  };

  const details = getDetails();

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ${getNotificationStyles()}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>

        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{getMessage()}</p>

          {details && <p className="mt-1 text-xs opacity-75">{details}</p>}

          {/* 手動同期ボタン */}
          {(notificationType === 'error' || notificationType === 'pending') &&
            offlineState.isOnline && (
              <button
                onClick={handleManualSync}
                disabled={isManualSyncing}
                className="mt-2 inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon
                  className={`mr-1 h-3 w-3 ${isManualSyncing ? 'animate-spin' : ''}`}
                />
                {isManualSyncing ? '同期中...' : '今すぐ同期'}
              </button>
            )}
        </div>

        {/* 閉じるボタン */}
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="通知を閉じる"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
