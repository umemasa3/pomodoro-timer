import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealtimeSyncService } from '../realtime-sync-service';
import type { Task } from '../../types';

// LocalStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Navigatorのモック
const navigatorMock = {
  onLine: true,
};

// Windowのモック
const windowMock = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe('RealtimeSyncService', () => {
  let service: RealtimeSyncService;

  beforeEach(() => {
    // グローバルオブジェクトのモック
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: navigatorMock,
      writable: true,
    });

    Object.defineProperty(globalThis, 'window', {
      value: windowMock,
      writable: true,
    });

    // モックをリセット
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // シングルトンインスタンスをリセット
    (RealtimeSyncService as any).instance = undefined;

    service = RealtimeSyncService.getInstance();
  });

  afterEach(() => {
    service.cleanup();
    // シングルトンインスタンスをリセット
    (RealtimeSyncService as any).instance = undefined;
  });

  describe('ネットワーク状態の管理', () => {
    it('初期状態でオンライン状態を正しく取得する', () => {
      expect(service.isNetworkOnline()).toBe(true);
    });

    it('ネットワーク状態の変更を監視する', () => {
      // サービス作成時にイベントリスナーが設定されることを確認
      expect(windowMock.addEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(windowMock.addEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      );
    });
  });

  describe('ローカルキャッシュの管理', () => {
    it('タスクキャッシュを正しく更新する', () => {
      const mockTask: Task = {
        id: 'test-task-1',
        user_id: 'user-1',
        title: 'テストタスク',
        description: 'テスト用のタスクです',
        estimated_pomodoros: 2,
        completed_pomodoros: 0,
        status: 'pending',
        priority: 'medium',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        completed_at: undefined,
      };

      // 空のキャッシュから開始
      localStorageMock.getItem.mockReturnValue('[]');

      service.updateLocalTaskCache({
        eventType: 'INSERT',
        new: mockTask,
        old: {} as Task,
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pomodoro-tasks-cache',
        JSON.stringify([mockTask])
      );
    });

    it('キャッシュからタスクを取得する', () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          user_id: 'user-1',
          title: 'タスク1',
          description: '',
          estimated_pomodoros: 1,
          completed_pomodoros: 0,
          status: 'pending',
          priority: 'medium',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          completed_at: undefined,
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTasks));

      const result = service.getTasksFromCache();
      expect(result).toEqual(mockTasks);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'pomodoro-tasks-cache'
      );
    });

    it('キャッシュエラー時は空配列を返す', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      const result = service.getTasksFromCache();
      expect(result).toEqual([]);
    });
  });

  describe('オフライン操作', () => {
    beforeEach(() => {
      // オフライン状態に設定
      navigatorMock.onLine = false;
    });

    it('オフライン時にタスクを作成する', async () => {
      const taskData = {
        user_id: 'user-1',
        title: 'オフラインタスク',
        description: 'オフラインで作成されたタスク',
        estimated_pomodoros: 1,
        priority: 'medium' as const,
      };

      localStorageMock.getItem.mockReturnValue('[]');

      const result = await service.createTaskOffline(taskData);

      expect(result.title).toBe(taskData.title);
      expect(result.id).toMatch(/^offline-\d+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pomodoro-tasks-cache',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pomodoro-pending-changes',
        expect.any(String)
      );
    });

    it('存在しないタスクの更新時はエラーを投げる', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      await expect(
        service.updateTaskOffline('non-existent', { title: 'test' })
      ).rejects.toThrow('タスクが見つかりません');
    });
  });

  describe('未同期変更の管理', () => {
    it('未同期変更をローカルストレージに保存する', async () => {
      const taskData = {
        user_id: 'user-1',
        title: 'Test Task',
        description: '',
        estimated_pomodoros: 1,
        priority: 'medium' as const,
      };

      localStorageMock.getItem.mockReturnValue('[]');

      await service.createTaskOffline(taskData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pomodoro-pending-changes',
        expect.stringContaining('task')
      );
    });
  });

  describe('サービスのクリーンアップ', () => {
    it('クリーンアップ時にイベントリスナーを削除する', () => {
      service.cleanup();

      expect(windowMock.removeEventListener).toHaveBeenCalled();
    });
  });
});
