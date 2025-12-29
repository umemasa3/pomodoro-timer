import { supabase } from './supabase';
import { DatabaseService } from './database-service';
import type { Task, Session } from '../types';

/**
 * 競合解決戦略の種類
 */
export type ConflictResolutionStrategy =
  | 'last-write-wins' // 最後の書き込みが勝利
  | 'user-choice' // ユーザーが選択
  | 'merge-changes'; // 変更をマージ

/**
 * 競合情報
 */
export interface ConflictInfo {
  id: string;
  type: 'task' | 'session' | 'tag';
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  timestamp: number;
}

/**
 * デバイス情報
 */
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  lastSeen: string;
  userAgent: string;
}

/**
 * 同期ステータス
 */
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  conflicts: number;
  lastSyncTime?: string;
  connectedDevices: number;
}

/**
 * リアルタイム同期サービス
 * Supabaseのリアルタイム機能を使用してマルチデバイス間のデータ同期を管理
 */
export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];
  private isOnline = navigator.onLine;
  private deviceId: string;
  private conflictResolutionStrategy: ConflictResolutionStrategy =
    'last-write-wins';
  private pendingChanges: Array<{
    type: 'task' | 'session' | 'tag';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    deviceId: string;
    version?: number;
  }> = [];
  private conflictQueue: ConflictInfo[] = [];
  private syncStatusCallbacks: Array<(status: SyncStatus) => void> = [];

  private constructor() {
    this.deviceId = this.generateDeviceId();
    this.setupNetworkListeners();
    this.loadPendingChanges();
    this.registerDevice(); // 非同期だが、awaitしない（バックグラウンドで実行）
    this.setupHeartbeat();
  }

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  /**
   * デバイスIDを生成または取得
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('pomodoro-device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('pomodoro-device-id', deviceId);
    }
    return deviceId;
  }

  /**
   * デバイス情報を登録
   */
  private async registerDevice(): Promise<void> {
    try {
      const deviceInfo: DeviceInfo = {
        id: this.deviceId,
        name: this.getDeviceName(),
        type: this.getDeviceType(),
        lastSeen: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      // デバイス情報をローカルストレージに保存
      localStorage.setItem('pomodoro-device-info', JSON.stringify(deviceInfo));

      // オンラインの場合はサーバーにも登録
      if (this.isOnline) {
        await this.syncDeviceInfo(deviceInfo);
      }
    } catch (syncError) {
      console.error('デバイス登録エラー:', syncError);
    }
  }

  /**
   * デバイス名を取得
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Mobile')) {
      return `Mobile Device`;
    } else if (userAgent.includes('Tablet')) {
      return `Tablet`;
    } else {
      return `Desktop`;
    }
  }

  /**
   * デバイスタイプを判定
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Mobile')) {
      return 'mobile';
    } else if (userAgent.includes('Tablet')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * デバイス情報をサーバーに同期
   */
  private async syncDeviceInfo(deviceInfo: DeviceInfo): Promise<void> {
    if (!supabase) {
      console.warn('Supabaseが利用できません');
      return;
    }

    try {
      // Supabaseのuser_metadataにデバイス情報を保存
      const { error } = await supabase.auth.updateUser({
        data: {
          devices: {
            [this.deviceId]: deviceInfo,
          },
        },
      });

      if (error) {
        console.error('デバイス情報同期エラー:', error);
      }
    } catch (error) {
      console.error('デバイス情報同期エラー:', error);
    }
  }

  /**
   * ハートビート機能を設定（デバイスの生存確認）
   */
  private setupHeartbeat(): void {
    // 5分ごとにハートビートを送信
    setInterval(
      async () => {
        if (this.isOnline) {
          try {
            const deviceInfo = JSON.parse(
              localStorage.getItem('pomodoro-device-info') || '{}'
            );
            deviceInfo.lastSeen = new Date().toISOString();
            localStorage.setItem(
              'pomodoro-device-info',
              JSON.stringify(deviceInfo)
            );
            await this.syncDeviceInfo(deviceInfo);
          } catch (syncError) {
            console.error('ハートビート送信エラー:', syncError);
          }
        }
      },
      5 * 60 * 1000
    ); // 5分
  }

  /**
   * 競合解決戦略を設定
   */
  setConflictResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.conflictResolutionStrategy = strategy;
    localStorage.setItem('pomodoro-conflict-strategy', strategy);
  }

  /**
   * 競合解決戦略を取得
   */
  getConflictResolutionStrategy(): ConflictResolutionStrategy {
    const stored = localStorage.getItem('pomodoro-conflict-strategy');
    return (stored as ConflictResolutionStrategy) || 'last-write-wins';
  }

  /**
   * 同期ステータスコールバックを登録
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusCallbacks.push(callback);

    // 初回ステータスを送信
    callback(this.getCurrentSyncStatus());

    return () => {
      this.syncStatusCallbacks = this.syncStatusCallbacks.filter(
        cb => cb !== callback
      );
    };
  }

  /**
   * 現在の同期ステータスを取得
   */
  private getCurrentSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: false, // 実際の同期状態に応じて更新
      pendingChanges: this.pendingChanges.length,
      conflicts: this.conflictQueue.length,
      lastSyncTime:
        localStorage.getItem('pomodoro-last-sync-time') || undefined,
      connectedDevices: this.getConnectedDevicesCount(),
    };
  }

  /**
   * 接続されているデバイス数を取得
   */
  private getConnectedDevicesCount(): number {
    try {
      const deviceInfo = localStorage.getItem('pomodoro-device-info');
      if (deviceInfo) {
        // 実際の実装では、Supabaseから他のデバイスの情報を取得
        return 1; // 現在のデバイスのみ
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * 同期ステータスを通知
   */
  private notifySyncStatus(): void {
    const status = this.getCurrentSyncStatus();
    this.syncStatusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('同期ステータスコールバックエラー:', error);
      }
    });
  }
  /**
   * ネットワーク状態の監視を設定
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('ネットワーク接続が復旧しました');
      this.isOnline = true;
      this.notifySyncStatus();
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      console.log('ネットワーク接続が切断されました');
      this.isOnline = false;
      this.notifySyncStatus();
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
    data: any,
    version?: number
  ): void {
    this.pendingChanges.push({
      type,
      operation,
      data,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      version,
    });
    this.savePendingChanges();
    this.notifySyncStatus();
  }

  /**
   * 未同期の変更をサーバーに同期
   */
  private async syncPendingChanges(): Promise<void> {
    if (!this.isOnline || this.pendingChanges.length === 0) {
      return;
    }

    console.log(`${this.pendingChanges.length}件の未同期変更を同期中...`);
    this.notifySyncStatus();

    const failedChanges: typeof this.pendingChanges = [];

    for (const change of this.pendingChanges) {
      try {
        await this.applySingleChangeWithConflictDetection(change);
        console.log('同期成功:', change);
      } catch (error) {
        console.error('同期失敗:', change, error);

        // 競合エラーの場合は競合キューに追加
        if (this.isConflictError(error)) {
          await this.handleConflict(change);
        } else {
          failedChanges.push(change);
        }
      }
    }

    // 失敗した変更のみを保持
    this.pendingChanges = failedChanges;
    this.savePendingChanges();

    // 最終同期時刻を更新
    localStorage.setItem('pomodoro-last-sync-time', new Date().toISOString());
    this.notifySyncStatus();

    if (failedChanges.length === 0) {
      console.log('すべての未同期変更が正常に同期されました');
    } else {
      console.warn(`${failedChanges.length}件の変更の同期に失敗しました`);
    }
  }

  /**
   * 競合検出付きで単一の変更を適用
   */
  private async applySingleChangeWithConflictDetection(change: {
    type: 'task' | 'session' | 'tag';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    deviceId: string;
    version?: number;
  }): Promise<void> {
    // 更新操作の場合は競合チェックを実行
    if (change.operation === 'update') {
      const hasConflict = await this.checkForConflict(change);
      if (hasConflict) {
        throw new Error('CONFLICT_DETECTED');
      }
    }

    // 変更を適用
    await this.applySingleChange(change);
  }

  /**
   * 競合をチェック
   */
  private async checkForConflict(change: {
    type: 'task' | 'session' | 'tag';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: number;
    deviceId: string;
    version?: number;
  }): Promise<boolean> {
    try {
      // サーバーから最新のデータを取得
      let remoteData: any;

      switch (change.type) {
        case 'task':
          remoteData = await DatabaseService.getTask(change.data.id);
          break;
        case 'session':
          remoteData = await DatabaseService.getSession(change.data.id);
          break;
        case 'tag':
          remoteData = await DatabaseService.getTag(change.data.id);
          break;
        default:
          return false;
      }

      if (!remoteData) {
        return false; // データが存在しない場合は競合なし
      }

      // タイムスタンプベースの競合検出
      const remoteUpdateTime = new Date(remoteData.updated_at).getTime();
      const localChangeTime = change.timestamp;

      // リモートの更新がローカルの変更より新しい場合は競合
      return remoteUpdateTime > localChangeTime;
    } catch (error) {
      console.error('競合チェックエラー:', error);
      return false;
    }
  }

  /**
   * エラーが競合エラーかどうかを判定
   */
  private isConflictError(error: any): boolean {
    return (
      error.message === 'CONFLICT_DETECTED' ||
      error.code === 'PGRST116' || // PostgreSQL unique violation
      error.message.includes('conflict')
    );
  }

  /**
   * 競合を処理
   */
  private async handleConflict(change: any): Promise<void> {
    try {
      // リモートデータを取得
      let remoteData: any;

      switch (change.type) {
        case 'task':
          remoteData = await DatabaseService.getTask(change.data.id);
          break;
        case 'session':
          remoteData = await DatabaseService.getSession(change.data.id);
          break;
        case 'tag':
          remoteData = await DatabaseService.getTag(change.data.id);
          break;
      }

      // 競合情報を作成
      const conflictInfo: ConflictInfo = {
        id: change.data.id,
        type: change.type,
        localVersion: change.data,
        remoteVersion: remoteData,
        conflictFields: this.detectConflictFields(change.data, remoteData),
        timestamp: Date.now(),
      };

      // 競合解決戦略に応じて処理
      await this.resolveConflict(conflictInfo);
    } catch (conflictError) {
      console.error('競合処理エラー:', conflictError);
    }
  }

  /**
   * 競合フィールドを検出
   */
  private detectConflictFields(localData: any, remoteData: any): string[] {
    const conflictFields: string[] = [];

    for (const key in localData) {
      if (localData[key] !== remoteData[key] && key !== 'updated_at') {
        conflictFields.push(key);
      }
    }

    return conflictFields;
  }

  /**
   * 競合を解決
   */
  private async resolveConflict(conflictInfo: ConflictInfo): Promise<void> {
    switch (this.conflictResolutionStrategy) {
      case 'last-write-wins':
        await this.resolveConflictLastWriteWins(conflictInfo);
        break;
      case 'user-choice':
        this.addConflictToQueue(conflictInfo);
        break;
      case 'merge-changes':
        await this.resolveConflictMerge(conflictInfo);
        break;
    }
  }

  /**
   * Last-Write-Wins戦略で競合を解決
   */
  private async resolveConflictLastWriteWins(
    conflictInfo: ConflictInfo
  ): Promise<void> {
    const localTime = new Date(conflictInfo.localVersion.updated_at).getTime();
    const remoteTime = new Date(
      conflictInfo.remoteVersion.updated_at
    ).getTime();

    if (localTime > remoteTime) {
      // ローカルの変更を適用
      await this.applySingleChange({
        type: conflictInfo.type,
        operation: 'update',
        data: conflictInfo.localVersion,
        timestamp: Date.now(),
        deviceId: this.deviceId,
      });
    } else {
      // リモートの変更を受け入れ、ローカルキャッシュを更新
      this.updateLocalCache(
        conflictInfo.type,
        'UPDATE',
        conflictInfo.remoteVersion
      );
    }
  }

  /**
   * マージ戦略で競合を解決
   */
  private async resolveConflictMerge(
    conflictInfo: ConflictInfo
  ): Promise<void> {
    const mergedData = this.mergeConflictingData(
      conflictInfo.localVersion,
      conflictInfo.remoteVersion
    );

    await this.applySingleChange({
      type: conflictInfo.type,
      operation: 'update',
      data: mergedData,
      timestamp: Date.now(),
      deviceId: this.deviceId,
    });
  }

  /**
   * 競合データをマージ
   */
  private mergeConflictingData(localData: any, remoteData: any): any {
    // 基本的なマージロジック（フィールドごとに最新のタイムスタンプを採用）
    const merged = { ...remoteData };

    // 特定のフィールドはローカルの変更を優先
    const localPriorityFields = ['status', 'completed_pomodoros'];

    for (const field of localPriorityFields) {
      if (localData[field] !== undefined) {
        merged[field] = localData[field];
      }
    }

    merged.updated_at = new Date().toISOString();
    return merged;
  }

  /**
   * 競合をキューに追加（ユーザー選択用）
   */
  private addConflictToQueue(conflictInfo: ConflictInfo): void {
    this.conflictQueue.push(conflictInfo);
    this.notifySyncStatus();
  }

  /**
   * ローカルキャッシュを更新
   */
  private updateLocalCache(type: string, operation: string, data: any): void {
    switch (type) {
      case 'task':
        this.updateLocalTaskCache({
          eventType: operation as any,
          new: data,
          old: {} as Task,
        });
        break;
      case 'session':
        this.updateLocalSessionCache({
          eventType: operation as any,
          new: data,
          old: {} as Session,
        });
        break;
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
    deviceId?: string;
    version?: number;
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
        await DatabaseService.createTag(change.data);
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

      // 自分のデバイスからの変更は無視（無限ループ防止）
      if (payload.new?.device_id === this.deviceId) {
        return;
      }

      // ローカルストレージのキャッシュを更新
      this.updateLocalTaskCache(payload);

      // 競合チェック
      if (payload.eventType === 'UPDATE') {
        this.checkAndHandleIncomingConflict('task', payload);
      }

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

      // 自分のデバイスからの変更は無視（無限ループ防止）
      if (payload.new?.device_id === this.deviceId) {
        return;
      }

      // ローカルストレージのキャッシュを更新
      this.updateLocalSessionCache(payload);

      // 競合チェック
      if (payload.eventType === 'UPDATE') {
        this.checkAndHandleIncomingConflict('session', payload);
      }

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
   * 受信した変更の競合をチェック・処理
   */
  private async checkAndHandleIncomingConflict(
    type: 'task' | 'session' | 'tag',
    payload: any
  ): Promise<void> {
    // ローカルに未同期の変更があるかチェック
    const localPendingChange = this.pendingChanges.find(
      change =>
        change.type === type &&
        change.data.id === payload.new.id &&
        change.operation === 'update'
    );

    if (localPendingChange) {
      // 競合が発生
      const conflictInfo: ConflictInfo = {
        id: payload.new.id,
        type,
        localVersion: localPendingChange.data,
        remoteVersion: payload.new,
        conflictFields: this.detectConflictFields(
          localPendingChange.data,
          payload.new
        ),
        timestamp: Date.now(),
      };

      await this.resolveConflict(conflictInfo);
    }
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
      mode: sessionData.mode || 'task-based', // デフォルトはtask-based
      session_name: sessionData.session_name,
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
   * 競合キューを取得
   */
  getConflictQueue(): ConflictInfo[] {
    return [...this.conflictQueue];
  }

  /**
   * 競合を手動で解決
   */
  async resolveConflictManually(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ): Promise<void> {
    const conflictIndex = this.conflictQueue.findIndex(
      c => c.id === conflictId
    );
    if (conflictIndex === -1) {
      throw new Error('競合が見つかりません');
    }

    const conflict = this.conflictQueue[conflictIndex];

    try {
      switch (resolution) {
        case 'local':
          await this.applySingleChange({
            type: conflict.type,
            operation: 'update',
            data: conflict.localVersion,
            timestamp: Date.now(),
            deviceId: this.deviceId,
          });
          break;
        case 'remote':
          this.updateLocalCache(
            conflict.type,
            'UPDATE',
            conflict.remoteVersion
          );
          break;
        case 'merge':
          if (!mergedData) {
            throw new Error('マージデータが必要です');
          }
          await this.applySingleChange({
            type: conflict.type,
            operation: 'update',
            data: mergedData,
            timestamp: Date.now(),
            deviceId: this.deviceId,
          });
          break;
      }

      // 競合をキューから削除
      this.conflictQueue.splice(conflictIndex, 1);
      this.notifySyncStatus();
    } catch (error) {
      console.error('競合解決エラー:', error);
      throw error;
    }
  }

  /**
   * 接続されているデバイス一覧を取得
   */
  async getConnectedDevices(): Promise<DeviceInfo[]> {
    if (!supabase) {
      console.warn('Supabaseが利用できません');
      return [];
    }

    try {
      // 現在のユーザーのデバイス情報を取得
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.user_metadata?.devices) {
        return [];
      }

      const devices = Object.values(
        user.user.user_metadata.devices
      ) as DeviceInfo[];

      // 最後に見た時刻が24時間以内のデバイスのみを返す
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return devices.filter(device => new Date(device.lastSeen) > oneDayAgo);
    } catch (error) {
      console.error('デバイス一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * 特定のデバイスとの同期を強制実行
   */
  async forceSyncWithDevice(deviceId: string): Promise<void> {
    console.log(`デバイス ${deviceId} との同期を開始...`);

    // 実装では、特定のデバイスからの変更のみを同期
    // 現在の実装では全体同期を実行
    await this.forcSync();
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
    return navigator.onLine && this.isOnline;
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
    if (!this.isNetworkOnline()) {
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
