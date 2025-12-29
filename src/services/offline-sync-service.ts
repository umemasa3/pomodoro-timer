import { DatabaseService } from './database-service';
import { RealtimeSyncService } from './realtime-sync-service';
import type { Task, Session, Tag } from '../types';

/**
 * 未同期アクション
 */
export interface PendingAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'session' | 'tag';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  deviceId: string;
}

/**
 * オフライン状態
 */
export interface OfflineState {
  isOnline: boolean;
  pendingActions: PendingAction[];
  lastSyncTime: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
}

/**
 * 同期結果
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ action: PendingAction; error: string }>;
}

/**
 * オフライン同期サービス
 * ネットワーク接続が不安定な環境でのデータ同期を管理
 */
export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private pendingActions: PendingAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncStatus: 'idle' | 'syncing' | 'error' = 'idle';
  private lastSyncTime: Date | null = null;
  private errorMessage?: string;
  private syncCallbacks: Array<(state: OfflineState) => void> = [];
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private realtimeSync: RealtimeSyncService;

  // 設定
  private readonly STORAGE_KEY = 'pomodoro-pending-actions';
  private readonly LAST_SYNC_KEY = 'pomodoro-last-sync-time';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1秒、5秒、15秒

  private constructor() {
    this.realtimeSync = RealtimeSyncService.getInstance();
    this.setupNetworkListeners();
    this.loadPendingActions();
    this.loadLastSyncTime();
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  /**
   * ネットワーク状態の監視を設定
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('ネットワーク接続が復旧しました - オフライン同期を開始');
      this.isOnline = true;
      this.notifyStateChange();
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('ネットワーク接続が切断されました - オフラインモードに切り替え');
      this.isOnline = false;
      this.syncStatus = 'idle';
      this.notifyStateChange();
    });
  }

  /**
   * 未同期アクションをローカルストレージから読み込み
   */
  private loadPendingActions(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const actions = JSON.parse(stored);
        this.pendingActions = actions.map((action: any) => ({
          ...action,
          timestamp: new Date(action.timestamp),
        }));
        console.log(`${this.pendingActions.length}件の未同期アクションを読み込みました`);
      }
    } catch (error) {
      console.error('未同期アクションの読み込みエラー:', error);
      this.pendingActions = [];
    }
  }

  /**
   * 最終同期時刻をローカルストレージから読み込み
   */
  private loadLastSyncTime(): void {
    try {
      const stored = localStorage.getItem(this.LAST_SYNC_KEY);
      if (stored) {
        this.lastSyncTime = new Date(stored);
      }
    } catch (error) {
      console.error('最終同期時刻の読み込みエラー:', error);
      this.lastSyncTime = null;
    }
  }

  /**
   * 未同期アクションをローカルストレージに保存
   */
  private savePendingActions(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pendingActions));
    } catch (error) {
      console.error('未同期アクションの保存エラー:', error);
    }
  }

  /**
   * 最終同期時刻をローカルストレージに保存
   */
  private saveLastSyncTime(): void {
    try {
      if (this.lastSyncTime) {
        localStorage.setItem(this.LAST_SYNC_KEY, this.lastSyncTime.toISOString());
      }
    } catch (error) {
      console.error('最終同期時刻の保存エラー:', error);
    }
  }

  /**
   * アクションをキューに追加
   */
  async queueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount' | 'deviceId'>): Promise<void> {
    const pendingAction: PendingAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      retryCount: 0,
      deviceId: this.getDeviceId(),
      maxRetries: this.MAX_RETRIES,
      ...action,
    };

    this.pendingActions.push(pendingAction);
    this.savePendingActions();
    this.notifyStateChange();

    console.log('アクションをキューに追加:', pendingAction);

    // オンライン時は即座に同期を試行
    if (this.isOnline && this.syncStatus === 'idle') {
      await this.syncPendingActions();
    }
  }

  /**
   * デバイスIDを取得
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('pomodoro-device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('pomodoro-device-id', deviceId);
    }
    return deviceId;
  }

  /**
   * 未同期アクションを同期
   */
  async syncPendingActions(): Promise<SyncResult> {
    if (!this.isOnline) {
      throw new Error('ネットワークに接続されていません');
    }

    if (this.syncStatus === 'syncing') {
      console.log('既に同期処理が実行中です');
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    if (this.pendingActions.length === 0) {
      console.log('同期するアクションがありません');
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.syncStatus = 'syncing';
    this.errorMessage = undefined;
    this.notifyStateChange();

    console.log(`${this.pendingActions.length}件のアクションを同期中...`);

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    const actionsToProcess = [...this.pendingActions];
    const failedActions: PendingAction[] = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeAction(action);
        result.syncedCount++;
        console.log('アクション同期成功:', action.id);

        // 成功したアクションを削除
        this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
      } catch (error) {
        console.error('アクション同期失敗:', action.id, error);
        result.failedCount++;
        result.errors.push({
          action,
          error: error instanceof Error ? error.message : String(error),
        });

        // リトライ回数を増やして再キューに追加
        action.retryCount++;
        if (action.retryCount < action.maxRetries) {
          failedActions.push(action);
          this.scheduleRetry(action);
        } else {
          console.error('最大リトライ回数に達しました:', action.id);
          // 最大リトライ回数に達したアクションは削除
          this.pendingActions = this.pendingActions.filter(a => a.id !== action.id);
        }
      }
    }

    // 失敗したアクションを更新
    this.pendingActions = this.pendingActions.map(action => {
      const failed = failedActions.find(f => f.id === action.id);
      return failed || action;
    });

    this.savePendingActions();

    // 同期完了
    this.syncStatus = result.failedCount > 0 ? 'error' : 'idle';
    this.errorMessage = result.failedCount > 0 
      ? `${result.failedCount}件のアクションの同期に失敗しました`
      : undefined;

    if (result.syncedCount > 0) {
      this.lastSyncTime = new Date();
      this.saveLastSyncTime();
    }

    this.notifyStateChange();

    console.log('同期完了:', result);
    return result;
  }

  /**
   * リトライをスケジュール
   */
  private scheduleRetry(action: PendingAction): void {
    const delay = this.RETRY_DELAYS[Math.min(action.retryCount - 1, this.RETRY_DELAYS.length - 1)];
    
    console.log(`アクション ${action.id} を ${delay}ms 後にリトライします (${action.retryCount}/${action.maxRetries})`);

    const timeoutId = setTimeout(async () => {
      this.retryTimeouts.delete(action.id);
      
      if (this.isOnline && this.syncStatus === 'idle') {
        await this.syncPendingActions();
      }
    }, delay);

    this.retryTimeouts.set(action.id, timeoutId);
  }

  /**
   * 単一のアクションを実行
   */
  private async executeAction(action: PendingAction): Promise<void> {
    switch (action.entity) {
      case 'task':
        await this.executeTaskAction(action);
        break;
      case 'session':
        await this.executeSessionAction(action);
        break;
      case 'tag':
        await this.executeTagAction(action);
        break;
      default:
        throw new Error(`未知のエンティティタイプ: ${action.entity}`);
    }
  }

  /**
   * タスクアクションを実行
   */
  private async executeTaskAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'create':
        await DatabaseService.createTask(action.data);
        break;
      case 'update':
        await DatabaseService.updateTask(action.data.id, action.data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTask(action.data.id);
        break;
      default:
        throw new Error(`未知のアクションタイプ: ${action.type}`);
    }
  }

  /**
   * セッションアクションを実行
   */
  private async executeSessionAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'create':
        await DatabaseService.createSession(action.data);
        break;
      case 'update':
        await DatabaseService.updateSession(action.data.id, action.data.updates);
        break;
      case 'delete':
        // セッションの削除は通常行わないが、必要に応じて実装
        throw new Error('セッションの削除はサポートされていません');
      default:
        throw new Error(`未知のアクションタイプ: ${action.type}`);
    }
  }

  /**
   * タグアクションを実行
   */
  private async executeTagAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'create':
        await DatabaseService.createTag(action.data);
        break;
      case 'update':
        await DatabaseService.updateTag(action.data.id, action.data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTag(action.data.id);
        break;
      default:
        throw new Error(`未知のアクションタイプ: ${action.type}`);
    }
  }

  /**
   * オフライン時のタスク作成
   */
  async createTaskOffline(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const offlineTask: Task = {
      id: `offline-task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...taskData,
    };

    // ローカルキャッシュに追加
    this.realtimeSync.updateLocalTaskCache({
      eventType: 'INSERT',
      new: offlineTask,
      old: {} as Task,
    });

    // 同期キューに追加
    await this.queueAction({
      type: 'create',
      entity: 'task',
      data: taskData,
      maxRetries: this.MAX_RETRIES,
    });

    console.log('オフラインタスクを作成:', offlineTask);
    return offlineTask;
  }

  /**
   * オフライン時のタスク更新
   */
  async updateTaskOffline(id: string, updates: Partial<Task>): Promise<Task> {
    // ローカルキャッシュから現在のタスクを取得
    const tasks = this.realtimeSync.getTasksFromCache();
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      throw new Error('タスクが見つかりません');
    }

    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // ローカルキャッシュを更新
    this.realtimeSync.updateLocalTaskCache({
      eventType: 'UPDATE',
      new: updatedTask,
      old: tasks[taskIndex],
    });

    // 同期キューに追加
    await this.queueAction({
      type: 'update',
      entity: 'task',
      data: { id, updates },
      maxRetries: this.MAX_RETRIES,
    });

    console.log('オフラインタスクを更新:', updatedTask);
    return updatedTask;
  }

  /**
   * オフライン時のセッション作成
   */
  async createSessionOffline(sessionData: Omit<Session, 'id'>): Promise<Session> {
    const offlineSession: Session = {
      id: `offline-session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      ...sessionData,
    };

    // ローカルキャッシュに追加
    this.realtimeSync.updateLocalSessionCache({
      eventType: 'INSERT',
      new: offlineSession,
      old: {} as Session,
    });

    // 同期キューに追加
    await this.queueAction({
      type: 'create',
      entity: 'session',
      data: sessionData,
      maxRetries: this.MAX_RETRIES,
    });

    console.log('オフラインセッションを作成:', offlineSession);
    return offlineSession;
  }

  /**
   * 手動同期を実行
   */
  async forceSync(): Promise<SyncResult> {
    if (!this.isOnline) {
      throw new Error('ネットワークに接続されていません');
    }

    console.log('手動同期を開始...');
    return await this.syncPendingActions();
  }

  /**
   * 状態変更コールバックを登録
   */
  onStateChange(callback: (state: OfflineState) => void): () => void {
    this.syncCallbacks.push(callback);

    // 初回状態を送信
    callback(this.getCurrentState());

    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): OfflineState {
    return {
      isOnline: this.isOnline,
      pendingActions: [...this.pendingActions],
      lastSyncTime: this.lastSyncTime,
      syncStatus: this.syncStatus,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * 状態変更を通知
   */
  private notifyStateChange(): void {
    const state = this.getCurrentState();
    this.syncCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('状態変更コールバックエラー:', error);
      }
    });
  }

  /**
   * 未同期アクション数を取得
   */
  getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  /**
   * ネットワーク状態を取得
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * 同期状態を取得
   */
  getSyncStatus(): 'idle' | 'syncing' | 'error' {
    return this.syncStatus;
  }

  /**
   * 最終同期時刻を取得
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * エラーメッセージを取得
   */
  getErrorMessage(): string | undefined {
    return this.errorMessage;
  }

  /**
   * 未同期アクションをクリア（デバッグ用）
   */
  clearPendingActions(): void {
    this.pendingActions = [];
    this.savePendingActions();
    this.notifyStateChange();
    console.log('未同期アクションをクリアしました');
  }

  /**
   * リトライタイムアウトをクリア
   */
  private clearRetryTimeouts(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * サービスのクリーンアップ
   */
  cleanup(): void {
    this.clearRetryTimeouts();
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    this.syncCallbacks = [];
  }
}