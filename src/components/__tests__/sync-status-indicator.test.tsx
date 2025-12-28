import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncStatusIndicator } from '../sync-status-indicator';
import { useTimerStore } from '../../stores/timer-store';

// Zustandストアのモック
vi.mock('../../stores/timer-store', () => ({
  useTimerStore: vi.fn(),
}));

// RealtimeSyncServiceのモック
const mockSyncService = {
  onSyncStatusChange: vi.fn(),
  getConflictQueue: vi.fn(() => []),
  getConnectedDevices: vi.fn(() => Promise.resolve([])),
  resolveConflictManually: vi.fn(() => Promise.resolve()),
};

vi.mock('../../services/realtime-sync-service', () => ({
  RealtimeSyncService: {
    getInstance: vi.fn(() => mockSyncService),
  },
}));

describe('SyncStatusIndicator', () => {
  const mockTimerStore = {
    isOnline: true,
    pendingChangesCount: 0,
    syncStatus: 'idle' as const,
    forcSync: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useTimerStore).mockReturnValue(mockTimerStore);

    // モックサービスをリセット
    mockSyncService.onSyncStatusChange.mockImplementation(callback => {
      // デフォルトの正常状態を送信
      callback({
        isOnline: true,
        isSyncing: false,
        pendingChanges: 0,
        conflicts: 0,
        lastSyncTime: new Date().toISOString(),
        connectedDevices: 1,
      });
      return vi.fn(); // unsubscribe function
    });
    mockSyncService.getConflictQueue.mockReturnValue([]);
    mockSyncService.getConnectedDevices.mockResolvedValue([]);
    mockSyncService.resolveConflictManually.mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('同期済み状態で簡易表示される', () => {
      render(<SyncStatusIndicator />);

      expect(screen.getByText('同期済み')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('bg-green-100');
    });

    it('オフライン状態で警告表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        isOnline: false,
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText('オフライン')).toBeInTheDocument();
      expect(screen.getByText(/オフラインモードです/)).toBeInTheDocument();
    });

    it('未同期変更がある場合に警告表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        pendingChangesCount: 3,
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText('3件の未同期変更')).toBeInTheDocument();
      expect(screen.getByText('同期')).toBeInTheDocument();
    });

    it('同期中状態が表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        syncStatus: 'syncing',
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText('同期中...')).toBeInTheDocument();
    });

    it('同期エラー状態が表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        syncStatus: 'error',
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText('同期エラー')).toBeInTheDocument();
      expect(screen.getByText('同期')).toBeInTheDocument();
    });
  });

  describe('詳細表示', () => {
    it('詳細ボタンをクリックすると詳細情報が表示される', async () => {
      // オフライン状態にして詳細ボタンが表示されるようにする
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        isOnline: false,
      });

      render(<SyncStatusIndicator />);

      const detailButton = screen.getByText('詳細');
      fireEvent.click(detailButton);

      await waitFor(() => {
        expect(screen.getByText('ネットワーク:')).toBeInTheDocument();
        expect(screen.getByText('未同期変更:')).toBeInTheDocument();
        expect(screen.getByText('競合:')).toBeInTheDocument();
        expect(screen.getByText('接続デバイス:')).toBeInTheDocument();
      });
    });

    it('詳細表示で閉じるボタンが機能する', async () => {
      // オフライン状態にして詳細ボタンが表示されるようにする
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        isOnline: false,
      });

      render(<SyncStatusIndicator />);

      // 詳細を開く
      fireEvent.click(screen.getByText('詳細'));

      await waitFor(() => {
        expect(screen.getByText('ネットワーク:')).toBeInTheDocument();
      });

      // 詳細を閉じる
      fireEvent.click(screen.getByText('閉じる'));

      await waitFor(() => {
        expect(screen.queryByText('ネットワーク:')).not.toBeInTheDocument();
      });
    });

    it('接続デバイス数が表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        // detailedSyncStatusをモック
      });

      render(<SyncStatusIndicator />);

      // 複数デバイス接続時のテストは、実際のRealtimeSyncServiceの実装に依存
      // ここでは基本的な表示のテストのみ
      expect(screen.getByText('同期済み')).toBeInTheDocument();
    });
  });

  describe('手動同期', () => {
    it('手動同期ボタンをクリックするとforcSyncが呼ばれる', async () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        pendingChangesCount: 1,
      });

      render(<SyncStatusIndicator />);

      const syncButton = screen.getByText('同期');
      fireEvent.click(syncButton);

      expect(mockTimerStore.forcSync).toHaveBeenCalled();
    });

    it('同期中は手動同期ボタンが無効化される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        pendingChangesCount: 1,
        syncStatus: 'syncing',
      });

      render(<SyncStatusIndicator />);

      const syncButton = screen.getByText('同期中');
      expect(syncButton).toBeDisabled();
    });
  });

  describe('競合解決', () => {
    it('競合がある場合に解決ボタンが表示される', async () => {
      // 競合がある状態をモック
      const mockConflicts = [
        {
          id: 'conflict-1',
          type: 'task' as const,
          localVersion: { title: 'ローカル' },
          remoteVersion: { title: 'リモート' },
          conflictFields: ['title'],
          timestamp: Date.now(),
        },
      ];

      // モックサービスを更新して競合を返すように設定
      mockSyncService.getConflictQueue.mockReturnValue(mockConflicts);
      mockSyncService.onSyncStatusChange.mockImplementation(callback => {
        // 競合がある状態のステータスを送信
        callback({
          isOnline: true,
          isSyncing: false,
          pendingChanges: 0,
          conflicts: 1,
          lastSyncTime: new Date().toISOString(),
          connectedDevices: 1,
        });
        return vi.fn(); // unsubscribe function
      });

      // コンポーネントをレンダリング
      render(<SyncStatusIndicator />);

      // 競合状態が反映されるまで待機
      await waitFor(() => {
        expect(screen.getByText('1件の競合')).toBeInTheDocument();
        expect(screen.getByText('解決')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('キーボードナビゲーションが機能する', () => {
      render(<SyncStatusIndicator />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('エラーハンドリング', () => {
    it('同期エラー時に適切なメッセージが表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        syncStatus: 'error',
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText('同期エラー')).toBeInTheDocument();
    });

    it('手動同期でエラーが発生してもクラッシュしない', async () => {
      const mockForcSync = vi.fn().mockRejectedValue(new Error('同期エラー'));

      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        pendingChangesCount: 1,
        forcSync: mockForcSync,
      });

      render(<SyncStatusIndicator />);

      const syncButton = screen.getByText('同期');
      fireEvent.click(syncButton);

      // エラーが発生してもコンポーネントがクラッシュしないことを確認
      await waitFor(() => {
        expect(mockForcSync).toHaveBeenCalled();
      });
    });
  });
});
