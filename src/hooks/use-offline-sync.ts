import { useState, useEffect, useCallback } from 'react';
import {
  OfflineSyncService,
  type OfflineState,
  type SyncResult,
} from '../services/offline-sync-service';

/**
 * オフライン同期フック
 * オフライン同期サービスとReactコンポーネントを連携
 */
export const useOfflineSync = () => {
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offlineSync = OfflineSyncService.getInstance();

  useEffect(() => {
    // 初期状態を取得
    setOfflineState(offlineSync.getCurrentState());

    // 状態変更を監視
    const unsubscribe = offlineSync.onStateChange(state => {
      setOfflineState(state);
    });

    return unsubscribe;
  }, [offlineSync]);

  /**
   * 手動同期を実行
   */
  const forceSync = useCallback(async (): Promise<SyncResult | null> => {
    if (!offlineState?.isOnline || isLoading) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await offlineSync.forceSync();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '同期エラーが発生しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [offlineSync, offlineState?.isOnline, isLoading]);

  /**
   * オフライン時のタスク作成
   */
  const createTaskOffline = useCallback(
    async (taskData: any) => {
      try {
        return await offlineSync.createTaskOffline(taskData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'タスク作成エラー';
        setError(errorMessage);
        throw err;
      }
    },
    [offlineSync]
  );

  /**
   * オフライン時のタスク更新
   */
  const updateTaskOffline = useCallback(
    async (id: string, updates: any) => {
      try {
        return await offlineSync.updateTaskOffline(id, updates);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'タスク更新エラー';
        setError(errorMessage);
        throw err;
      }
    },
    [offlineSync]
  );

  /**
   * オフライン時のセッション作成
   */
  const createSessionOffline = useCallback(
    async (sessionData: any) => {
      try {
        return await offlineSync.createSessionOffline(sessionData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'セッション作成エラー';
        setError(errorMessage);
        throw err;
      }
    },
    [offlineSync]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 未同期アクションをクリア（デバッグ用）
   */
  const clearPendingActions = useCallback(() => {
    offlineSync.clearPendingActions();
  }, [offlineSync]);

  return {
    // 状態
    offlineState,
    isLoading,
    error,

    // 計算されたプロパティ
    isOnline: offlineState?.isOnline ?? navigator.onLine,
    pendingActionsCount: offlineState?.pendingActions.length ?? 0,
    syncStatus: offlineState?.syncStatus ?? 'idle',
    lastSyncTime: offlineState?.lastSyncTime,

    // アクション
    forceSync,
    createTaskOffline,
    updateTaskOffline,
    createSessionOffline,
    clearError,
    clearPendingActions,
  };
};
