import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RealtimeSyncService } from '../realtime-sync-service';
import type { ConflictInfo } from '../realtime-sync-service';

// Supabaseのモック
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            user_metadata: {
              devices: {},
            },
          },
        },
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

// DatabaseServiceのモック
vi.mock('../database-service', () => ({
  DatabaseService: {
    getTask: vi.fn(),
    getSession: vi.fn(),
    getTag: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createSession: vi.fn(),
    updateSession: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    subscribeToTasks: vi.fn(() => ({ unsubscribe: vi.fn() })),
    subscribeToSessions: vi.fn(() => ({ unsubscribe: vi.fn() })),
  },
}));

describe('マルチデバイス同期機能', () => {
  let syncService: RealtimeSyncService;

  beforeEach(() => {
    // ローカルストレージをクリア
    localStorage.clear();

    // ネットワーク状態をオンラインに設定
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    syncService = RealtimeSyncService.getInstance();
  });

  afterEach(() => {
    syncService.cleanup();
    vi.clearAllMocks();
  });

  describe('デバイス管理', () => {
    it('デバイスIDが生成され、ローカルストレージに保存される', () => {
      const deviceId = localStorage.getItem('pomodoro-device-id');
      expect(deviceId).toBeTruthy();
      expect(deviceId).toMatch(/^device-\d+-[a-z0-9]+$/);
    });

    it('デバイス情報がローカルストレージに保存される', () => {
      const deviceInfo = localStorage.getItem('pomodoro-device-info');
      expect(deviceInfo).toBeTruthy();

      const parsed = JSON.parse(deviceInfo!);
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('type');
      expect(parsed).toHaveProperty('lastSeen');
      expect(parsed).toHaveProperty('userAgent');
    });

    it('接続されているデバイス一覧を取得できる', async () => {
      const devices = await syncService.getConnectedDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe('競合解決戦略', () => {
    it('競合解決戦略を設定・取得できる', () => {
      syncService.setConflictResolutionStrategy('user-choice');
      expect(syncService.getConflictResolutionStrategy()).toBe('user-choice');

      syncService.setConflictResolutionStrategy('merge-changes');
      expect(syncService.getConflictResolutionStrategy()).toBe('merge-changes');
    });

    it('デフォルトの競合解決戦略はlast-write-wins', () => {
      expect(syncService.getConflictResolutionStrategy()).toBe(
        'last-write-wins'
      );
    });
  });

  describe('同期ステータス監視', () => {
    it('同期ステータスの変更を監視できる', () => {
      return new Promise<void>(resolve => {
        const unsubscribe = syncService.onSyncStatusChange(status => {
          expect(status).toHaveProperty('isOnline');
          expect(status).toHaveProperty('isSyncing');
          expect(status).toHaveProperty('pendingChanges');
          expect(status).toHaveProperty('conflicts');
          expect(status).toHaveProperty('connectedDevices');

          unsubscribe();
          resolve();
        });
      });
    });

    it('ネットワーク状態を正しく報告する', () => {
      expect(syncService.isNetworkOnline()).toBe(true);
    });

    it('未同期変更数を正しく報告する', () => {
      const count = syncService.getPendingChangesCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('競合検出と解決', () => {
    it('競合キューを取得できる', () => {
      const conflicts = syncService.getConflictQueue();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('競合を手動で解決できる（ローカル優先）', async () => {
      // モックの競合情報を作成
      const mockConflict: ConflictInfo = {
        id: 'test-task-1',
        type: 'task',
        localVersion: {
          id: 'test-task-1',
          title: 'ローカルタスク',
          updated_at: '2024-01-01T12:00:00Z',
        },
        remoteVersion: {
          id: 'test-task-1',
          title: 'リモートタスク',
          updated_at: '2024-01-01T11:00:00Z',
        },
        conflictFields: ['title'],
        timestamp: Date.now(),
      };

      // 競合キューに追加（内部メソッドのテスト用）
      (syncService as any).conflictQueue = [mockConflict];

      await expect(
        syncService.resolveConflictManually('test-task-1', 'local')
      ).resolves.not.toThrow();
    });

    it('競合を手動で解決できる（リモート優先）', async () => {
      const mockConflict: ConflictInfo = {
        id: 'test-task-2',
        type: 'task',
        localVersion: {
          id: 'test-task-2',
          title: 'ローカルタスク',
          updated_at: '2024-01-01T11:00:00Z',
        },
        remoteVersion: {
          id: 'test-task-2',
          title: 'リモートタスク',
          updated_at: '2024-01-01T12:00:00Z',
        },
        conflictFields: ['title'],
        timestamp: Date.now(),
      };

      (syncService as any).conflictQueue = [mockConflict];

      await expect(
        syncService.resolveConflictManually('test-task-2', 'remote')
      ).resolves.not.toThrow();
    });

    it('存在しない競合の解決でエラーが発生する', async () => {
      await expect(
        syncService.resolveConflictManually('non-existent-conflict', 'local')
      ).rejects.toThrow('競合が見つかりません');
    });
  });

  describe('オフライン機能', () => {
    beforeEach(() => {
      // ネットワーク状態をオフラインに設定
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
    });

    it('オフライン時にタスクを作成できる', async () => {
      const taskData = {
        user_id: 'test-user',
        title: 'オフラインタスク',
        description: 'オフラインで作成されたタスク',
      };

      const task = await syncService.createTaskOffline(taskData);

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('オフラインタスク');
      expect(task.id).toMatch(/^offline-\d+$/);
    });

    it('オフライン時にタスクを更新できる', async () => {
      // まずオフラインタスクを作成
      const taskData = {
        user_id: 'test-user',
        title: '元のタスク',
        description: '元の説明',
      };

      const task = await syncService.createTaskOffline(taskData);

      // タスクを更新
      const updates = {
        title: '更新されたタスク',
        description: '更新された説明',
      };

      const updatedTask = await syncService.updateTaskOffline(task.id, updates);

      expect(updatedTask.title).toBe('更新されたタスク');
      expect(updatedTask.description).toBe('更新された説明');
    });

    it('オフライン時にセッションを作成できる', async () => {
      const sessionData = {
        user_id: 'test-user',
        task_id: 'test-task',
        type: 'pomodoro',
        planned_duration: 25,
        actual_duration: 25,
        completed: true,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const session = await syncService.createSessionOffline(sessionData);

      expect(session).toHaveProperty('id');
      expect(session.type).toBe('pomodoro');
      expect(session.id).toMatch(/^offline-\d+$/);
    });

    it('ローカルキャッシュからタスクを取得できる', () => {
      const tasks = syncService.getTasksFromCache();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('ローカルキャッシュからセッションを取得できる', () => {
      const sessions = syncService.getSessionsFromCache();
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('デバイス間同期', () => {
    it('特定のデバイスとの同期を強制実行できる', async () => {
      const deviceId = 'test-device-123';

      await expect(
        syncService.forceSyncWithDevice(deviceId)
      ).resolves.not.toThrow();
    });

    it('手動同期を実行できる', async () => {
      await expect(syncService.forcSync()).resolves.not.toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないタスクの更新でエラーが発生する', async () => {
      await expect(
        syncService.updateTaskOffline('non-existent-task', { title: '更新' })
      ).rejects.toThrow('タスクが見つかりません');
    });

    it('ネットワークエラー時に適切にハンドリングされる', async () => {
      // ネットワークをオフラインに設定
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await expect(syncService.forcSync()).rejects.toThrow(
        'ネットワークに接続されていません'
      );
    });
  });
});
