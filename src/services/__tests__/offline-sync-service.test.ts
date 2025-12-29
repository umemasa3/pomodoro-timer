import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineSyncService } from '../offline-sync-service';

// モック
vi.mock('../database-service', () => ({
  DatabaseService: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

vi.mock('../realtime-sync-service', () => ({
  RealtimeSyncService: {
    getInstance: vi.fn(() => ({
      updateLocalTaskCache: vi.fn(),
      updateLocalSessionCache: vi.fn(),
      getTasksFromCache: vi.fn(() => []),
      getSessionsFromCache: vi.fn(() => []),
    })),
  },
}));

// ローカルストレージのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// navigator.onLineのモック
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineSyncService', () => {
  let offlineSync: OfflineSyncService;

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // ネットワーク状態をオンラインに設定
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // シングルトンインスタンスを取得
    offlineSync = OfflineSyncService.getInstance();
  });

  afterEach(() => {
    // クリーンアップ
    offlineSync.cleanup();
  });

  describe('初期化', () => {
    it('シングルトンパターンで動作する', () => {
      const instance1 = OfflineSyncService.getInstance();
      const instance2 = OfflineSyncService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('初期状態が正しく設定される', () => {
      const state = offlineSync.getCurrentState();

      expect(state.isOnline).toBe(true);
      expect(state.pendingActions).toEqual([]);
      expect(state.syncStatus).toBe('idle');
      expect(state.lastSyncTime).toBeNull();
    });
  });

  describe('アクションキュー', () => {
    it('アクションをキューに追加できる', async () => {
      const action = {
        type: 'create' as const,
        entity: 'task' as const,
        data: { title: 'テストタスク' },
        maxRetries: 3,
      };

      await offlineSync.queueAction(action);

      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].type).toBe('create');
      expect(state.pendingActions[0].entity).toBe('task');
      expect(state.pendingActions[0].data).toEqual({ title: 'テストタスク' });
    });

    it('複数のアクションをキューに追加できる', async () => {
      const actions = [
        {
          type: 'create' as const,
          entity: 'task' as const,
          data: { title: 'タスク1' },
          maxRetries: 3,
        },
        {
          type: 'update' as const,
          entity: 'task' as const,
          data: { id: '1', updates: { title: 'タスク1更新' } },
          maxRetries: 3,
        },
      ];

      for (const action of actions) {
        await offlineSync.queueAction(action);
      }

      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(2);
    });
  });

  describe('オフライン操作', () => {
    beforeEach(() => {
      // ネットワークをオフラインに設定
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
    });

    it('オフライン時にタスクを作成できる', async () => {
      const taskData = {
        user_id: 'user1',
        title: 'オフラインタスク',
        description: 'テスト用タスク',
        estimated_pomodoros: 2,
        completed_pomodoros: 0,
        status: 'pending' as const,
        priority: 'medium' as const,
      };

      const result = await offlineSync.createTaskOffline(taskData);

      expect(result.id).toMatch(/^offline-task-/);
      expect(result.title).toBe('オフラインタスク');
      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();

      // キューに追加されていることを確認
      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].type).toBe('create');
      expect(state.pendingActions[0].entity).toBe('task');
    });

    it('オフライン時にタスクを更新できる', async () => {
      // まずキャッシュにタスクを追加
      const mockTask = {
        id: 'task1',
        user_id: 'user1',
        title: '元のタスク',
        description: '',
        estimated_pomodoros: 1,
        completed_pomodoros: 0,
        status: 'pending' as const,
        priority: 'medium' as const,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // RealtimeSyncServiceのモックを更新
      const { RealtimeSyncService } = await import('../realtime-sync-service');
      const mockRealtimeSync = RealtimeSyncService.getInstance();
      vi.mocked(mockRealtimeSync.getTasksFromCache).mockReturnValue([mockTask]);

      const updates = {
        title: '更新されたタスク',
        status: 'in_progress' as const,
      };
      const result = await offlineSync.updateTaskOffline('task1', updates);

      expect(result.title).toBe('更新されたタスク');
      expect(result.status).toBe('in_progress');
      expect(result.updated_at).not.toBe(mockTask.updated_at);

      // キューに追加されていることを確認
      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].type).toBe('update');
      expect(state.pendingActions[0].entity).toBe('task');
    });

    it('オフライン時にセッションを作成できる', async () => {
      const sessionData = {
        user_id: 'user1',
        task_id: 'task1',
        type: 'pomodoro' as const,
        planned_duration: 25,
        actual_duration: 25,
        completed: true,
        started_at: '2024-01-01T00:00:00Z',
        completed_at: '2024-01-01T00:25:00Z',
        mode: 'task-based' as const,
      };

      const result = await offlineSync.createSessionOffline(sessionData);

      expect(result.id).toMatch(/^offline-session-/);
      expect(result.type).toBe('pomodoro');
      expect(result.planned_duration).toBe(25);

      // キューに追加されていることを確認
      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].type).toBe('create');
      expect(state.pendingActions[0].entity).toBe('session');
    });
  });

  describe('同期処理', () => {
    it('オンライン復旧時に未同期アクションを同期する', async () => {
      // アクションをキューに追加
      await offlineSync.queueAction({
        type: 'create',
        entity: 'task',
        data: { title: 'テストタスク' },
        maxRetries: 3,
      });

      // 同期を実行
      const result = await offlineSync.syncPendingActions();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // キューが空になっていることを確認
      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(0);
    });

    it('同期失敗時にリトライする', async () => {
      // DatabaseServiceのモックを失敗するように設定
      const { DatabaseService } = await import('../database-service');
      vi.mocked(DatabaseService.createTask).mockRejectedValueOnce(
        new Error('同期エラー')
      );

      // アクションをキューに追加
      await offlineSync.queueAction({
        type: 'create',
        entity: 'task',
        data: { title: 'テストタスク' },
        maxRetries: 3,
      });

      // 同期を実行
      const result = await offlineSync.syncPendingActions();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);

      // アクションがまだキューに残っていることを確認（リトライのため）
      const state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].retryCount).toBe(1);
    });

    it('最大リトライ回数に達したアクションを削除する', async () => {
      // DatabaseServiceのモックを常に失敗するように設定
      const { DatabaseService } = await import('../database-service');
      vi.mocked(DatabaseService.createTask).mockRejectedValue(
        new Error('同期エラー')
      );

      // アクションをキューに追加（最大リトライ回数を1に設定）
      await offlineSync.queueAction({
        type: 'create',
        entity: 'task',
        data: { title: 'テストタスク' },
        maxRetries: 1,
      });

      // 最初の同期（失敗）
      await offlineSync.syncPendingActions();

      let state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(1);
      expect(state.pendingActions[0].retryCount).toBe(1);

      // 2回目の同期（最大リトライ回数に達して削除）
      await offlineSync.syncPendingActions();

      state = offlineSync.getCurrentState();
      expect(state.pendingActions).toHaveLength(0);
    });
  });

  describe('状態管理', () => {
    it('状態変更コールバックが正しく動作する', () => {
      const callback = vi.fn();

      // コールバックを登録
      const unsubscribe = offlineSync.onStateChange(callback);

      // 初回状態が送信されることを確認
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
          pendingActions: [],
          syncStatus: 'idle',
        })
      );

      // コールバックを解除
      unsubscribe();
    });

    it('ネットワーク状態の変化を検知する', () => {
      const callback = vi.fn();
      offlineSync.onStateChange(callback);

      // オフラインイベントをシミュレート
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      // コールバックが呼ばれることを確認
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
        })
      );
    });
  });

  describe('ユーティリティメソッド', () => {
    it('未同期アクション数を取得できる', async () => {
      expect(offlineSync.getPendingActionsCount()).toBe(0);

      await offlineSync.queueAction({
        type: 'create',
        entity: 'task',
        data: { title: 'テストタスク' },
        maxRetries: 3,
      });

      expect(offlineSync.getPendingActionsCount()).toBe(1);
    });

    it('ネットワーク状態を取得できる', () => {
      expect(offlineSync.isNetworkOnline()).toBe(true);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // ネットワーク状態の変更を反映するためにイベントを発火
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(offlineSync.isNetworkOnline()).toBe(false);
    });

    it('同期状態を取得できる', () => {
      expect(offlineSync.getSyncStatus()).toBe('idle');
    });

    it('未同期アクションをクリアできる', async () => {
      await offlineSync.queueAction({
        type: 'create',
        entity: 'task',
        data: { title: 'テストタスク' },
        maxRetries: 3,
      });

      expect(offlineSync.getPendingActionsCount()).toBe(1);

      offlineSync.clearPendingActions();

      expect(offlineSync.getPendingActionsCount()).toBe(0);
    });
  });
});
