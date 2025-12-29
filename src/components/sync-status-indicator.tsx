import React, { useState, useEffect } from 'react';
import { useTimerStore } from '../stores/timer-store';
import { RealtimeSyncService } from '../services/realtime-sync-service';
import { useOfflineSync } from '../hooks/use-offline-sync';
import type {
  SyncStatus,
  ConflictInfo,
  DeviceInfo,
} from '../services/realtime-sync-service';

/**
 * 同期状態インジケーター
 * ネットワーク状態、未同期の変更数、競合、接続デバイス数を表示
 * オフライン同期サービスと連携してオフライン対応を強化
 */
export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, pendingChangesCount, syncStatus, forcSync } =
    useTimerStore();
  const {
    offlineState,
    forceSync: forceOfflineSync,
    isLoading: isOfflineSyncing,
  } = useOfflineSync();
  const [syncService] = useState(() => RealtimeSyncService.getInstance());
  const [detailedSyncStatus, setDetailedSyncStatus] =
    useState<SyncStatus | null>(null);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    // 現在時刻を定期的に更新
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // 1分ごと

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // 詳細な同期ステータスを監視
    const unsubscribe = syncService.onSyncStatusChange(status => {
      setDetailedSyncStatus(status);
    });

    // 競合情報を定期的に更新
    const updateConflicts = () => {
      setConflicts(syncService.getConflictQueue());
    };

    // 接続デバイス情報を定期的に更新
    const updateDevices = async () => {
      try {
        const devices = await syncService.getConnectedDevices();
        setConnectedDevices(devices);
      } catch (error) {
        console.error('デバイス情報取得エラー:', error);
      }
    };

    updateConflicts();
    updateDevices();

    const interval = setInterval(() => {
      updateConflicts();
      updateDevices();
    }, 30000); // 30秒ごと

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [syncService]);

  const handleManualSync = async () => {
    try {
      // オフライン同期サービスの手動同期を優先
      if (
        offlineState?.pendingActions.length &&
        offlineState.pendingActions.length > 0
      ) {
        await forceOfflineSync();
      } else {
        await forcSync();
      }
    } catch (error) {
      console.error('手動同期エラー:', error);
    }
  };

  const handleResolveConflict = async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    try {
      await syncService.resolveConflictManually(
        conflictId,
        resolution,
        mergedData
      );
      setConflicts(syncService.getConflictQueue());
    } catch (error) {
      console.error('競合解決エラー:', error);
    }
  };

  // オンライン状態で未同期の変更がなく、競合もない場合は簡易表示
  const totalPendingChanges =
    pendingChangesCount + (offlineState?.pendingActions.length || 0);
  const hasIssues =
    !isOnline ||
    totalPendingChanges > 0 ||
    conflicts.length > 0 ||
    syncStatus !== 'idle' ||
    offlineState?.syncStatus !== 'idle';

  if (!hasIssues && !showDetails) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowDetails(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200 hover:bg-green-200 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>同期済み</span>
          {detailedSyncStatus && detailedSyncStatus.connectedDevices > 1 && (
            <span className="text-xs bg-green-200 px-1 rounded">
              {detailedSyncStatus.connectedDevices}台
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`
          flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium
          ${
            !isOnline
              ? 'bg-red-100 text-red-800 border border-red-200'
              : conflicts.length > 0
                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                : pendingChangesCount > 0
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-green-100 text-green-800 border border-green-200'
          }
        `}
        >
          {/* ネットワーク状態アイコン */}
          <div
            className={`
            w-2 h-2 rounded-full
            ${
              !isOnline
                ? 'bg-red-500'
                : conflicts.length > 0
                  ? 'bg-orange-500'
                  : pendingChangesCount > 0
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
            }
          `}
          />

          {/* 状態メッセージ */}
          <span>
            {!isOnline
              ? 'オフライン'
              : conflicts.length > 0
                ? `${conflicts.length}件の競合`
                : syncStatus === 'syncing' ||
                    offlineState?.syncStatus === 'syncing' ||
                    isOfflineSyncing
                  ? '同期中...'
                  : syncStatus === 'error' ||
                      offlineState?.syncStatus === 'error'
                    ? '同期エラー'
                    : totalPendingChanges > 0
                      ? `${totalPendingChanges}件の未同期変更`
                      : '同期済み'}
          </span>

          {/* 接続デバイス数 */}
          {detailedSyncStatus && detailedSyncStatus.connectedDevices > 1 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {detailedSyncStatus.connectedDevices}台接続
            </span>
          )}

          {/* アクションボタン */}
          <div className="flex gap-1 ml-2">
            {/* 競合解決ボタン */}
            {conflicts.length > 0 && (
              <button
                onClick={() => setShowConflictModal(true)}
                className="px-2 py-1 text-xs rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                解決
              </button>
            )}

            {/* 手動同期ボタン */}
            {isOnline &&
              (totalPendingChanges > 0 ||
                syncStatus === 'error' ||
                offlineState?.syncStatus === 'error') && (
                <button
                  onClick={handleManualSync}
                  disabled={
                    syncStatus === 'syncing' ||
                    offlineState?.syncStatus === 'syncing' ||
                    isOfflineSyncing
                  }
                  className={`
                  px-2 py-1 text-xs rounded transition-colors
                  ${
                    syncStatus === 'syncing' ||
                    offlineState?.syncStatus === 'syncing' ||
                    isOfflineSyncing
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }
                `}
                >
                  {syncStatus === 'syncing' ||
                  offlineState?.syncStatus === 'syncing' ||
                  isOfflineSyncing
                    ? '同期中'
                    : '同期'}
                </button>
              )}

            {/* 詳細表示ボタン */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
            >
              {showDetails ? '閉じる' : '詳細'}
            </button>
          </div>
        </div>

        {/* 詳細情報パネル */}
        {showDetails && (
          <div className="mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs max-w-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">ネットワーク:</span>
                <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                  {isOnline ? 'オンライン' : 'オフライン'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">未同期変更:</span>
                <span>{totalPendingChanges}件</span>
              </div>

              {offlineState && offlineState.pendingActions.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-medium">オフライン変更:</span>
                  <span>{offlineState.pendingActions.length}件</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="font-medium">競合:</span>
                <span
                  className={
                    conflicts.length > 0 ? 'text-orange-600' : 'text-green-600'
                  }
                >
                  {conflicts.length}件
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">接続デバイス:</span>
                <span>{detailedSyncStatus?.connectedDevices || 0}台</span>
              </div>

              {(detailedSyncStatus?.lastSyncTime ||
                offlineState?.lastSyncTime) && (
                <div className="flex justify-between">
                  <span className="font-medium">最終同期:</span>
                  <span>
                    {new Date(
                      (detailedSyncStatus?.lastSyncTime ||
                        offlineState?.lastSyncTime) as string
                    ).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* 接続デバイス一覧 */}
            {connectedDevices.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <div className="font-medium mb-1">接続デバイス:</div>
                {connectedDevices.map(device => {
                  const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
                  const isRecentlyActive =
                    new Date(device.lastSeen).getTime() > fiveMinutesAgo;

                  return (
                    <div
                      key={device.id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isRecentlyActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        <span className="truncate max-w-32">{device.name}</span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(device.lastSeen).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* オフライン時の説明 */}
        {!isOnline && !showDetails && (
          <div className="mt-2 p-2 bg-gray-100 text-gray-700 text-xs rounded border max-w-sm">
            オフラインモードです。変更はローカルに保存され、
            ネットワーク復旧時に自動同期されます。
          </div>
        )}
      </div>

      {/* 競合解決モーダル */}
      {showConflictModal && conflicts.length > 0 && (
        <ConflictResolutionModal
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </>
  );
};

/**
 * 競合解決モーダル
 */
interface ConflictResolutionModalProps {
  conflicts: ConflictInfo[];
  onResolve: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => Promise<void>;
  onClose: () => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onResolve,
  onClose,
}) => {
  const [selectedConflict, setSelectedConflict] = useState(0);
  const [isResolving, setIsResolving] = useState(false);

  const currentConflict = conflicts[selectedConflict];

  const handleResolve = async (resolution: 'local' | 'remote' | 'merge') => {
    setIsResolving(true);
    try {
      await onResolve(currentConflict.id, resolution);

      // 次の競合に移動、または全て解決済みの場合はモーダルを閉じる
      if (selectedConflict >= conflicts.length - 1) {
        onClose();
      } else {
        setSelectedConflict(selectedConflict + 1);
      }
    } catch (error) {
      console.error('競合解決エラー:', error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              データ競合の解決 ({selectedConflict + 1}/{conflicts.length})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {currentConflict.type === 'task'
                ? 'タスク'
                : currentConflict.type === 'session'
                  ? 'セッション'
                  : 'タグ'}
              「
              {currentConflict.localVersion.title ||
                currentConflict.localVersion.name ||
                currentConflict.id}
              」 で競合が発生しました。どちらのバージョンを採用しますか？
            </p>

            <div className="text-xs text-gray-500 mb-4">
              競合フィールド: {currentConflict.conflictFields.join(', ')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* ローカルバージョン */}
            <div className="border border-blue-200 rounded-lg p-3">
              <h3 className="font-medium text-blue-800 mb-2">
                このデバイスの変更
              </h3>
              <div className="text-sm space-y-1">
                {Object.entries(currentConflict.localVersion).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span
                        className={
                          currentConflict.conflictFields.includes(key)
                            ? 'font-medium text-blue-600'
                            : ''
                        }
                      >
                        {String(value)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* リモートバージョン */}
            <div className="border border-green-200 rounded-lg p-3">
              <h3 className="font-medium text-green-800 mb-2">
                他のデバイスの変更
              </h3>
              <div className="text-sm space-y-1">
                {Object.entries(currentConflict.remoteVersion).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span
                        className={
                          currentConflict.conflictFields.includes(key)
                            ? 'font-medium text-green-600'
                            : ''
                        }
                      >
                        {String(value)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleResolve('local')}
              disabled={isResolving}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              このデバイスの変更を採用
            </button>
            <button
              onClick={() => handleResolve('remote')}
              disabled={isResolving}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              他のデバイスの変更を採用
            </button>
          </div>

          {isResolving && (
            <div className="mt-4 text-center text-sm text-gray-600">
              競合を解決中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
