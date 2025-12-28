import { supabase } from './supabase';
import type { Database } from '../types/database';
import type {
  User,
  Task,
  Tag,
  Session,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../types';

/**
 * データベース操作を統一するサービスクラス
 * Supabaseとの連携を抽象化し、将来のAWS移行に備える
 */
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  // ユーザー関連操作
  static async createUser(
    userData: Database['public']['Tables']['users']['Insert']
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw new Error(`ユーザー作成エラー: ${error.message}`);
    }

    return data;
  }

  static async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // ユーザーが見つからない場合
      }
      throw new Error(`ユーザー取得エラー: ${error.message}`);
    }

    return data;
  }

  static async updateUser(
    id: string,
    updates: Database['public']['Tables']['users']['Update']
  ): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`ユーザー更新エラー: ${error.message}`);
    }

    return data;
  }

  // タスク関連操作
  static async createTask(taskData: CreateTaskRequest): Promise<Task> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    const insertData: Database['public']['Tables']['tasks']['Insert'] = {
      user_id: user.id,
      title: taskData.title,
      description: taskData.description,
      estimated_pomodoros: taskData.estimated_pomodoros || 1,
      completed_pomodoros: 0,
      status: 'pending',
      priority: taskData.priority || 'medium',
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`タスク作成エラー: ${error.message}`);
    }

    return data;
  }

  async getTasks(filters?: {
    status?: Task['status'];
    priority?: Task['priority'];
    limit?: number;
  }): Promise<Task[]> {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`タスク取得エラー: ${error.message}`);
    }

    return data || [];
  }

  static async getTaskById(id: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // タスクが見つからない場合
      }
      throw new Error(`タスク取得エラー: ${error.message}`);
    }

    return data;
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<Task> {
    const updateData: Database['public']['Tables']['tasks']['Update'] = {
      ...updates,
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`タスク更新エラー: ${error.message}`);
    }

    return data;
  }

  static async deleteTask(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (error) {
      throw new Error(`タスク削除エラー: ${error.message}`);
    }
  }

  // タグ関連操作
  static async createTag(name: string, color: string): Promise<Tag> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name,
        color,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('同じ名前のタグが既に存在します');
      }
      throw new Error(`タグ作成エラー: ${error.message}`);
    }

    return data;
  }

  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(`タグ取得エラー: ${error.message}`);
    }

    return data || [];
  }

  static async updateTag(
    id: string,
    updates: { name?: string; color?: string }
  ): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`タグ更新エラー: ${error.message}`);
    }

    return data;
  }

  static async deleteTag(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);

    if (error) {
      throw new Error(`タグ削除エラー: ${error.message}`);
    }
  }

  // タスク-タグ関連操作
  static async addTagToTask(taskId: string, tagId: string): Promise<void> {
    const { error } = await supabase.from('task_tags').insert({
      task_id: taskId,
      tag_id: tagId,
    });

    if (error) {
      if (error.code === '23505') {
        throw new Error('このタグは既にタスクに追加されています');
      }
      throw new Error(`タグ追加エラー: ${error.message}`);
    }

    // タグの使用頻度を増やす
    try {
      await supabase.rpc('increment_tag_usage', { tag_id: tagId });
    } catch (err) {
      // 使用頻度の更新に失敗しても、タグの追加は成功とする
      console.warn('タグ使用頻度の更新に失敗:', err);
    }
  }

  static async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) {
      throw new Error(`タグ削除エラー: ${error.message}`);
    }

    // タグの使用頻度を減らす
    try {
      await supabase.rpc('decrement_tag_usage', { tag_id: tagId });
    } catch (err) {
      // 使用頻度の更新に失敗しても、タグの削除は成功とする
      console.warn('タグ使用頻度の更新に失敗:', err);
    }
  }

  static async getTasksWithTags(): Promise<(Task & { tags: Tag[] })[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        task_tags (
          tags (*)
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`タスク・タグ取得エラー: ${error.message}`);
    }

    // データ構造を整形
    return (data || []).map(task => ({
      ...task,
      tags:
        task.task_tags?.map((tt: { tags: Tag }) => tt.tags).filter(Boolean) ||
        [],
    }));
  }

  // セッション関連操作
  async createSession(sessionData: {
    user_id: string;
    task_id?: string;
    type: Session['type'];
    planned_duration: number;
    actual_duration: number;
    completed: boolean;
    started_at: string;
  }): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw new Error(`セッション作成エラー: ${error.message}`);
    }

    return data;
  }

  async updateSession(
    id: string,
    updates: {
      actual_duration?: number;
      completed?: boolean;
      completed_at?: string;
      task_completion_status?: Session['task_completion_status'];
    }
  ): Promise<Session> {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`セッション更新エラー: ${error.message}`);
    }

    return data;
  }

  static async getSessions(filters?: {
    type?: Session['type'];
    completed?: boolean;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Session[]> {
    let query = supabase
      .from('sessions')
      .select('*')
      .order('started_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.completed !== undefined) {
      query = query.eq('completed', filters.completed);
    }

    if (filters?.startDate) {
      query = query.gte('started_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('started_at', filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`セッション取得エラー: ${error.message}`);
    }

    return data || [];
  }

  // タスク分割関連操作
  static async suggestTaskSplit(
    task: Task
  ): Promise<Array<{ title: string; estimated_pomodoros: number }>> {
    const estimatedPomodoros = task.estimated_pomodoros;

    if (estimatedPomodoros <= 1) {
      return [];
    }

    // 基本的な分割提案を生成
    const suggestions = [];

    // 1ポモドーロずつに分割する提案
    for (let i = 1; i <= estimatedPomodoros; i++) {
      suggestions.push({
        title: `${task.title} - パート${i}`,
        estimated_pomodoros: 1,
      });
    }

    return suggestions;
  }

  static async splitTask(
    originalTask: Task,
    subtasks: Array<{ title: string; estimated_pomodoros: number }>
  ): Promise<Task[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    // 各サブタスクが1ポモドーロ以内かチェック
    const invalidSubtasks = subtasks.filter(st => st.estimated_pomodoros > 1);
    if (invalidSubtasks.length > 0) {
      throw new Error(
        '各サブタスクは1ポモドーロ以内で完了可能である必要があります'
      );
    }

    try {
      // トランザクション的な処理のため、エラーが発生した場合は全てロールバック
      const createdSubtasks: Task[] = [];

      // 元のタスクを完了状態に変更
      await this.updateTask(originalTask.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // サブタスクを作成
      for (const subtaskData of subtasks) {
        const createRequest: CreateTaskRequest = {
          title: subtaskData.title.trim(),
          description: `元のタスク「${originalTask.title}」から分割されたサブタスク`,
          estimated_pomodoros: subtaskData.estimated_pomodoros,
          priority: originalTask.priority,
        };

        const createdSubtask = await this.createTask(createRequest);
        createdSubtasks.push(createdSubtask);
      }

      return createdSubtasks;
    } catch (error) {
      // エラーが発生した場合、元のタスクの状態を元に戻す
      try {
        await this.updateTask(originalTask.id, {
          status: originalTask.status,
          completed_at: originalTask.completed_at,
        });
      } catch (rollbackError) {
        console.error('ロールバックに失敗:', rollbackError);
      }

      throw error;
    }
  }
  static async getSessionStats(dateRange?: { start: string; end: string }) {
    let query = supabase.from('sessions').select('*').eq('completed', true);

    if (dateRange) {
      query = query
        .gte('completed_at', dateRange.start)
        .lte('completed_at', dateRange.end);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`統計取得エラー: ${error.message}`);
    }

    const sessions = data || [];

    return {
      totalSessions: sessions.length,
      pomodoroSessions: sessions.filter(s => s.type === 'pomodoro').length,
      totalWorkTime: sessions
        .filter(s => s.type === 'pomodoro')
        .reduce((sum, s) => sum + (s.actual_duration || 0), 0),
      averageSessionLength:
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0) /
            sessions.length
          : 0,
    };
  }

  // リアルタイム同期
  static subscribeToTasks(
    callback: (payload: { eventType: string; new: Task; old: Task }) => void
  ) {
    return supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        callback
      )
      .subscribe();
  }

  static subscribeToSessions(
    callback: (payload: {
      eventType: string;
      new: Session;
      old: Session;
    }) => void
  ) {
    return supabase
      .channel('sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        callback
      )
      .subscribe();
  }

  // データベース接続テスト
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase.from('users').select('count').limit(1);

      return !error;
    } catch (error) {
      console.error('データベース接続テストエラー:', error);
      return false;
    }
  }
}
