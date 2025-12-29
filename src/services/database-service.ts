import { supabase } from './supabase';
import type {
  User,
  Task,
  Tag,
  Session,
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../types';
import { RealtimeSyncService } from './realtime-sync-service';
import { errorHandler } from './error-handler';
import { monitoringService } from './monitoring-service';

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

  // Supabaseクライアントを安全に取得するヘルパー
  private static getSupabaseClient() {
    if (!supabase) {
      const error = new Error(
        'Supabaseが初期化されていません（デモモードまたは設定エラー）'
      );
      errorHandler.handleError(error, {
        type: 'database',
        severity: 'critical',
        context: { service: 'DatabaseService', method: 'getSupabaseClient' },
      });
      throw error;
    }
    return supabase;
  }
  // ユーザー関連操作
  static async createUser(userData: any): Promise<User> {
    const startTime = performance.now();

    try {
      const client = DatabaseService.getSupabaseClient();

      const { data, error } = await (client as any)
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) {
        throw new Error(`ユーザー作成エラー: ${error.message}`);
      }

      // 成功時の監視記録
      monitoringService.recordApiCall(
        'createUser',
        performance.now() - startTime
      );
      monitoringService.recordUserActivity({
        action: 'user_created',
        component: 'DatabaseService',
        metadata: { userId: data.id },
      });

      return data;
    } catch (error) {
      await errorHandler.handleDatabaseError(error as Error, undefined, {
        method: 'createUser',
        userData: { ...userData, password: '[REDACTED]' }, // パスワードは記録しない
      });
      throw error;
    }
  }

  static async getUserById(id: string): Promise<User | null> {
    const startTime = performance.now();

    try {
      const client = DatabaseService.getSupabaseClient();

      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', id as any)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // ユーザーが見つからない場合
        }
        throw new Error(`ユーザー取得エラー: ${error.message}`);
      }

      // 成功時の監視記録
      monitoringService.recordApiCall(
        'getUserById',
        performance.now() - startTime
      );

      return data as User;
    } catch (error) {
      await errorHandler.handleDatabaseError(error as Error, undefined, {
        method: 'getUserById',
        userId: id,
      });
      throw error;
    }
  }

  static async updateUser(id: string, updates: any): Promise<User> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await (client as any)
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
    console.log('DatabaseService.createTask 開始:', taskData);

    // デモモードの場合は直接オフライン処理を実行
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('デモモードでタスク作成');
      const realtimeService = RealtimeSyncService.getInstance();

      // デモユーザーIDを使用
      const offlineTaskData = {
        user_id: 'demo-user-id',
        title: taskData.title,
        description: taskData.description,
        estimated_pomodoros: taskData.estimated_pomodoros || 1,
        priority: taskData.priority || 'medium',
      };

      console.log('デモモードタスクデータ:', offlineTaskData);
      const result = await realtimeService.createTaskOffline(offlineTaskData);
      console.log('デモモードタスク作成結果:', result);
      return result;
    }

    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はローカルで作成
    if (!realtimeService.isNetworkOnline()) {
      console.log('オフラインモードでタスク作成');
      const {
        data: { user },
      } = await DatabaseService.getSupabaseClient().auth.getUser();

      console.log('認証ユーザー:', user);
      if (!user) {
        throw new Error('認証が必要です');
      }

      const offlineTaskData = {
        user_id: user.id,
        title: taskData.title,
        description: taskData.description,
        estimated_pomodoros: taskData.estimated_pomodoros || 1,
        priority: taskData.priority || 'medium',
      };

      console.log('オフラインタスクデータ:', offlineTaskData);
      const result = await realtimeService.createTaskOffline(offlineTaskData);
      console.log('オフラインタスク作成結果:', result);
      return result;
    }

    console.log('オンラインモードでタスク作成');
    const client = DatabaseService.getSupabaseClient();

    const {
      data: { user },
    } = await client.auth.getUser();

    console.log('認証ユーザー:', user);
    if (!user) {
      throw new Error('認証が必要です');
    }

    const insertData: any = {
      user_id: user.id,
      title: taskData.title,
      description: taskData.description,
      estimated_pomodoros: taskData.estimated_pomodoros || 1,
      completed_pomodoros: 0,
      status: 'pending',
      priority: taskData.priority || 'medium',
    };

    console.log('データベース挿入データ:', insertData);
    const { data, error } = await (client as any)
      .from('tasks')
      .insert([insertData])
      .select()
      .single();

    console.log('データベース挿入結果:', { data, error });
    if (error) {
      throw new Error(`タスク作成エラー: ${error.message}`);
    }

    return data;
  }

  static async getTasks(filters?: {
    status?: Task['status'];
    priority?: Task['priority'];
    limit?: number;
    tagId?: string;
  }): Promise<(Task & { tags: Tag[] })[]> {
    // デモモードの場合は直接キャッシュから取得
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('デモモードでタスク取得');
      const realtimeService = RealtimeSyncService.getInstance();
      let tasks = realtimeService.getTasksFromCache();

      // フィルタリングを適用
      if (filters?.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
      if (filters?.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }
      if (filters?.limit) {
        tasks = tasks.slice(0, filters.limit);
      }

      // タグ情報を追加（デモモードでは空配列）
      return tasks.map(task => ({ ...task, tags: [] }));
    }

    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はキャッシュから取得
    if (!realtimeService.isNetworkOnline()) {
      let tasks = realtimeService.getTasksFromCache();

      // フィルタリングを適用
      if (filters?.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
      if (filters?.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }
      if (filters?.limit) {
        tasks = tasks.slice(0, filters.limit);
      }

      return tasks.map(task => ({ ...task, tags: [] })); // オフライン時はタグ情報なし
    }

    const client = DatabaseService.getSupabaseClient();

    let query = client
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

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    // タグIDでフィルタリング
    if (filters?.tagId) {
      query = query.eq('task_tags.tag_id', filters.tagId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`タスク取得エラー: ${error.message}`);
    }

    // データ構造を整形
    const tasks = (data || []).map((task: any) => ({
      ...task,
      tags:
        task.task_tags?.map((tt: { tags: Tag }) => tt.tags).filter(Boolean) ||
        [],
    }));

    // オンライン時はキャッシュも更新
    tasks.forEach(task => {
      realtimeService.updateLocalTaskCache({
        eventType: 'INSERT',
        new: task,
        old: {} as Task,
      });
    });

    return tasks;
  }

  static async getTask(id: string): Promise<Task | null> {
    return await DatabaseService.getTaskById(id);
  }

  static async getSession(id: string): Promise<Session | null> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await client
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // セッションが見つからない
      }
      throw new Error(`セッション取得エラー: ${error.message}`);
    }

    return data;
  }

  static async getTag(id: string): Promise<Tag | null> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await client
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // タグが見つからない
      }
      throw new Error(`タグ取得エラー: ${error.message}`);
    }

    return data;
  }

  static async getTaskById(id: string): Promise<Task | null> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await client
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

  static async updateTask(
    id: string,
    updates: UpdateTaskRequest
  ): Promise<Task> {
    // デモモードの場合は直接オフライン処理を実行
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('デモモードでタスク更新:', id, updates);
      const realtimeService = RealtimeSyncService.getInstance();
      return realtimeService.updateTaskOffline(id, updates);
    }

    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はローカルで更新
    if (!realtimeService.isNetworkOnline()) {
      return realtimeService.updateTaskOffline(id, updates);
    }

    const client = DatabaseService.getSupabaseClient();

    const updateData: any = {
      ...updates,
    };

    const { data, error } = await (client as any)
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
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client.from('tasks').delete().eq('id', id);

    if (error) {
      throw new Error(`タスク削除エラー: ${error.message}`);
    }
  }

  // タグ関連操作
  static async createTag(tagData: {
    name: string;
    color: string;
    created_at: string;
  }): Promise<Tag> {
    const client = DatabaseService.getSupabaseClient();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    const { data, error } = await (client as any)
      .from('tags')
      .insert([
        {
          user_id: user.id,
          name: tagData.name,
          color: tagData.color,
        },
      ])
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

  static async getTags(): Promise<Tag[]> {
    // デモモードの場合は空配列を返す（タグ機能は簡略化）
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('デモモードでタグ取得をスキップ');
      return [];
    }

    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await client
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
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await (client as any)
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
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client.from('tags').delete().eq('id', id);

    if (error) {
      throw new Error(`タグ削除エラー: ${error.message}`);
    }
  }

  // タスク-タグ関連操作
  static async addTagToTask(taskId: string, tagId: string): Promise<void> {
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client.from('task_tags').insert({
      task_id: taskId,
      tag_id: tagId,
    } as any);

    if (error) {
      if (error.code === '23505') {
        throw new Error('このタグは既にタスクに追加されています');
      }
      throw new Error(`タグ追加エラー: ${error.message}`);
    }

    // タグの使用頻度を増やす
    try {
      await client.rpc('increment_tag_usage', { tag_id: tagId } as any);
    } catch (err) {
      // 使用頻度の更新に失敗しても、タグの追加は成功とする
      console.warn('タグ使用頻度の更新に失敗:', err);
    }
  }

  static async removeTagFromTask(taskId: string, tagId: string): Promise<void> {
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client
      .from('task_tags')
      .delete()
      .eq('task_id', taskId)
      .eq('tag_id', tagId);

    if (error) {
      throw new Error(`タグ削除エラー: ${error.message}`);
    }

    // タグの使用頻度を減らす
    try {
      await client.rpc('decrement_tag_usage', { tag_id: tagId } as any);
    } catch (err) {
      // 使用頻度の更新に失敗しても、タグの削除は成功とする
      console.warn('タグ使用頻度の更新に失敗:', err);
    }
  }

  // タスクのタグを一括更新
  static async updateTaskTags(taskId: string, tagIds: string[]): Promise<void> {
    // デモモードの場合は何もしない（タグ機能は簡略化）
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      console.log('デモモードでタグ更新をスキップ:', taskId, tagIds);
      return;
    }

    const client = DatabaseService.getSupabaseClient();

    // 既存のタグ関連付けを削除
    const { error: deleteError } = await client
      .from('task_tags')
      .delete()
      .eq('task_id', taskId);

    if (deleteError) {
      throw new Error(`既存タグ削除エラー: ${deleteError.message}`);
    }

    // 新しいタグ関連付けを追加
    if (tagIds.length > 0) {
      const insertData = tagIds.map(tagId => ({
        task_id: taskId,
        tag_id: tagId,
      }));

      const { error: insertError } = await client
        .from('task_tags')
        .insert(insertData as any);

      if (insertError) {
        throw new Error(`新規タグ追加エラー: ${insertError.message}`);
      }
    }
  }

  static async getTasksWithTags(): Promise<(Task & { tags: Tag[] })[]> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await client
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
    return (data || []).map((task: any) => ({
      ...task,
      tags:
        task.task_tags?.map((tt: { tags: Tag }) => tt.tags).filter(Boolean) ||
        [],
    }));
  }

  // セッション関連操作
  static async createSession(sessionData: {
    user_id: string;
    task_id?: string;
    type: Session['type'];
    planned_duration: number;
    actual_duration: number;
    completed: boolean;
    started_at: string;
    mode: 'task-based' | 'standalone';
    session_name?: string;
  }): Promise<Session> {
    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はローカルで作成
    if (!realtimeService.isNetworkOnline()) {
      return realtimeService.createSessionOffline(sessionData);
    }

    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await (client as any)
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      throw new Error(`セッション作成エラー: ${error.message}`);
    }

    return data;
  }

  static async updateSession(
    id: string,
    updates: {
      actual_duration?: number;
      completed?: boolean;
      completed_at?: string;
      task_completion_status?: Session['task_completion_status'];
      task_id?: string;
      mode?: 'task-based' | 'standalone';
      session_name?: string;
    }
  ): Promise<Session> {
    const client = DatabaseService.getSupabaseClient();

    const { data, error } = await (client as any)
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
    const client = DatabaseService.getSupabaseClient();

    let query = client
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
    const client = DatabaseService.getSupabaseClient();

    const {
      data: { user },
    } = await client.auth.getUser();

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
      await DatabaseService.updateTask(originalTask.id, {
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

        const createdSubtask = await DatabaseService.createTask(createRequest);
        createdSubtasks.push(createdSubtask);
      }

      return createdSubtasks;
    } catch (error) {
      // エラーが発生した場合、元のタスクの状態を元に戻す
      try {
        await DatabaseService.updateTask(originalTask.id, {
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
    const client = DatabaseService.getSupabaseClient();

    let query = client.from('sessions').select('*').eq('completed', true);

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
      pomodoroSessions: sessions.filter((s: any) => s.type === 'pomodoro')
        .length,
      totalWorkTime: sessions
        .filter((s: any) => s.type === 'pomodoro')
        .reduce((sum: number, s: any) => sum + (s.actual_duration || 0), 0),
      averageSessionLength:
        sessions.length > 0
          ? sessions.reduce(
              (sum: number, s: any) => sum + (s.actual_duration || 0),
              0
            ) / sessions.length
          : 0,
    };
  }

  // 統計機能用の追加メソッド
  static async getCompletedTasksCount(dateRange?: {
    start: string;
    end: string;
  }): Promise<number> {
    const client = DatabaseService.getSupabaseClient();

    let query = client
      .from('tasks')
      .select('id', { count: 'exact' })
      .eq('status', 'completed');

    if (dateRange) {
      query = query
        .gte('completed_at', dateRange.start)
        .lte('completed_at', dateRange.end);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`完了タスク数取得エラー: ${error.message}`);
    }

    return count || 0;
  }

  static async getDailySessionStats(days: number = 7): Promise<
    Array<{
      date: string;
      sessions: number;
      workTime: number;
      completedTasks: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // セッションデータを取得
    const sessions = await DatabaseService.getSessions({
      startDate: startDate.toISOString(),
      completed: true,
    });

    // タスクデータを取得
    const tasks = await DatabaseService.getTasks({
      status: 'completed',
    });

    // 日付別にデータを集計
    const statsByDate: Record<
      string,
      {
        sessions: number;
        workTime: number;
        completedTasks: number;
      }
    > = {};

    // 指定された日数分の日付を初期化
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      statsByDate[dateKey] = { sessions: 0, workTime: 0, completedTasks: 0 };
    }

    // セッションデータを集計
    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.completed_at || session.started_at);
      const dateKey = sessionDate.toISOString().split('T')[0];

      if (statsByDate[dateKey]) {
        statsByDate[dateKey].sessions += 1;
        if (session.type === 'pomodoro') {
          statsByDate[dateKey].workTime += Math.round(
            (session.actual_duration || 0) / 60
          );
        }
      }
    });

    // タスクデータを集計
    tasks.forEach(task => {
      if (task.completed_at) {
        const taskDate = new Date(task.completed_at);
        const dateKey = taskDate.toISOString().split('T')[0];

        if (statsByDate[dateKey]) {
          statsByDate[dateKey].completedTasks += 1;
        }
      }
    });

    // 結果を配列に変換
    return Object.entries(statsByDate).map(([date, stats]) => ({
      date,
      ...stats,
    }));
  }

  // 詳細分析機能用のメソッド（要件3.6-3.11対応）

  /**
   * 作業時間グラフ用のデータを取得（要件3.7）
   */
  static async getWorkTimeGraphData(days: number = 30): Promise<
    Array<{
      date: string;
      workTime: number; // 分単位
      sessionCount: number;
    }>
  > {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
      startDate: startDate.toISOString(),
    });

    // 日付別にデータを集計
    const dataByDate: Record<
      string,
      { workTime: number; sessionCount: number }
    > = {};

    // 指定された日数分の日付を初期化
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dataByDate[dateKey] = { workTime: 0, sessionCount: 0 };
    }

    // セッションデータを集計
    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.completed_at || session.started_at);
      const dateKey = sessionDate.toISOString().split('T')[0];

      if (dataByDate[dateKey]) {
        dataByDate[dateKey].workTime += Math.round(
          (session.actual_duration || 0) / 60
        ); // 秒を分に変換
        dataByDate[dateKey].sessionCount += 1;
      }
    });

    return Object.entries(dataByDate).map(([date, data]) => ({
      date,
      workTime: data.workTime,
      sessionCount: data.sessionCount,
    }));
  }

  /**
   * タスク種類別内訳データを取得（要件3.8）
   */
  static async getTaskTypeBreakdown(): Promise<
    Array<{
      priority: string;
      count: number;
      completedCount: number;
      totalWorkTime: number; // 分単位
    }>
  > {
    const tasks = await DatabaseService.getTasks();

    // 優先度別に集計
    const breakdown: Record<
      string,
      {
        count: number;
        completedCount: number;
        totalWorkTime: number;
      }
    > = {
      high: { count: 0, completedCount: 0, totalWorkTime: 0 },
      medium: { count: 0, completedCount: 0, totalWorkTime: 0 },
      low: { count: 0, completedCount: 0, totalWorkTime: 0 },
    };

    // セッションデータも取得してタスクごとの作業時間を計算
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
    });

    // タスクIDごとの作業時間を計算
    const workTimeByTask: Record<string, number> = {};
    sessions.forEach((session: any) => {
      if (session.task_id) {
        workTimeByTask[session.task_id] =
          (workTimeByTask[session.task_id] || 0) +
          Math.round((session.actual_duration || 0) / 60);
      }
    });

    tasks.forEach(task => {
      const priority = task.priority || 'medium';
      breakdown[priority].count += 1;

      if (task.status === 'completed') {
        breakdown[priority].completedCount += 1;
      }

      breakdown[priority].totalWorkTime += workTimeByTask[task.id] || 0;
    });

    return Object.entries(breakdown).map(([priority, data]) => ({
      priority,
      ...data,
    }));
  }

  /**
   * 連続作業日数と最長記録を取得（要件3.9）
   */
  static async getWorkStreakData(): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakHistory: Array<{ startDate: string; endDate: string; days: number }>;
  }> {
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
    });

    if (sessions.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakHistory: [],
      };
    }

    // 日付別にセッションがあるかを確認
    const workDates = new Set<string>();
    sessions.forEach((session: any) => {
      const date = new Date(session.completed_at || session.started_at);
      workDates.add(date.toISOString().split('T')[0]);
    });

    const sortedDates = Array.from(workDates).sort();

    // 連続作業日数を計算
    const streaks: Array<{ startDate: string; endDate: string; days: number }> =
      [];
    let currentStreakStart = sortedDates[0];
    let currentStreakEnd = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currentDate = new Date(sortedDates[i]);
      const dayDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        // 連続している
        currentStreakEnd = sortedDates[i];
      } else {
        // 連続が途切れた
        const days =
          Math.floor(
            (new Date(currentStreakEnd).getTime() -
              new Date(currentStreakStart).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;
        streaks.push({
          startDate: currentStreakStart,
          endDate: currentStreakEnd,
          days,
        });
        currentStreakStart = sortedDates[i];
        currentStreakEnd = sortedDates[i];
      }
    }

    // 最後のストリークを追加
    const days =
      Math.floor(
        (new Date(currentStreakEnd).getTime() -
          new Date(currentStreakStart).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    streaks.push({
      startDate: currentStreakStart,
      endDate: currentStreakEnd,
      days,
    });

    // 現在のストリークを計算
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    if (workDates.has(today)) {
      // 今日作業している場合
      const lastStreak = streaks[streaks.length - 1];
      if (lastStreak.endDate === today) {
        currentStreak = lastStreak.days;
      }
    } else if (workDates.has(yesterdayStr)) {
      // 昨日まで作業していた場合
      const lastStreak = streaks[streaks.length - 1];
      if (lastStreak.endDate === yesterdayStr) {
        currentStreak = lastStreak.days;
      }
    }

    const longestStreak = Math.max(...streaks.map(s => s.days), 0);

    return {
      currentStreak,
      longestStreak,
      streakHistory: streaks,
    };
  }

  /**
   * 平均セッション完了率を計算（要件3.10）
   */
  static async getSessionCompletionRate(days: number = 30): Promise<{
    completionRate: number; // パーセンテージ
    totalSessions: number;
    completedSessions: number;
    averageSessionLength: number; // 分単位
    focusScore: number; // 集中度指標（0-100）
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allSessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      startDate: startDate.toISOString(),
    });

    const completedSessions = allSessions.filter((s: any) => s.completed);
    const totalSessions = allSessions.length;
    const completionRate =
      totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

    // 平均セッション長を計算
    const totalDuration = completedSessions.reduce(
      (sum: number, s: any) => sum + (s.actual_duration || 0),
      0
    );
    const averageSessionLength =
      completedSessions.length > 0
        ? Math.round(totalDuration / completedSessions.length / 60)
        : 0;

    // 集中度指標を計算（計画時間に対する実際の完了率）
    let focusScore = 0;
    if (completedSessions.length > 0) {
      const plannedVsActual = completedSessions.map((s: any) => {
        const planned = s.planned_duration || 1500; // デフォルト25分
        const actual = s.actual_duration || 0;
        return Math.min(actual / planned, 1); // 100%を上限とする
      });
      focusScore = Math.round(
        (plannedVsActual.reduce(
          (sum: number, ratio: number) => sum + ratio,
          0
        ) /
          plannedVsActual.length) *
          100
      );
    }

    return {
      completionRate: Math.round(completionRate * 100) / 100,
      totalSessions,
      completedSessions: completedSessions.length,
      averageSessionLength,
      focusScore,
    };
  }

  /**
   * タグ別統計データを取得（要件3.12, 3.17）
   */
  static async getTagStatistics(): Promise<
    Array<{
      tagId: string;
      tagName: string;
      tagColor: string;
      completedTasks: number;
      totalWorkTime: number; // 分単位
      sessionCount: number;
      averageTaskCompletion: number; // パーセンテージ
    }>
  > {
    // タグ付きタスクを取得
    const tasksWithTags = await DatabaseService.getTasksWithTags();

    // セッションデータを取得
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
    });

    // タスクIDごとの作業時間を計算
    const workTimeByTask: Record<string, number> = {};
    const sessionCountByTask: Record<string, number> = {};

    sessions.forEach((session: any) => {
      if (session.task_id) {
        workTimeByTask[session.task_id] =
          (workTimeByTask[session.task_id] || 0) +
          Math.round((session.actual_duration || 0) / 60);
        sessionCountByTask[session.task_id] =
          (sessionCountByTask[session.task_id] || 0) + 1;
      }
    });

    // タグ別に統計を集計
    const tagStats: Record<
      string,
      {
        tagId: string;
        tagName: string;
        tagColor: string;
        completedTasks: number;
        totalTasks: number;
        totalWorkTime: number;
        sessionCount: number;
      }
    > = {};

    tasksWithTags.forEach(task => {
      task.tags.forEach(tag => {
        if (!tagStats[tag.id]) {
          tagStats[tag.id] = {
            tagId: tag.id,
            tagName: tag.name,
            tagColor: tag.color,
            completedTasks: 0,
            totalTasks: 0,
            totalWorkTime: 0,
            sessionCount: 0,
          };
        }

        tagStats[tag.id].totalTasks += 1;

        if (task.status === 'completed') {
          tagStats[tag.id].completedTasks += 1;
        }

        tagStats[tag.id].totalWorkTime += workTimeByTask[task.id] || 0;
        tagStats[tag.id].sessionCount += sessionCountByTask[task.id] || 0;
      });
    });

    return Object.values(tagStats).map(stat => ({
      ...stat,
      averageTaskCompletion:
        stat.totalTasks > 0
          ? Math.round((stat.completedTasks / stat.totalTasks) * 100)
          : 0,
    }));
  }

  /**
   * 最も生産的なタグと時間帯の組み合わせを取得（要件3.13）
   */
  static async getMostProductiveTagTimeSlots(): Promise<{
    mostProductiveTag: string;
    bestTimeSlot: string;
    productivity: number; // セッション完了率
    tagTimeAnalysis: Array<{
      tagName: string;
      timeSlot: string;
      sessionCount: number;
      completionRate: number;
      averageWorkTime: number;
    }>;
  }> {
    // タグ付きタスクを取得
    const tasksWithTags = await DatabaseService.getTasksWithTags();

    // セッションデータを取得
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
    });

    // タスクIDとタグの関連を作成
    const taskTagMap: Record<string, Tag[]> = {};
    tasksWithTags.forEach(task => {
      taskTagMap[task.id] = task.tags;
    });

    // 時間帯別・タグ別の統計を集計
    const tagTimeStats: Record<
      string,
      Record<
        string,
        {
          sessionCount: number;
          completedSessions: number;
          totalWorkTime: number;
        }
      >
    > = {};

    sessions.forEach((session: any) => {
      if (!session.task_id || !taskTagMap[session.task_id]) return;

      const sessionDate = new Date(session.started_at);
      const hour = sessionDate.getHours();

      // 時間帯を分類
      let timeSlot: string;
      if (hour >= 6 && hour < 12) {
        timeSlot = '朝（6-12時）';
      } else if (hour >= 12 && hour < 18) {
        timeSlot = '昼（12-18時）';
      } else if (hour >= 18 && hour < 24) {
        timeSlot = '夜（18-24時）';
      } else {
        timeSlot = '深夜（0-6時）';
      }

      taskTagMap[session.task_id].forEach(tag => {
        if (!tagTimeStats[tag.name]) {
          tagTimeStats[tag.name] = {};
        }
        if (!tagTimeStats[tag.name][timeSlot]) {
          tagTimeStats[tag.name][timeSlot] = {
            sessionCount: 0,
            completedSessions: 0,
            totalWorkTime: 0,
          };
        }

        tagTimeStats[tag.name][timeSlot].sessionCount += 1;
        if (session.completed) {
          tagTimeStats[tag.name][timeSlot].completedSessions += 1;
        }
        tagTimeStats[tag.name][timeSlot].totalWorkTime += Math.round(
          (session.actual_duration || 0) / 60
        );
      });
    });

    // 分析結果を生成
    const tagTimeAnalysis: Array<{
      tagName: string;
      timeSlot: string;
      sessionCount: number;
      completionRate: number;
      averageWorkTime: number;
    }> = [];

    let bestProductivity = 0;
    let mostProductiveTag = '';
    let bestTimeSlot = '';

    Object.entries(tagTimeStats).forEach(([tagName, timeSlots]) => {
      Object.entries(timeSlots).forEach(([timeSlot, stats]) => {
        const completionRate =
          stats.sessionCount > 0
            ? (stats.completedSessions / stats.sessionCount) * 100
            : 0;

        const averageWorkTime =
          stats.completedSessions > 0
            ? Math.round(stats.totalWorkTime / stats.completedSessions)
            : 0;

        tagTimeAnalysis.push({
          tagName,
          timeSlot,
          sessionCount: stats.sessionCount,
          completionRate: Math.round(completionRate * 100) / 100,
          averageWorkTime,
        });

        // 最も生産的な組み合わせを更新
        if (completionRate > bestProductivity && stats.sessionCount >= 3) {
          bestProductivity = completionRate;
          mostProductiveTag = tagName;
          bestTimeSlot = timeSlot;
        }
      });
    });

    return {
      mostProductiveTag,
      bestTimeSlot,
      productivity: Math.round(bestProductivity * 100) / 100,
      tagTimeAnalysis: tagTimeAnalysis.sort(
        (a, b) => b.completionRate - a.completionRate
      ),
    };
  }

  /**
   * 時間帯別・曜日別の作業分布を取得（要件3.15）
   */
  static async getWorkDistributionByTimeAndDay(): Promise<{
    hourlyDistribution: Array<{
      hour: number;
      sessionCount: number;
      averageProductivity: number;
    }>;
    dailyDistribution: Array<{
      dayOfWeek: number; // 0=日曜日, 1=月曜日, ...
      dayName: string;
      sessionCount: number;
      averageWorkTime: number;
    }>;
    heatmapData: Array<{
      day: number;
      hour: number;
      sessionCount: number;
      productivity: number;
    }>;
  }> {
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
    });

    // 時間帯別統計
    const hourlyStats: Record<
      number,
      { sessionCount: number; completedSessions: number }
    > = {};

    // 曜日別統計
    const dailyStats: Record<
      number,
      { sessionCount: number; totalWorkTime: number }
    > = {};

    // ヒートマップ用データ
    const heatmapStats: Record<
      string,
      { sessionCount: number; completedSessions: number }
    > = {};

    // 初期化
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats[hour] = { sessionCount: 0, completedSessions: 0 };
    }

    for (let day = 0; day < 7; day++) {
      dailyStats[day] = { sessionCount: 0, totalWorkTime: 0 };
    }

    sessions.forEach((session: any) => {
      const sessionDate = new Date(session.started_at);
      const hour = sessionDate.getHours();
      const dayOfWeek = sessionDate.getDay();
      const heatmapKey = `${dayOfWeek}-${hour}`;

      // 時間帯別統計
      hourlyStats[hour].sessionCount += 1;
      if (session.completed) {
        hourlyStats[hour].completedSessions += 1;
      }

      // 曜日別統計
      dailyStats[dayOfWeek].sessionCount += 1;
      if (session.completed) {
        dailyStats[dayOfWeek].totalWorkTime += Math.round(
          (session.actual_duration || 0) / 60
        );
      }

      // ヒートマップ統計
      if (!heatmapStats[heatmapKey]) {
        heatmapStats[heatmapKey] = { sessionCount: 0, completedSessions: 0 };
      }
      heatmapStats[heatmapKey].sessionCount += 1;
      if (session.completed) {
        heatmapStats[heatmapKey].completedSessions += 1;
      }
    });

    // 結果を整形
    const hourlyDistribution = Object.entries(hourlyStats).map(
      ([hour, stats]) => ({
        hour: parseInt(hour),
        sessionCount: stats.sessionCount,
        averageProductivity:
          stats.sessionCount > 0
            ? Math.round(
                (stats.completedSessions / stats.sessionCount) * 100 * 100
              ) / 100
            : 0,
      })
    );

    const dayNames = [
      '日曜日',
      '月曜日',
      '火曜日',
      '水曜日',
      '木曜日',
      '金曜日',
      '土曜日',
    ];

    const dailyDistribution = Object.entries(dailyStats).map(
      ([day, stats]) => ({
        dayOfWeek: parseInt(day),
        dayName: dayNames[parseInt(day)],
        sessionCount: stats.sessionCount,
        averageWorkTime:
          stats.sessionCount > 0
            ? Math.round(stats.totalWorkTime / stats.sessionCount)
            : 0,
      })
    );

    const heatmapData = Object.entries(heatmapStats).map(([key, stats]) => {
      const [day, hour] = key.split('-').map(Number);
      return {
        day,
        hour,
        sessionCount: stats.sessionCount,
        productivity:
          stats.sessionCount > 0
            ? Math.round(
                (stats.completedSessions / stats.sessionCount) * 100 * 100
              ) / 100
            : 0,
      };
    });

    return {
      hourlyDistribution,
      dailyDistribution,
      heatmapData,
    };
  }

  /**
   * タスクカテゴリ別の時間配分を取得（要件3.16）
   */
  static async getTaskCategoryTimeDistribution(): Promise<{
    categoryData: Array<{
      tagName: string;
      tagColor: string;
      workTime: number; // 分単位
      sessionCount: number;
      percentage: number;
    }>;
    totalWorkTime: number;
    totalSessions: number;
  }> {
    const tagStats = await DatabaseService.getTagStatistics();

    const totalWorkTime = tagStats.reduce(
      (sum, stat) => sum + stat.totalWorkTime,
      0
    );
    const totalSessions = tagStats.reduce(
      (sum, stat) => sum + stat.sessionCount,
      0
    );

    const categoryData = tagStats.map(stat => ({
      tagName: stat.tagName,
      tagColor: stat.tagColor,
      workTime: stat.totalWorkTime,
      sessionCount: stat.sessionCount,
      percentage:
        totalWorkTime > 0
          ? Math.round((stat.totalWorkTime / totalWorkTime) * 100 * 100) / 100
          : 0,
    }));

    return {
      categoryData: categoryData.sort((a, b) => b.workTime - a.workTime),
      totalWorkTime,
      totalSessions,
    };
  }

  // リアルタイム同期
  static subscribeToTasks(
    callback: (payload: { eventType: string; new: Task; old: Task }) => void
  ) {
    const client = DatabaseService.getSupabaseClient();

    return client
      .channel('tasks-changes')
      .on(
        'postgres_changes' as any,
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
    const client = DatabaseService.getSupabaseClient();

    return client
      .channel('sessions-changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
        },
        callback
      )
      .subscribe();
  }

  // 目標設定・比較分析機能用のメソッド（要件3.18-3.21対応）

  /**
   * 週間・月間目標に対する進捗率を取得（要件3.18）
   */
  static async getGoalProgress(): Promise<{
    weeklyGoal: {
      targetHours: number;
      actualHours: number;
      progressPercentage: number;
      remainingHours: number;
    };
    monthlyGoal: {
      targetHours: number;
      actualHours: number;
      progressPercentage: number;
      remainingHours: number;
    };
  }> {
    // デフォルト目標値（後で設定機能で変更可能にする）
    const DEFAULT_WEEKLY_TARGET = 25; // 25時間/週
    const DEFAULT_MONTHLY_TARGET = 100; // 100時間/月

    // 今週の開始日と終了日を計算
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // 今月の開始日と終了日を計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // 週間セッションデータを取得
    const weeklySessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
      startDate: startOfWeek.toISOString(),
      endDate: endOfWeek.toISOString(),
    });

    // 月間セッションデータを取得
    const monthlySessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
      startDate: startOfMonth.toISOString(),
      endDate: endOfMonth.toISOString(),
    });

    // 週間実績時間を計算（分単位から時間単位に変換）
    const weeklyActualMinutes = weeklySessions.reduce(
      (sum: number, session: any) => sum + (session.actual_duration || 0),
      0
    );
    const weeklyActualHours =
      Math.round((weeklyActualMinutes / 60) * 100) / 100;

    // 月間実績時間を計算
    const monthlyActualMinutes = monthlySessions.reduce(
      (sum: number, session: any) => sum + (session.actual_duration || 0),
      0
    );
    const monthlyActualHours =
      Math.round((monthlyActualMinutes / 60) * 100) / 100;

    // 進捗率を計算
    const weeklyProgress = Math.min(
      Math.round((weeklyActualHours / DEFAULT_WEEKLY_TARGET) * 100),
      100
    );
    const monthlyProgress = Math.min(
      Math.round((monthlyActualHours / DEFAULT_MONTHLY_TARGET) * 100),
      100
    );

    return {
      weeklyGoal: {
        targetHours: DEFAULT_WEEKLY_TARGET,
        actualHours: weeklyActualHours,
        progressPercentage: weeklyProgress,
        remainingHours: Math.max(DEFAULT_WEEKLY_TARGET - weeklyActualHours, 0),
      },
      monthlyGoal: {
        targetHours: DEFAULT_MONTHLY_TARGET,
        actualHours: monthlyActualHours,
        progressPercentage: monthlyProgress,
        remainingHours: Math.max(
          DEFAULT_MONTHLY_TARGET - monthlyActualHours,
          0
        ),
      },
    };
  }

  /**
   * 前週・前月との比較データを取得（要件3.19）
   */
  static async getComparisonData(): Promise<{
    weeklyComparison: {
      currentWeek: {
        workHours: number;
        sessionCount: number;
        completedTasks: number;
      };
      previousWeek: {
        workHours: number;
        sessionCount: number;
        completedTasks: number;
      };
      changes: {
        workHoursChange: number; // パーセンテージ
        sessionCountChange: number;
        completedTasksChange: number;
      };
    };
    monthlyComparison: {
      currentMonth: {
        workHours: number;
        sessionCount: number;
        completedTasks: number;
      };
      previousMonth: {
        workHours: number;
        sessionCount: number;
        completedTasks: number;
      };
      changes: {
        workHoursChange: number; // パーセンテージ
        sessionCountChange: number;
        completedTasksChange: number;
      };
    };
  }> {
    const now = new Date();

    // 今週と前週の期間を計算
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    endOfThisWeek.setHours(23, 59, 59, 999);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
    endOfLastWeek.setHours(23, 59, 59, 999);

    // 今月と前月の期間を計算
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfThisMonth.setHours(23, 59, 59, 999);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    // データを並行取得
    const [
      thisWeekSessions,
      lastWeekSessions,
      thisMonthSessions,
      lastMonthSessions,
      thisWeekTasks,
      lastWeekTasks,
      thisMonthTasks,
      lastMonthTasks,
    ] = await Promise.all([
      DatabaseService.getSessions({
        type: 'pomodoro',
        completed: true,
        startDate: startOfThisWeek.toISOString(),
        endDate: endOfThisWeek.toISOString(),
      }),
      DatabaseService.getSessions({
        type: 'pomodoro',
        completed: true,
        startDate: startOfLastWeek.toISOString(),
        endDate: endOfLastWeek.toISOString(),
      }),
      DatabaseService.getSessions({
        type: 'pomodoro',
        completed: true,
        startDate: startOfThisMonth.toISOString(),
        endDate: endOfThisMonth.toISOString(),
      }),
      DatabaseService.getSessions({
        type: 'pomodoro',
        completed: true,
        startDate: startOfLastMonth.toISOString(),
        endDate: endOfLastMonth.toISOString(),
      }),
      DatabaseService.getTasks({ status: 'completed' }).then(tasks =>
        tasks.filter(
          task =>
            task.completed_at &&
            new Date(task.completed_at) >= startOfThisWeek &&
            new Date(task.completed_at) <= endOfThisWeek
        )
      ),
      DatabaseService.getTasks({ status: 'completed' }).then(tasks =>
        tasks.filter(
          task =>
            task.completed_at &&
            new Date(task.completed_at) >= startOfLastWeek &&
            new Date(task.completed_at) <= endOfLastWeek
        )
      ),
      DatabaseService.getTasks({ status: 'completed' }).then(tasks =>
        tasks.filter(
          task =>
            task.completed_at &&
            new Date(task.completed_at) >= startOfThisMonth &&
            new Date(task.completed_at) <= endOfThisMonth
        )
      ),
      DatabaseService.getTasks({ status: 'completed' }).then(tasks =>
        tasks.filter(
          task =>
            task.completed_at &&
            new Date(task.completed_at) >= startOfLastMonth &&
            new Date(task.completed_at) <= endOfLastMonth
        )
      ),
    ]);

    // 週間データを計算
    const thisWeekHours =
      Math.round(
        (thisWeekSessions.reduce(
          (sum: number, s: any) => sum + (s.actual_duration || 0),
          0
        ) /
          60) *
          100
      ) / 100;

    const lastWeekHours =
      Math.round(
        (lastWeekSessions.reduce(
          (sum: number, s: any) => sum + (s.actual_duration || 0),
          0
        ) /
          60) *
          100
      ) / 100;

    // 月間データを計算
    const thisMonthHours =
      Math.round(
        (thisMonthSessions.reduce(
          (sum: number, s: any) => sum + (s.actual_duration || 0),
          0
        ) /
          60) *
          100
      ) / 100;

    const lastMonthHours =
      Math.round(
        (lastMonthSessions.reduce(
          (sum: number, s: any) => sum + (s.actual_duration || 0),
          0
        ) /
          60) *
          100
      ) / 100;

    // 変化率を計算
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      weeklyComparison: {
        currentWeek: {
          workHours: thisWeekHours,
          sessionCount: thisWeekSessions.length,
          completedTasks: thisWeekTasks.length,
        },
        previousWeek: {
          workHours: lastWeekHours,
          sessionCount: lastWeekSessions.length,
          completedTasks: lastWeekTasks.length,
        },
        changes: {
          workHoursChange: calculateChange(thisWeekHours, lastWeekHours),
          sessionCountChange: calculateChange(
            thisWeekSessions.length,
            lastWeekSessions.length
          ),
          completedTasksChange: calculateChange(
            thisWeekTasks.length,
            lastWeekTasks.length
          ),
        },
      },
      monthlyComparison: {
        currentMonth: {
          workHours: thisMonthHours,
          sessionCount: thisMonthSessions.length,
          completedTasks: thisMonthTasks.length,
        },
        previousMonth: {
          workHours: lastMonthHours,
          sessionCount: lastMonthSessions.length,
          completedTasks: lastMonthTasks.length,
        },
        changes: {
          workHoursChange: calculateChange(thisMonthHours, lastMonthHours),
          sessionCountChange: calculateChange(
            thisMonthSessions.length,
            lastMonthSessions.length
          ),
          completedTasksChange: calculateChange(
            thisMonthTasks.length,
            lastMonthTasks.length
          ),
        },
      },
    };
  }

  /**
   * タグ別の時間推移グラフデータを取得（要件3.20）
   */
  static async getTagTrendData(days: number = 30): Promise<{
    trendData: Array<{
      date: string;
      tagData: Record<string, number>; // タグ名 -> 作業時間（分）
    }>;
    tagList: Array<{
      tagName: string;
      tagColor: string;
      totalHours: number;
    }>;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // タグ付きタスクを取得
    const tasksWithTags = await DatabaseService.getTasksWithTags();

    // セッションデータを取得
    const sessions = await DatabaseService.getSessions({
      type: 'pomodoro',
      completed: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // タスクIDとタグの関連を作成
    const taskTagMap: Record<string, Tag[]> = {};
    tasksWithTags.forEach(task => {
      taskTagMap[task.id] = task.tags;
    });

    // 日付別・タグ別の作業時間を集計
    const dateTagData: Record<string, Record<string, number>> = {};
    const tagTotals: Record<string, { color: string; totalMinutes: number }> =
      {};

    // 指定期間の全日付を初期化
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dateTagData[dateKey] = {};
    }

    sessions.forEach((session: any) => {
      if (!session.task_id || !taskTagMap[session.task_id]) return;

      const sessionDate = new Date(session.completed_at || session.started_at);
      const dateKey = sessionDate.toISOString().split('T')[0];
      const workMinutes = Math.round((session.actual_duration || 0) / 60);

      taskTagMap[session.task_id].forEach(tag => {
        // 日付別データ
        if (!dateTagData[dateKey]) {
          dateTagData[dateKey] = {};
        }
        dateTagData[dateKey][tag.name] =
          (dateTagData[dateKey][tag.name] || 0) + workMinutes;

        // タグ別合計
        if (!tagTotals[tag.name]) {
          tagTotals[tag.name] = { color: tag.color, totalMinutes: 0 };
        }
        tagTotals[tag.name].totalMinutes += workMinutes;
      });
    });

    // 結果を整形
    const trendData = Object.entries(dateTagData).map(([date, tagData]) => ({
      date,
      tagData,
    }));

    const tagList = Object.entries(tagTotals).map(([tagName, data]) => ({
      tagName,
      tagColor: data.color,
      totalHours: Math.round((data.totalMinutes / 60) * 100) / 100,
    }));

    return {
      trendData: trendData.sort((a, b) => a.date.localeCompare(b.date)),
      tagList: tagList.sort((a, b) => b.totalHours - a.totalHours),
    };
  }

  /**
   * 統計データをCSV形式でエクスポート（要件3.21）
   */
  static async exportStatisticsToCSV(): Promise<string> {
    // 基本統計データを取得
    const [sessions, tasks, tagStats, goalProgress, comparisonData] =
      await Promise.all([
        DatabaseService.getSessions({ completed: true }),
        DatabaseService.getTasks(),
        DatabaseService.getTagStatistics(),
        DatabaseService.getGoalProgress(),
        DatabaseService.getComparisonData(),
      ]);

    // CSVヘッダーとデータを構築
    const csvData: string[] = [];

    // セッション履歴
    csvData.push('=== セッション履歴 ===');
    csvData.push('日付,タイプ,計画時間(分),実際時間(分),完了状況,タスクID');
    sessions.forEach((session: any) => {
      const date = new Date(session.started_at).toLocaleDateString('ja-JP');
      const plannedMinutes = Math.round((session.planned_duration || 0) / 60);
      const actualMinutes = Math.round((session.actual_duration || 0) / 60);
      const completed = session.completed ? '完了' : '未完了';
      csvData.push(
        `${date},${session.type},${plannedMinutes},${actualMinutes},${completed},${session.task_id || ''}`
      );
    });

    csvData.push('');

    // タスク履歴
    csvData.push('=== タスク履歴 ===');
    csvData.push(
      'タスク名,優先度,状態,見積もりポモドーロ,完了ポモドーロ,作成日,完了日'
    );
    tasks.forEach(task => {
      const createdDate = new Date(task.created_at).toLocaleDateString('ja-JP');
      const completedDate = task.completed_at
        ? new Date(task.completed_at).toLocaleDateString('ja-JP')
        : '';
      csvData.push(
        `"${task.title}",${task.priority},${task.status},${task.estimated_pomodoros},${task.completed_pomodoros},${createdDate},${completedDate}`
      );
    });

    csvData.push('');

    // タグ別統計
    csvData.push('=== タグ別統計 ===');
    csvData.push(
      'タグ名,完了タスク数,総作業時間(時間),セッション数,平均完了率(%)'
    );
    tagStats.forEach(stat => {
      const workHours = Math.round((stat.totalWorkTime / 60) * 100) / 100;
      csvData.push(
        `"${stat.tagName}",${stat.completedTasks},${workHours},${stat.sessionCount},${stat.averageTaskCompletion}`
      );
    });

    csvData.push('');

    // 目標進捗
    csvData.push('=== 目標進捗 ===');
    csvData.push('期間,目標時間,実績時間,進捗率(%),残り時間');
    csvData.push(
      `週間,${goalProgress.weeklyGoal.targetHours},${goalProgress.weeklyGoal.actualHours},${goalProgress.weeklyGoal.progressPercentage},${goalProgress.weeklyGoal.remainingHours}`
    );
    csvData.push(
      `月間,${goalProgress.monthlyGoal.targetHours},${goalProgress.monthlyGoal.actualHours},${goalProgress.monthlyGoal.progressPercentage},${goalProgress.monthlyGoal.remainingHours}`
    );

    csvData.push('');

    // 比較データ
    csvData.push('=== 週間比較 ===');
    csvData.push('期間,作業時間,セッション数,完了タスク数');
    csvData.push(
      `今週,${comparisonData.weeklyComparison.currentWeek.workHours},${comparisonData.weeklyComparison.currentWeek.sessionCount},${comparisonData.weeklyComparison.currentWeek.completedTasks}`
    );
    csvData.push(
      `前週,${comparisonData.weeklyComparison.previousWeek.workHours},${comparisonData.weeklyComparison.previousWeek.sessionCount},${comparisonData.weeklyComparison.previousWeek.completedTasks}`
    );

    csvData.push('');
    csvData.push('=== 月間比較 ===');
    csvData.push('期間,作業時間,セッション数,完了タスク数');
    csvData.push(
      `今月,${comparisonData.monthlyComparison.currentMonth.workHours},${comparisonData.monthlyComparison.currentMonth.sessionCount},${comparisonData.monthlyComparison.currentMonth.completedTasks}`
    );
    csvData.push(
      `前月,${comparisonData.monthlyComparison.previousMonth.workHours},${comparisonData.monthlyComparison.previousMonth.sessionCount},${comparisonData.monthlyComparison.previousMonth.completedTasks}`
    );

    // エクスポート日時を追加
    csvData.push('');
    csvData.push(`=== エクスポート情報 ===`);
    csvData.push(`エクスポート日時,${new Date().toLocaleString('ja-JP')}`);

    return csvData.join('\n');
  }

  // 目標設定関連操作
  static async createGoal(goalData: {
    title: string;
    description?: string;
    type: 'daily' | 'weekly' | 'monthly';
    metric: 'sessions' | 'minutes' | 'tasks';
    target_value: number;
    tags?: string[];
  }): Promise<import('../types').Goal> {
    const client = DatabaseService.getSupabaseClient();

    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    // 期間の開始日と終了日を計算
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (goalData.type) {
      case 'daily':
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodStart.getDate() + 6);
        periodEnd.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodEnd.setHours(23, 59, 59, 999);
        break;
    }

    const insertData = {
      user_id: user.id,
      title: goalData.title,
      description: goalData.description,
      type: goalData.type,
      metric: goalData.metric,
      target_value: goalData.target_value,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      tags: JSON.stringify(goalData.tags || []),
    };

    const { data, error } = await (client as any)
      .from('goals')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`目標作成エラー: ${error.message}`);
    }

    // 初期進捗を計算
    await DatabaseService.updateGoalProgress(data.id);

    return {
      ...data,
      tags: JSON.parse(data.tags || '[]'),
    };
  }

  static async getGoals(filters?: {
    type?: 'daily' | 'weekly' | 'monthly';
    is_active?: boolean;
  }): Promise<import('../types').Goal[]> {
    const client = DatabaseService.getSupabaseClient();

    let query = client
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`目標取得エラー: ${error.message}`);
    }

    return (data || []).map((goal: any) => ({
      ...goal,
      tags: JSON.parse(goal.tags || '[]'),
    }));
  }

  static async updateGoal(
    id: string,
    updates: {
      title?: string;
      description?: string;
      target_value?: number;
      tags?: string[];
      is_active?: boolean;
    }
  ): Promise<import('../types').Goal> {
    const client = DatabaseService.getSupabaseClient();

    const updateData: any = { ...updates };
    if (updates.tags) {
      updateData.tags = JSON.stringify(updates.tags);
    }

    const { data, error } = await (client as any)
      .from('goals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`目標更新エラー: ${error.message}`);
    }

    return {
      ...data,
      tags: JSON.parse(data.tags || '[]'),
    };
  }

  static async deleteGoal(id: string): Promise<void> {
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client.from('goals').delete().eq('id', id);

    if (error) {
      throw new Error(`目標削除エラー: ${error.message}`);
    }
  }

  static async updateGoalProgress(goalId: string): Promise<void> {
    const client = DatabaseService.getSupabaseClient();

    const { error } = await client.rpc('update_goal_progress', {
      goal_id: goalId,
    } as any);

    if (error) {
      throw new Error(`目標進捗更新エラー: ${error.message}`);
    }
  }

  static async updateAllActiveGoalsProgress(): Promise<void> {
    const activeGoals = await DatabaseService.getGoals({ is_active: true });

    await Promise.all(
      activeGoals.map(goal => DatabaseService.updateGoalProgress(goal.id))
    );
  }

  // データベース接続テスト
  static async testConnection(): Promise<boolean> {
    try {
      const client = DatabaseService.getSupabaseClient();
      const { error } = await client.from('users').select('count').limit(1);

      return !error;
    } catch (error) {
      console.error('データベース接続テストエラー:', error);
      return false;
    }
  }

  // オフライン対応のヘルパーメソッド
  static async createTaskWithOfflineSupport(
    taskData: CreateTaskRequest
  ): Promise<Task> {
    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はオフライン同期サービスを使用
    if (!realtimeService.isNetworkOnline()) {
      const { OfflineSyncService } = await import('./offline-sync-service');
      const offlineSync = OfflineSyncService.getInstance();
      return await offlineSync.createTaskOffline(taskData);
    }

    // オンライン時は通常のデータベース操作
    return await DatabaseService.createTask(taskData);
  }

  static async updateTaskWithOfflineSupport(
    id: string,
    updates: UpdateTaskRequest
  ): Promise<Task> {
    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はオフライン同期サービスを使用
    if (!realtimeService.isNetworkOnline()) {
      const { OfflineSyncService } = await import('./offline-sync-service');
      const offlineSync = OfflineSyncService.getInstance();
      return await offlineSync.updateTaskOffline(id, updates);
    }

    // オンライン時は通常のデータベース操作
    return await DatabaseService.updateTask(id, updates);
  }

  static async createSessionWithOfflineSupport(
    sessionData: Omit<Session, 'id'>
  ): Promise<Session> {
    const realtimeService = RealtimeSyncService.getInstance();

    // オフライン時はオフライン同期サービスを使用
    if (!realtimeService.isNetworkOnline()) {
      const { OfflineSyncService } = await import('./offline-sync-service');
      const offlineSync = OfflineSyncService.getInstance();
      return await offlineSync.createSessionOffline(sessionData);
    }

    // オンライン時は通常のデータベース操作
    return await DatabaseService.createSession(sessionData);
  }
}
