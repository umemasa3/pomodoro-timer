import { supabase } from './supabase';
import { DatabaseService } from './database-service';
import type { Task, Session } from '../types';

/**
 * リアルタイム同期サービス
 * Supabaseのリアルタイム機能を使用してデータの同期を管理
 */
export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];
  private isOnline = navigator.onLine;
  private pendingChanges: Array<{
    type: 'task' | 'session' | 'tag';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }> = [];

  private constructor() {
    this.setupNetworkListeners();
    this.loadPendingChanges();
  }

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  /**
   * ネットワーク状態の監視を設定
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('ネットワーク接続が復旧しました');
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      console.log('ネットワーク接続が切断されました');
      this.isOnline = false;
    });
  }

  /**
   * ローカルストレージから未同期の変更を読み込み
   */
  private loadPendingChanges(): void {
    try {
      const stored = localStorage.getItem('pomodoro-pending-changes');
      if (stored) {
        this.pendingChanges = JSON.parse(stored);
      }
    } catch (error) {
      console.error('未同期変更の読み込みエラー:', error);
      this.pendingChanges = [];
    }
  }

  /**
   * 未同期の変更をローカルストレージに保存
   */
  private savePendingChanges(): void {
    try {
      localStorage.setItem(
        'pomodoro-pending-changes',
        JSON.stringify(this.pendingChanges)
      );
    } catch (error) {
      console.error('未同期変更の保存エラー:', error);
    }
  }

  /**
   * 変更を未同期キューに追加
   */
  private addPendingChange(
    type: 'task' | 'session' | 'tag',
    operation: 'create' | 'update' | 'delete',
    data: any
  ): void {
    this.pendingChanges.push({
      type,
      operation,
      data,
      timestamp: Date.now(),
    });
    this.savePendingChanges();
  }

  /**
   * 未同期の変更をサーバーに同期
   */
  private async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.pendingChanges.length === 0) {
      return;
    }

    console.log(`${this.pendingChanges.length}件の未同期変更を同期中...`);

    const failedChanges: typeof this.pendingChanges = [];

    for (const change of this.pendingChanges) {
      try {
        await this.applySingleChange(change);
        console.log('同期成功:', change);
      } catch (error) {
        console.error('同期失敗:', change, error);
        failedChanges.push(change);
      }
    }

    // 失敗した変更のみを保持
    this.pendingChanges = failedChanges;
    this.savePendingChanges();

    if (failedChanges.length === 0) {
      console.log('すべての未同期変更が正常に同期されました');
    } else {
      console.warn(`${failedChanges.length}件の変更の同期に失敗しました`);
    }
  }

  /**
   * 単一の変更をサーバーに適用
   */
  private async applySingleChange(change: {
    type: 'task' | 'session' | 'tag';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
  }): Promise<void> {
    switch (change.type) {
      case 'task':
        await this.syncTaskChange(change);
        break;
      case 'session':
        await this.syncSessionChange(change);
        break;
      case 'tag':
        await this.syncTagChange(change);
        break;
      default:
        throw new Error(`未知の変更タイプ: ${change.type}`);
    }
  }

  /**
   * タスクの変更を同期
   */
  private async syncTaskChange(change: {
    operation: 'create' | 'update' | 'delete';
    data: any;
  }): Promise<void> {
    switch (change.operation) {
      case 'create':
        await DatabaseService.createTask(change.data);
        break;
      case 'update':
        await DatabaseService.updateTask(change.data.id, change.data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTask(change.data.id);
        break;
    }
  }

  /**
   * セッションの変更を同期
   */
  private async syncSessionChange(change: {
    operation: 'create' | 'update' | 'delete';
    data: any;
  }): Promise<void> {
    switch (change.operation) {
      case 'create':
        await DatabaseService.createSession(change.data);
        break;
      case 'update':
        await DatabaseService.updateSession(
          change.data.id,
          change.data.updates
        );
        break;
      // セッションの削除は通常行わないため、deleteは実装しない
    }
  }

  /**
   * タグの変更を同期
   */
  private async syncTagChange(change: {
    operation: 'create' | 'update' | 'delete';
    data: any;
  }): Promise<void> {
    switch (change.operation) {
      case 'create':
        await DatabaseService.createTag(change.data.name, change.data.color);
        break;
      case 'update':
        await DatabaseService.updateTag(change.data.id, change.data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTag(change.data.id);
        break;
    }
  }

  /**
   * タスクのリアルタイム同期を開始
   */
  subscribeToTasks(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Task;
      old: Task;
    }) => void
  ): () => void {
    if (!supabase) {
      console.warn('Supabaseが利用できないため、リアルタイム同期は無効です');
      return () => {};
    }

    const subscription = DatabaseService.subscribeToTasks((payload: any) => {
      console.log('タスクのリアルタイム更新を受信:', payload);

      // ローカルストレージのキャッシュを更新
      this.updateLocalTaskCache(payload);

      // コールバックを実行
      callback({
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      });
    });

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  /**
   * セッションのリアルタイム同期を開始
   */
  subscribeToSessions(
    callback: (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE';
      new: Session;
      old: Session;
    }) => void
  ): () => void {
    if (!supabase) {
      console.warn('Supabaseが利用できないため、リアルタイム同期は無効です');
      return () => {};
    }

    const subscription = DatabaseService.subscribeToSessions((payload: any) => {
      console.log('セッションのリアルタイム更新を受信:', payload);

      // ローカルストレージのキャッシュを更新
      this.updateLocalSessionCache(payload);

      // コールバックを実行
      callback({
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
      });
    });

    this.subscriptions.push(subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions = this.subscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  /**
   * ローカルタスクキャッシュを更新
   */
  updateLocalTaskCache(payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Task;
    old: Task;
  }): void {
    try {
      const cacheKey = 'pomodoro-tasks-cache';
      const cached = localStorage.getItem(cacheKey);
      let tasks: Task[] = cached ? JSON.parse(cached) : [];

      switch (payload.eventType) {
        case 'INSERT':
          tasks.push(payload.new);
          break;
        case 'UPDATE':
          tasks = tasks.map(task =>
            task.id === payload.new.id ? payload.new : task
          );
          break;
        case 'DELETE':
          tasks = tasks.filter(task => task.id !== payload.old.id);
          break;
      }

      localStorage.setItem(cacheKey, JSON.stringify(tasks));
    } catch (error) {
      console.error('ローカルタスクキャッシュの更新エラー:', error);
    }
  }

  /**
   * ローカルセッションキャッシュを更新
   */
  updateLocalSessionCache(payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Session;
    old: Session;
  }): void {
    try {
      const cacheKey = 'pomodoro-sessions-cache';
      const cached = localStorage.getItem(cacheKey);
      let sessions: Session[] = cached ? JSON.parse(cached) : [];

      switch (payload.eventType) {
        case 'INSERT':
          sessions.push(payload.new);
          break;
        case 'UPDATE':
          sessions = sessions.map(session =>
            session.id === payload.new.id ? payload.new : session
          );
          break;
        case 'DELETE':
          sessions = sessions.filter(session => session.id !== payload.old.id);
          break;
      }

      // 最新の100セッションのみを保持（メモリ効率化）
      sessions = sessions
        .sort(
          (a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )
        .slice(0, 100);

      localStorage.setItem(cacheKey, JSON.stringify(sessions));
    } catch (error) {
      console.error('ローカルセッションキャッシュの更新エラー:', error);
    }
  }

  /**
   * オフライン時のタスク作成
   */
  async createTaskOffline(taskData: any): Promise<Task> {
    const offlineTask: Task = {
      id: `offline-${Date.now()}`, // 一時的なID
      user_id: taskData.user_id,
      title: taskData.title,
      description: taskData.description,
      estimated_pomodoros: taskData.estimated_pomodoros || 1,
      completed_pomodoros: 0,
      status: 'pending',
      priority: taskData.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: undefined,
    };

    // ローカルキャッシュに追加
    this.updateLocalTaskCache({
      eventType: 'INSERT',
      new: offlineTask,
      old: {} as Task,
    });

    // 未同期キューに追加
    this.addPendingChange('task', 'create', taskData);

    return offlineTask;
  }

  /**
   * オフライン時のタスク更新
   */
  async updateTaskOffline(id: string, updates: any): Promise<Task> {
    // ローカルキャッシュから現在のタスクを取得
    const cacheKey = 'pomodoro-tasks-cache';
    const cached = localStorage.getItem(cacheKey);
    const tasks: Task[] = cached ? JSON.parse(cached) : [];

    const taskIndex = tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      throw new Error('タスクが見つかりません');
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // ローカルキャッシュを更新
    this.updateLocalTaskCache({
      eventType: 'UPDATE',
      new: updatedTask,
      old: tasks[taskIndex],
    });

    // 未同期キューに追加
    this.addPendingChange('task', 'update', { id, updates });

    return updatedTask;
  }

  /**
   * オフライン時のセッション作成
   */
  async createSessionOffline(sessionData: any): Promise<Session> {
    const offlineSession: Session = {
      id: `offline-${Date.now()}`, // 一時的なID
      user_id: sessionData.user_id,
      task_id: sessionData.task_id,
      type: sessionData.type,
      planned_duration: sessionData.planned_duration,
      actual_duration: sessionData.actual_duration,
      completed: sessionData.completed,
      task_completion_status: sessionData.task_completion_status,
      started_at: sessionData.started_at,
      completed_at: sessionData.completed_at,
    };

    // ローカルキャッシュに追加
    this.updateLocalSessionCache({
      eventType: 'INSERT',
      new: offlineSession,
      old: {} as Session,
    });

    // 未同期キューに追加
    this.addPendingChange('session', 'create', sessionData);

    return offlineSession;
  }

  /**
   * ローカルキャッシュからタスクを取得
   */
  getTasksFromCache(): Task[] {
    try {
      const cached = localStorage.getItem('pomodoro-tasks-cache');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('タスクキャッシュの読み込みエラー:', error);
      return [];
    }
  }

  /**
   * ローカルキャッシュからセッションを取得
   */
  getSessionsFromCache(): Session[] {
    try {
      const cached = localStorage.getItem('pomodoro-sessions-cache');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('セッションキャッシュの読み込みエラー:', error);
      return [];
    }
  }

  /**
   * ネットワーク状態を取得
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 未同期の変更数を取得
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }

  /**
   * 手動で同期を実行
   */
  async forcSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('ネットワークに接続されていません');
    }
    await this.syncPendingChanges();
  }

  /**
   * すべてのリアルタイム購読を停止
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions = [];
  }

  /**
   * サービスのクリーンアップ
   */
  cleanup(): void {
    this.unsubscribeAll();
    window.removeEventListener('online', this.syncPendingChanges);
    window.removeEventListener('offline', () => {});
  }
}
