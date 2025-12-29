import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from '../use-offline-sync';
import type { OfflineState } from '../../services/offline-sync-service';

// モック
const mockOfflineSync = {
  getCurrentState: vi.fn(),
  onStateChange: vi.fn(),
  forceSync: vi.fn(),
  createTaskOffline: vi.fn(),
  updateTaskOffline: vi.fn(),
  createSessionOffline: vi.fn(),
  clearPendingActions: vi.fn(),
};

vi.mock('../../services/offline-sync-service', () => ({
  OfflineSyncService: {
    getInstance: () => mockOfflineSync,
  },
}));

describe('useOfflineSync', () => {
  const mockOfflineState: OfflineState = {
    isOnline: true,
    pendingActions: [],
    lastSyncTime: null,
    syncStatus: 'idle',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOfflineSync.getCurrentState.mockReturnValue(mockOfflineState);
    mockOfflineSync.onStateChange.mockImplementation(callback => {
      callback(mockOfflineState);
      return () => {}; // unsubscribe function
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.offlineState).toEqual(mockOfflineState);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.pendingActionsCount).toBe(0);
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('状態変更の監視が設定される', () => {
      renderHook(() => useOfflineSync());

      expect(mockOfflineSync.getCurrentState).toHaveBeenCalled();
      expect(mockOfflineSync.onStateChange).toHaveBeenCalled();
    });
  });

  describe('状態の計算', () => {
    it('オフライン状態がnullの場合にnavigator.onLineを使用する', () => {
      mockOfflineSync.getCurrentState.mockReturnValue(null);
      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(null);
        return () => {};
      });

      // navigator.onLineをfalseに設定
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.pendingActionsCount).toBe(0);
      expect(result.current.syncStatus).toBe('idle');
    });

    it('未同期アクション数が正しく計算される', () => {
      const stateWithPendingActions: OfflineState = {
        ...mockOfflineState,
        pendingActions: [
          {
            id: '1',
            type: 'create',
            entity: 'task',
            data: {},
            timestamp: new Date(),
            retryCount: 0,
            maxRetries: 3,
            deviceId: 'device1',
          },
          {
            id: '2',
            type: 'update',
            entity: 'task',
            data: {},
            timestamp: new Date(),
            retryCount: 1,
            maxRetries: 3,
            deviceId: 'device1',
          },
        ],
      };

      mockOfflineSync.getCurrentState.mockReturnValue(stateWithPendingActions);
      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(stateWithPendingActions);
        return () => {};
      });

      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.pendingActionsCount).toBe(2);
    });
  });

  describe('手動同期', () => {
    it('手動同期が成功する', async () => {
      const mockSyncResult = {
        success: true,
        syncedCount: 2,
        failedCount: 0,
        errors: [],
      };

      mockOfflineSync.forceSync.mockResolvedValue(mockSyncResult);

      const { result } = renderHook(() => useOfflineSync());

      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSync();
      });

      expect(syncResult).toEqual(mockSyncResult);
      expect(mockOfflineSync.forceSync).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('手動同期が失敗する', async () => {
      const mockError = new Error('同期エラー');
      mockOfflineSync.forceSync.mockRejectedValue(mockError);

      const { result } = renderHook(() => useOfflineSync());

      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSync();
      });

      expect(syncResult).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('同期エラー');
    });

    it('オフライン時は同期を実行しない', async () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
      };

      mockOfflineSync.getCurrentState.mockReturnValue(offlineState);
      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      const { result } = renderHook(() => useOfflineSync());

      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSync();
      });

      expect(syncResult).toBeNull();
      expect(mockOfflineSync.forceSync).not.toHaveBeenCalled();
    });

    it('既に同期中の場合は同期を実行しない', async () => {
      const { result } = renderHook(() => useOfflineSync());

      // 最初の同期を開始（完了しない）
      mockOfflineSync.forceSync.mockImplementation(() => new Promise(() => {}));

      act(() => {
        result.current.forceSync();
      });

      // 2回目の同期を試行
      let secondSyncResult;
      await act(async () => {
        secondSyncResult = await result.current.forceSync();
      });

      expect(secondSyncResult).toBeNull();
      expect(mockOfflineSync.forceSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('オフライン操作', () => {
    it('オフライン時のタスク作成が成功する', async () => {
      const taskData = { title: 'テストタスク' };
      const mockTask = { id: 'offline-task-1', ...taskData };

      mockOfflineSync.createTaskOffline.mockResolvedValue(mockTask);

      const { result } = renderHook(() => useOfflineSync());

      let createdTask;
      await act(async () => {
        createdTask = await result.current.createTaskOffline(taskData);
      });

      expect(createdTask).toEqual(mockTask);
      expect(mockOfflineSync.createTaskOffline).toHaveBeenCalledWith(taskData);
      expect(result.current.error).toBeNull();
    });

    it('オフライン時のタスク作成が失敗する', async () => {
      const taskData = { title: 'テストタスク' };
      const mockError = new Error('タスク作成エラー');

      mockOfflineSync.createTaskOffline.mockRejectedValue(mockError);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        try {
          await result.current.createTaskOffline(taskData);
        } catch {
          // エラーが投げられることを期待
        }
      });

      expect(result.current.error).toBe('タスク作成エラー');
    });

    it('オフライン時のタスク更新が成功する', async () => {
      const taskId = 'task1';
      const updates = { title: '更新されたタスク' };
      const mockTask = { id: taskId, ...updates };

      mockOfflineSync.updateTaskOffline.mockResolvedValue(mockTask);

      const { result } = renderHook(() => useOfflineSync());

      let updatedTask;
      await act(async () => {
        updatedTask = await result.current.updateTaskOffline(taskId, updates);
      });

      expect(updatedTask).toEqual(mockTask);
      expect(mockOfflineSync.updateTaskOffline).toHaveBeenCalledWith(
        taskId,
        updates
      );
      expect(result.current.error).toBeNull();
    });

    it('オフライン時のセッション作成が成功する', async () => {
      const sessionData = { type: 'pomodoro', planned_duration: 25 };
      const mockSession = { id: 'offline-session-1', ...sessionData };

      mockOfflineSync.createSessionOffline.mockResolvedValue(mockSession);

      const { result } = renderHook(() => useOfflineSync());

      let createdSession;
      await act(async () => {
        createdSession = await result.current.createSessionOffline(sessionData);
      });

      expect(createdSession).toEqual(mockSession);
      expect(mockOfflineSync.createSessionOffline).toHaveBeenCalledWith(
        sessionData
      );
      expect(result.current.error).toBeNull();
    });
  });

  describe('エラー管理', () => {
    it('エラーをクリアできる', () => {
      const { result } = renderHook(() => useOfflineSync());

      // エラーを設定
      act(() => {
        result.current.createTaskOffline({}).catch(() => {});
      });

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('デバッグ機能', () => {
    it('未同期アクションをクリアできる', () => {
      const { result } = renderHook(() => useOfflineSync());

      act(() => {
        result.current.clearPendingActions();
      });

      expect(mockOfflineSync.clearPendingActions).toHaveBeenCalled();
    });
  });

  describe('状態の更新', () => {
    it('状態変更時にコンポーネントが再レンダリングされる', () => {
      let stateChangeCallback: ((state: OfflineState) => void) | null = null;

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        stateChangeCallback = callback;
        callback(mockOfflineState);
        return () => {};
      });

      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);

      // 状態を変更
      const newState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
        syncStatus: 'error',
        errorMessage: 'ネットワークエラー',
      };

      act(() => {
        if (stateChangeCallback) {
          stateChangeCallback(newState);
        }
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.syncStatus).toBe('error');
    });
  });
});
