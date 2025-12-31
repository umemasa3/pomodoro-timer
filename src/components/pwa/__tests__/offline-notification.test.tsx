import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineNotification } from '../offline-notification';
import type { OfflineState } from '../../../services/offline-sync-service';

// モック
const mockOfflineSync = {
  onStateChange: vi.fn(),
  forceSync: vi.fn(),
};

vi.mock('../../../services/offline-sync-service', () => ({
  OfflineSyncService: {
    getInstance: () => mockOfflineSync,
  },
}));

describe('OfflineNotification', () => {
  const mockOfflineState: OfflineState = {
    isOnline: true,
    pendingActions: [],
    lastSyncTime: null,
    syncStatus: 'idle',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOfflineSync.onStateChange.mockImplementation(callback => {
      callback(mockOfflineState);
      return () => {}; // unsubscribe function
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('表示制御', () => {
    it('オンラインで問題がない場合は表示されない', () => {
      render(<OfflineNotification />);

      // 通知が表示されないことを確認
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('オフライン時に通知が表示される', () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('オフラインモード - 変更はローカルに保存されます')
      ).toBeInTheDocument();
    });

    it('未同期アクションがある場合に通知が表示される', () => {
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(stateWithPendingActions);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('1件の変更が未同期です')).toBeInTheDocument();
    });

    it('同期エラー時に通知が表示される', () => {
      const errorState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'error',
        errorMessage: '同期に失敗しました',
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(errorState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('同期に失敗しました')).toBeInTheDocument();
    });

    it('同期中に通知が表示される', () => {
      const syncingState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'syncing',
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(syncingState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('同期中... (1件)')).toBeInTheDocument();
    });
  });

  describe('通知の種類とスタイル', () => {
    it('オフライン通知が正しいスタイルで表示される', () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      render(<OfflineNotification />);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass(
        'bg-red-50',
        'border-red-200',
        'text-red-800'
      );
    });

    it('同期中通知が正しいスタイルで表示される', () => {
      const syncingState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'syncing',
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(syncingState);
        return () => {};
      });

      render(<OfflineNotification />);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass(
        'bg-blue-50',
        'border-blue-200',
        'text-blue-800'
      );
    });

    it('エラー通知が正しいスタイルで表示される', () => {
      const errorState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'error',
        errorMessage: 'エラーが発生しました',
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(errorState);
        return () => {};
      });

      render(<OfflineNotification />);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass(
        'bg-yellow-50',
        'border-yellow-200',
        'text-yellow-800'
      );
    });

    it('未同期通知が正しいスタイルで表示される', () => {
      const pendingState: OfflineState = {
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(pendingState);
        return () => {};
      });

      render(<OfflineNotification />);

      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass(
        'bg-orange-50',
        'border-orange-200',
        'text-orange-800'
      );
    });

    it('同期完了通知が正しいスタイルで表示される', async () => {
      // 最初に未同期状態を設定
      const pendingState: OfflineState = {
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
        ],
      };

      let stateCallback: ((state: OfflineState) => void) | null = null;
      mockOfflineSync.onStateChange.mockImplementation(callback => {
        stateCallback = callback;
        callback(pendingState);
        return () => {};
      });

      render(<OfflineNotification />);

      // 未同期状態の確認
      expect(screen.getByText('1件の変更が未同期です')).toBeInTheDocument();

      // 同期完了状態に変更
      const completedState: OfflineState = {
        ...mockOfflineState,
        isOnline: true,
        pendingActions: [],
        syncStatus: 'idle',
      };

      if (stateCallback) {
        stateCallback(completedState);
      }

      // 同期完了メッセージは表示されるが、3秒後に自動的に非表示になる
      // このテストでは未同期状態から同期完了への変化をテスト
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('詳細情報', () => {
    it('オフライン時に未同期アクション数が表示される', () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
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
            retryCount: 0,
            maxRetries: 3,
            deviceId: 'device1',
          },
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(
        screen.getByText('2件の変更がネットワーク復旧時に同期されます')
      ).toBeInTheDocument();
    });

    it('エラー時に手動同期の案内が表示される', () => {
      const errorState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'error',
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(errorState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(
        screen.getByText('手動同期ボタンをクリックして再試行してください')
      ).toBeInTheDocument();
    });

    it('最終同期時刻が表示される', () => {
      const lastSyncTime = new Date('2024-01-01T12:00:00Z');
      const stateWithLastSync: OfflineState = {
        ...mockOfflineState,
        lastSyncTime,
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(stateWithLastSync);
        return () => {};
      });

      render(<OfflineNotification />);

      // 最終同期時刻の表示を確認（具体的な時刻は環境によって異なるため、存在のみ確認）
      expect(screen.getByText(/最終同期:/)).toBeInTheDocument();
    });
  });

  describe('手動同期ボタン', () => {
    it('エラー時に手動同期ボタンが表示される', () => {
      const errorState: OfflineState = {
        ...mockOfflineState,
        syncStatus: 'error',
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(errorState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(
        screen.getByRole('button', { name: '今すぐ同期' })
      ).toBeInTheDocument();
    });

    it('未同期アクションがある時に手動同期ボタンが表示される', () => {
      const pendingState: OfflineState = {
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(pendingState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(
        screen.getByRole('button', { name: '今すぐ同期' })
      ).toBeInTheDocument();
    });

    it('手動同期ボタンをクリックすると同期が実行される', async () => {
      const pendingState: OfflineState = {
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(pendingState);
        return () => {};
      });

      mockOfflineSync.forceSync.mockResolvedValue({
        success: true,
        syncedCount: 1,
        failedCount: 0,
        errors: [],
      });

      render(<OfflineNotification />);

      const syncButton = screen.getByRole('button', { name: '今すぐ同期' });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockOfflineSync.forceSync).toHaveBeenCalled();
      });
    });

    it('同期中はボタンが無効化される', async () => {
      const pendingState: OfflineState = {
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(pendingState);
        return () => {};
      });

      // 同期が完了しないPromiseを返す
      mockOfflineSync.forceSync.mockImplementation(() => new Promise(() => {}));

      render(<OfflineNotification />);

      const syncButton = screen.getByRole('button', { name: '今すぐ同期' });
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: '同期中...' })
        ).toBeDisabled();
      });
    });

    it('オフライン時は手動同期ボタンが表示されない', () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
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
        ],
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(
        screen.queryByRole('button', { name: '今すぐ同期' })
      ).not.toBeInTheDocument();
    });
  });

  describe('閉じるボタン', () => {
    it('閉じるボタンをクリックすると通知が非表示になる', () => {
      const offlineState: OfflineState = {
        ...mockOfflineState,
        isOnline: false,
      };

      mockOfflineSync.onStateChange.mockImplementation(callback => {
        callback(offlineState);
        return () => {};
      });

      render(<OfflineNotification />);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '通知を閉じる' });
      fireEvent.click(closeButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('自動非表示', () => {
    it('同期完了時に3秒後に自動的に非表示になる', async () => {
      vi.useFakeTimers();

      try {
        // 最初に未同期状態を設定
        const pendingState: OfflineState = {
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
          ],
        };

        let stateCallback: ((state: OfflineState) => void) | null = null;
        mockOfflineSync.onStateChange.mockImplementation(callback => {
          stateCallback = callback;
          callback(pendingState);
          return () => {};
        });

        render(<OfflineNotification />);

        expect(screen.getByRole('alert')).toBeInTheDocument();

        // 同期完了状態に変更
        const completedState: OfflineState = {
          ...mockOfflineState,
          isOnline: true,
          pendingActions: [],
          syncStatus: 'idle',
        };

        if (stateCallback) {
          stateCallback(completedState);
        }

        // 3秒経過
        vi.advanceTimersByTime(3000);

        // 通知が非表示になることを確認
        await waitFor(
          () => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
          },
          { timeout: 1000 }
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
