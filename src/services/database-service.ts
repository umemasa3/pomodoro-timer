import { supabase } from './supabase';
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
  static async createUser(userData: any): Promise<User> {
    const { data, error } = await (supabase as any)
      .from('users')
      .insert([userData])
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

  static async updateUser(id: string, updates: any): Promise<User> {
    const { data, error } = await (supabase as any)
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

    const insertData: any = {
      user_id: user.id,
      title: taskData.title,
      description: taskData.description,
      estimated_pomodoros: taskData.estimated_pomodoros || 1,
      completed_pomodoros: 0,
      status: 'pending',
      priority: taskData.priority || 'medium',
    };

    const { data, error } = await (supabase as any)
      .from('tasks')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      throw new Error(`タスク作成エラー: ${error.message}`);
    }

    return data;
  }

  static async getTasks(filters?: {
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

  static async updateTask(
    id: string,
    updates: UpdateTaskRequest
  ): Promise<Task> {
    const updateData: any = {
      ...updates,
    };

    const { data, error } = await (supabase as any)
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

    const { data, error } = await (supabase as any)
      .from('tags')
      .insert([
        {
          user_id: user.id,
          name,
          color,
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
    const { data, error } = await (supabase as any)
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
    } as any);

    if (error) {
      if (error.code === '23505') {
        throw new Error('このタグは既にタスクに追加されています');
      }
      throw new Error(`タグ追加エラー: ${error.message}`);
    }

    // タグの使用頻度を増やす
    try {
      await supabase.rpc('increment_tag_usage', { tag_id: tagId } as any);
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
      await supabase.rpc('decrement_tag_usage', { tag_id: tagId } as any);
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
  }): Promise<Session> {
    const { data, error } = await (supabase as any)
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
    }
  ): Promise<Session> {
    const { data, error } = await (supabase as any)
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
    let query = supabase
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

  // リアルタイム同期
  static subscribeToTasks(
    callback: (payload: { eventType: string; new: Task; old: Task }) => void
  ) {
    return supabase
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
    return supabase
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
