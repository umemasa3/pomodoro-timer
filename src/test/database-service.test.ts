/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseService } from '../services/database-service';
import { supabase } from '../services/supabase';
import type { Task, Tag, Session } from '../types';

// Supabaseクライアントのモック
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(),
  },
}));

describe('DatabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('タスク関連操作', () => {
    test('createTask: 新しいタスクを作成できる', async () => {
      // モックの設定
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockTask: Task = {
        id: 'task-123',
        user_id: 'user-123',
        title: 'テストタスク',
        description: 'テスト用のタスクです',
        estimated_pomodoros: 2,
        completed_pomodoros: 0,
        status: 'pending',
        priority: 'medium',
        created_at: '2024-12-28T12:00:00Z',
        updated_at: '2024-12-28T12:00:00Z',
      };

      const mockSupabaseAuth = vi.mocked(supabase.auth);
      const mockSupabaseFrom = vi.mocked(supabase.from);

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTask,
            error: null,
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
      } as any);

      // テスト実行
      const result = await DatabaseService.createTask({
        title: 'テストタスク',
        description: 'テスト用のタスクです',
        estimated_pomodoros: 2,
        priority: 'medium',
      });

      // 検証
      expect(result).toEqual(mockTask);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        title: 'テストタスク',
        description: 'テスト用のタスクです',
        estimated_pomodoros: 2,
        priority: 'medium',
      });
    });

    test('createTask: 認証されていない場合はエラーを投げる', async () => {
      const mockSupabaseAuth = vi.mocked(supabase.auth);

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(
        DatabaseService.createTask({
          title: 'テストタスク',
        })
      ).rejects.toThrow('認証が必要です');
    });

    test('getTasks: タスク一覧を取得できる', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          user_id: 'user-123',
          title: 'タスク1',
          estimated_pomodoros: 1,
          completed_pomodoros: 0,
          status: 'pending',
          priority: 'high',
          created_at: '2024-12-28T12:00:00Z',
          updated_at: '2024-12-28T12:00:00Z',
        },
        {
          id: 'task-2',
          user_id: 'user-123',
          title: 'タスク2',
          estimated_pomodoros: 2,
          completed_pomodoros: 1,
          status: 'in_progress',
          priority: 'medium',
          created_at: '2024-12-28T11:00:00Z',
          updated_at: '2024-12-28T11:30:00Z',
        },
      ];

      const mockSupabaseFrom = vi.mocked(supabase.from);
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockTasks,
          error: null,
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await DatabaseService.getTasks();

      expect(result).toEqual(mockTasks);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
    });

    test('updateTask: タスクを更新できる', async () => {
      const mockUpdatedTask: Task = {
        id: 'task-123',
        user_id: 'user-123',
        title: '更新されたタスク',
        estimated_pomodoros: 3,
        completed_pomodoros: 1,
        status: 'in_progress',
        priority: 'high',
        created_at: '2024-12-28T12:00:00Z',
        updated_at: '2024-12-28T13:00:00Z',
      };

      const mockSupabaseFrom = vi.mocked(supabase.from);
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedTask,
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await DatabaseService.updateTask('task-123', {
        title: '更新されたタスク',
        status: 'in_progress',
        priority: 'high',
      });

      expect(result).toEqual(mockUpdatedTask);
    });
  });

  describe('タグ関連操作', () => {
    test('createTag: 新しいタグを作成できる', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockTag: Tag = {
        id: 'tag-123',
        user_id: 'user-123',
        name: '開発',
        color: '#3B82F6',
        usage_count: 0,
        created_at: '2024-12-28T12:00:00Z',
      };

      const mockSupabaseAuth = vi.mocked(supabase.auth);
      const mockSupabaseFrom = vi.mocked(supabase.from);

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTag,
            error: null,
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await DatabaseService.createTag('開発', '#3B82F6');

      expect(result).toEqual(mockTag);
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        name: '開発',
        color: '#3B82F6',
      });
    });

    test('createTag: 重複するタグ名の場合はエラーを投げる', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSupabaseAuth = vi.mocked(supabase.auth);
      const mockSupabaseFrom = vi.mocked(supabase.from);

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value' },
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
      } as any);

      await expect(
        DatabaseService.createTag('開発', '#3B82F6')
      ).rejects.toThrow('同じ名前のタグが既に存在します');
    });
  });

  describe('セッション関連操作', () => {
    test('createSession: 新しいセッションを作成できる', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession: Session = {
        id: 'session-123',
        user_id: 'user-123',
        task_id: 'task-123',
        type: 'pomodoro',
        planned_duration: 25,
        actual_duration: 25,
        completed: false,
        started_at: '2024-12-28T12:00:00Z',
      };

      const mockSupabaseAuth = vi.mocked(supabase.auth);
      const mockSupabaseFrom = vi.mocked(supabase.from);

      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockSession,
            error: null,
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await DatabaseService.createSession({
        task_id: 'task-123',
        type: 'pomodoro',
        planned_duration: 25,
      });

      expect(result).toEqual(mockSession);
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        task_id: 'task-123',
        type: 'pomodoro',
        planned_duration: 25,
      });
    });

    test('getSessionStats: セッション統計を取得できる', async () => {
      const mockSessions: Session[] = [
        {
          id: 'session-1',
          user_id: 'user-123',
          type: 'pomodoro',
          planned_duration: 25,
          actual_duration: 25,
          completed: true,
          started_at: '2024-12-28T12:00:00Z',
          completed_at: '2024-12-28T12:25:00Z',
        },
        {
          id: 'session-2',
          user_id: 'user-123',
          type: 'pomodoro',
          planned_duration: 25,
          actual_duration: 23,
          completed: true,
          started_at: '2024-12-28T13:00:00Z',
          completed_at: '2024-12-28T13:23:00Z',
        },
        {
          id: 'session-3',
          user_id: 'user-123',
          type: 'short_break',
          planned_duration: 5,
          actual_duration: 5,
          completed: true,
          started_at: '2024-12-28T13:25:00Z',
          completed_at: '2024-12-28T13:30:00Z',
        },
      ];

      const mockSupabaseFrom = vi.mocked(supabase.from);
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockSessions,
          error: null,
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await DatabaseService.getSessionStats();

      expect(result).toEqual({
        totalSessions: 3,
        pomodoroSessions: 2,
        totalWorkTime: 48, // 25 + 23
        averageSessionLength: expect.closeTo(17.67, 0.01), // (25 + 23 + 5) / 3 ≈ 17.67
      });
    });
  });

  describe('リアルタイム同期', () => {
    test('subscribeToTasks: タスクの変更を監視できる', () => {
      const mockCallback = vi.fn();
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      };

      const mockSupabaseChannel = vi.mocked(supabase.channel);
      mockSupabaseChannel.mockReturnValue(mockChannel as any);

      DatabaseService.subscribeToTasks(mockCallback);

      expect(mockSupabaseChannel).toHaveBeenCalledWith('tasks-changes');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        mockCallback
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });
  });

  describe('データベース接続テスト', () => {
    test('testConnection: 接続が成功する場合はtrueを返す', async () => {
      const mockSupabaseFrom = vi.mocked(supabase.from);
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await DatabaseService.testConnection();

      expect(result).toBe(true);
    });

    test('testConnection: 接続が失敗する場合はfalseを返す', async () => {
      const mockSupabaseFrom = vi.mocked(supabase.from);
      const mockSelect = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' },
        }),
      });

      mockSupabaseFrom.mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await DatabaseService.testConnection();

      expect(result).toBe(false);
    });
  });
});
