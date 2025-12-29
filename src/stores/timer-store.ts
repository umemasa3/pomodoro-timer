import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimerState, Task, Session } from '../types';
import { useAuthStore } from './auth-store';
import { NotificationService } from '../services/notification-service';
import { DatabaseService } from '../services/database-service';
import { RealtimeSyncService } from '../services/realtime-sync-service';
import type {
  SyncStatus,
  ConflictInfo,
  DeviceInfo,
  ConflictResolutionStrategy,
} from '../services/realtime-sync-service';

interface TimerStore extends TimerState {
  // セッション・タスク連携
  currentTask: Task | null;
  currentSession: Session | null;
  showTaskSelection: boolean;
  showTaskCompletionDialog: boolean;
  showModeSelection: boolean; // モード選択ダイアログの表示状態

  // リアルタイム同期
  isOnline: boolean;
  pendingChangesCount: number;
  syncStatus: 'idle' | 'syncing' | 'error';
  detailedSyncStatus: SyncStatus | null;
  conflicts: ConflictInfo[];
  connectedDevices: DeviceInfo[];

  // タスク管理
  setCurrentTask: (task: Task | null) => void;
  setShowTaskSelection: (show: boolean) => void;
  setShowTaskCompletionDialog: (show: boolean) => void;
  setShowModeSelection: (show: boolean) => void;
  completeTaskInSession: (
    status: 'completed' | 'continued' | 'paused'
  ) => Promise<void>;

  // モード管理
  setMode: (mode: 'task-based' | 'standalone') => void;
  getDefaultSessionName: (
    sessionType: 'pomodoro' | 'short_break' | 'long_break'
  ) => string;
  associateTaskWithSession: (task: Task) => Promise<void>;

  // リアルタイム同期
  initializeRealtimeSync: () => void;
  cleanupRealtimeSync: () => void;
  forcSync: () => Promise<void>;
  updateSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;

  // マルチデバイス同期
  setConflictResolutionStrategy: (strategy: ConflictResolutionStrategy) => void;
  getConflictResolutionStrategy: () => ConflictResolutionStrategy;
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => Promise<void>;
  getConnectedDevices: () => Promise<DeviceInfo[]>;
  forceSyncWithDevice: (deviceId: string) => Promise<void>;
  updateDetailedSyncStatus: (status: SyncStatus) => void;
  updateConflicts: (conflicts: ConflictInfo[]) => void;
  updateConnectedDevices: (devices: DeviceInfo[]) => void;

  // タイマー制御
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resetTimer: () => void;

  // セッション管理
  completeSession: () => Promise<void>;
  switchToBreak: (breakType?: 'short' | 'long') => void;
  switchToPomodoro: () => void;

  // 設定
  updateSessionType: (type: 'pomodoro' | 'short_break' | 'long_break') => void;

  // 通知・UI状態
  showBreakSuggestion: boolean;
  suggestedBreakType: 'short' | 'long';
  showCompletionNotification: boolean;
  setShowBreakSuggestion: (show: boolean) => void;
  setSuggestedBreakType: (type: 'short' | 'long') => void;
  setShowCompletionNotification: (show: boolean) => void;

  // 内部状態
  intervalId: number | null;
  setIntervalId: (id: number | null) => void;

  // 初期化
  initializeTimer: () => void;

  // セッション復元用
  setTimerState: (state: Partial<TimerState>) => void;
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      currentTime: 25 * 60, // 25分（秒単位）
      isRunning: false,
      sessionType: 'pomodoro',
      completedSessions: 0,
      intervalId: null,
      mode: 'task-based', // デフォルトはタスクベースモード

      // セッション・タスク連携
      currentTask: null,
      currentSession: null,
      showTaskSelection: false,
      showTaskCompletionDialog: false,
      showModeSelection: false,

      // リアルタイム同期
      isOnline: navigator.onLine,
      pendingChangesCount: 0,
      syncStatus: 'idle',
      detailedSyncStatus: null,
      conflicts: [],
      connectedDevices: [],

      // 通知・UI状態
      showBreakSuggestion: false,
      suggestedBreakType: 'short',
      showCompletionNotification: false,

      // リアルタイム同期
      initializeRealtimeSync: () => {
        const realtimeService = RealtimeSyncService.getInstance();

        // 詳細な同期ステータスを監視
        realtimeService.onSyncStatusChange(status => {
          set({
            detailedSyncStatus: status,
            isOnline: status.isOnline,
            pendingChangesCount: status.pendingChanges,
            conflicts: realtimeService.getConflictQueue(),
          });
        });

        // ネットワーク状態の監視
        const updateNetworkStatus = () => {
          set({
            isOnline: realtimeService.isNetworkOnline(),
            pendingChangesCount: realtimeService.getPendingChangesCount(),
          });
        };

        // 初期状態を設定
        updateNetworkStatus();

        // ネットワーク状態の変更を監視
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // タスクのリアルタイム同期を開始
        realtimeService.subscribeToTasks(payload => {
          console.log('タスクのリアルタイム更新:', payload);
          // 必要に応じて状態を更新
          updateNetworkStatus();
        });

        // セッションのリアルタイム同期を開始
        realtimeService.subscribeToSessions(payload => {
          console.log('セッションのリアルタイム更新:', payload);
          // 必要に応じて状態を更新
          updateNetworkStatus();
        });

        console.log('リアルタイム同期が初期化されました');
      },

      cleanupRealtimeSync: () => {
        const realtimeService = RealtimeSyncService.getInstance();
        realtimeService.cleanup();
        console.log('リアルタイム同期がクリーンアップされました');
      },

      forcSync: async () => {
        const realtimeService = RealtimeSyncService.getInstance();

        set({ syncStatus: 'syncing' });

        try {
          await realtimeService.forcSync();
          set({
            syncStatus: 'idle',
            pendingChangesCount: realtimeService.getPendingChangesCount(),
          });
          console.log('手動同期が完了しました');
        } catch (error) {
          set({ syncStatus: 'error' });
          console.error('手動同期でエラーが発生しました:', error);
          throw error;
        }
      },

      updateSyncStatus: (status: 'idle' | 'syncing' | 'error') => {
        set({ syncStatus: status });
      },

      // マルチデバイス同期
      setConflictResolutionStrategy: (strategy: ConflictResolutionStrategy) => {
        const realtimeService = RealtimeSyncService.getInstance();
        realtimeService.setConflictResolutionStrategy(strategy);
      },

      getConflictResolutionStrategy: () => {
        const realtimeService = RealtimeSyncService.getInstance();
        return realtimeService.getConflictResolutionStrategy();
      },

      resolveConflict: async (
        conflictId: string,
        resolution: 'local' | 'remote' | 'merge',
        mergedData?: any
      ) => {
        const realtimeService = RealtimeSyncService.getInstance();

        try {
          await realtimeService.resolveConflictManually(
            conflictId,
            resolution,
            mergedData
          );

          // 競合リストを更新
          set({
            conflicts: realtimeService.getConflictQueue(),
          });
        } catch (error) {
          console.error('競合解決エラー:', error);
          throw error;
        }
      },

      getConnectedDevices: async () => {
        const realtimeService = RealtimeSyncService.getInstance();

        try {
          const devices = await realtimeService.getConnectedDevices();
          set({ connectedDevices: devices });
          return devices;
        } catch (error) {
          console.error('デバイス一覧取得エラー:', error);
          return [];
        }
      },

      forceSyncWithDevice: async (deviceId: string) => {
        const realtimeService = RealtimeSyncService.getInstance();

        try {
          set({ syncStatus: 'syncing' });
          await realtimeService.forceSyncWithDevice(deviceId);
          set({ syncStatus: 'idle' });
        } catch (error) {
          console.error('デバイス同期エラー:', error);
          set({ syncStatus: 'error' });
          throw error;
        }
      },

      updateDetailedSyncStatus: (status: SyncStatus) => {
        set({ detailedSyncStatus: status });
      },

      updateConflicts: (conflicts: ConflictInfo[]) => {
        set({ conflicts });
      },

      updateConnectedDevices: (devices: DeviceInfo[]) => {
        set({ connectedDevices: devices });
      },

      // セッション・タスク連携
      setCurrentTask: (task: Task | null) => {
        set({ currentTask: task });
      },

      setShowTaskSelection: (show: boolean) => {
        set({ showTaskSelection: show });
      },

      setShowTaskCompletionDialog: (show: boolean) => {
        set({ showTaskCompletionDialog: show });
      },

      setShowModeSelection: (show: boolean) => {
        set({ showModeSelection: show });
      },

      // モード管理
      setMode: (mode: 'task-based' | 'standalone') => {
        set({ mode });
      },

      getDefaultSessionName: (
        sessionType: 'pomodoro' | 'short_break' | 'long_break'
      ) => {
        switch (sessionType) {
          case 'pomodoro':
            return '集中時間';
          case 'short_break':
            return '短い休憩';
          case 'long_break':
            return '長い休憩';
          default:
            return '集中時間';
        }
      },

      associateTaskWithSession: async (task: Task) => {
        const { currentSession } = get();

        if (!currentSession) {
          throw new Error('現在のセッションが存在しません');
        }

        try {
          // セッションにタスクを関連付け
          await DatabaseService.updateSession(currentSession.id, {
            task_id: task.id,
            mode: 'task-based',
          });

          // タスクのステータスを「進行中」に更新
          if (task.status === 'pending') {
            await DatabaseService.updateTask(task.id, {
              status: 'in_progress',
            });
          }

          // ストアの状態を更新
          set({
            currentTask: task,
            mode: 'task-based',
            currentSession: {
              ...currentSession,
              task_id: task.id,
              mode: 'task-based',
            },
          });

          console.log('タスクがセッションに関連付けられました:', {
            sessionId: currentSession.id,
            taskId: task.id,
          });
        } catch (error) {
          console.error('タスク関連付けエラー:', error);
          throw error;
        }
      },

      completeTaskInSession: async (
        status: 'completed' | 'continued' | 'paused'
      ) => {
        const { currentTask, currentSession } = get();
        const { user } = useAuthStore.getState();

        if (!currentTask || !currentSession || !user) {
          throw new Error('セッション情報が不完全です');
        }

        try {
          // セッション記録を更新（詳細な履歴情報を含む）
          const sessionUpdate = {
            task_completion_status: status,
            completed_at: new Date().toISOString(),
            completed: true,
            actual_duration: user.settings.pomodoro_minutes, // 実際の作業時間
          };

          await DatabaseService.updateSession(currentSession.id, sessionUpdate);

          // タスクの状態を更新
          const taskUpdates: Partial<Task> = {};

          if (status === 'completed') {
            taskUpdates.status = 'completed';
            taskUpdates.completed_at = new Date().toISOString();
          } else if (status === 'paused') {
            taskUpdates.status = 'paused';
          } else if (status === 'continued') {
            taskUpdates.status = 'in_progress';
          }

          // ポモドーロセッションの場合、完了ポモドーロ数を増加
          if (currentSession.type === 'pomodoro') {
            taskUpdates.completed_pomodoros =
              currentTask.completed_pomodoros + 1;
          }

          await DatabaseService.updateTask(currentTask.id, taskUpdates);

          // 状態をクリア
          set({
            showTaskCompletionDialog: false,
            currentSession: null,
          });

          // タスクが完了した場合、現在のタスクをクリア
          if (status === 'completed') {
            set({ currentTask: null });
          }

          // 成功ログ
          console.log(`タスク完了処理成功: ${status}`, {
            taskId: currentTask.id,
            sessionId: currentSession.id,
            completedPomodoros: taskUpdates.completed_pomodoros,
          });
        } catch (error) {
          console.error('セッション完了処理でエラーが発生しました:', error);

          // エラーの詳細をユーザーに分かりやすく伝える
          if (error instanceof Error) {
            throw new Error(`タスクの完了処理に失敗しました: ${error.message}`);
          } else {
            throw new Error(
              'タスクの完了処理中に予期しないエラーが発生しました'
            );
          }
        }
      },

      // タイマー制御
      startTimer: async () => {
        const { isRunning, intervalId, sessionType, currentTask, mode } = get();
        const { user } = useAuthStore.getState();

        if (isRunning) return; // 既に動作中の場合は何もしない

        // ポモドーロセッションでモードが未選択の場合、モード選択を促す
        if (
          sessionType === 'pomodoro' &&
          !currentTask &&
          mode === 'task-based'
        ) {
          set({ showModeSelection: true });
          return;
        }

        // セッション記録を作成
        if (user) {
          const plannedDuration =
            sessionType === 'pomodoro'
              ? user.settings.pomodoro_minutes
              : sessionType === 'short_break'
                ? user.settings.short_break_minutes
                : user.settings.long_break_minutes;

          // タスクベースモードでタスクが選択されている場合、タスクのステータスを「進行中」に更新
          if (
            mode === 'task-based' &&
            currentTask &&
            currentTask.status === 'pending'
          ) {
            try {
              await DatabaseService.updateTask(currentTask.id, {
                status: 'in_progress',
              });
            } catch (error) {
              console.error('タスクステータス更新エラー:', error);
            }
          }

          try {
            const sessionData = {
              user_id: user.id,
              task_id: mode === 'task-based' ? currentTask?.id : undefined,
              type: sessionType,
              planned_duration: plannedDuration,
              actual_duration: 0,
              completed: false,
              started_at: new Date().toISOString(),
              mode,
              session_name:
                mode === 'standalone'
                  ? get().getDefaultSessionName(sessionType)
                  : undefined,
            };

            const session = await DatabaseService.createSession(sessionData);
            set({ currentSession: session });
          } catch (error) {
            console.error('セッション作成でエラーが発生しました:', error);
          }
        }

        // 既存のインターバルをクリア
        if (intervalId) {
          clearInterval(intervalId);
        }

        const newIntervalId = setInterval(() => {
          const { currentTime } = get();

          if (currentTime <= 0) {
            // タイマー完了
            get().completeSession();
            return;
          }

          set({ currentTime: currentTime - 1 });
        }, 1000);

        set({
          isRunning: true,
          intervalId: newIntervalId,
        });
      },

      pauseTimer: () => {
        const { intervalId } = get();

        if (intervalId) {
          clearInterval(intervalId);
        }

        set({
          isRunning: false,
          intervalId: null,
        });
      },

      resetTimer: () => {
        const { intervalId, sessionType } = get();
        const { user } = useAuthStore.getState();

        if (intervalId) {
          clearInterval(intervalId);
        }

        // セッションタイプに応じた初期時間を設定
        let initialTime: number;
        if (sessionType === 'pomodoro') {
          initialTime = (user?.settings.pomodoro_minutes || 25) * 60;
        } else if (sessionType === 'short_break') {
          initialTime = (user?.settings.short_break_minutes || 5) * 60;
        } else {
          initialTime = (user?.settings.long_break_minutes || 15) * 60;
        }

        set({
          currentTime: initialTime,
          isRunning: false,
          intervalId: null,
        });
      },

      completeSession: async () => {
        const {
          intervalId,
          sessionType,
          completedSessions,
          currentTask,
          currentSession,
          mode,
        } = get();
        const { user } = useAuthStore.getState();

        if (intervalId) {
          clearInterval(intervalId);
        }

        set({
          isRunning: false,
          intervalId: null,
          showCompletionNotification: true,
        });

        // 通知サービスを取得
        const notificationService = NotificationService.getInstance();

        // ポモドーロセッションの場合
        if (sessionType === 'pomodoro') {
          const newCompletedSessions = completedSessions + 1;
          set({ completedSessions: newCompletedSessions });

          // セッション記録を更新（実際の時間を記録）
          if (currentSession && user) {
            try {
              const actualDuration = user.settings.pomodoro_minutes; // 完了した場合は予定時間と同じ

              await DatabaseService.updateSession(currentSession.id, {
                actual_duration: actualDuration,
                completed: true,
                completed_at: new Date().toISOString(),
              });
            } catch (error) {
              console.error('セッション更新でエラーが発生しました:', error);
            }
          }

          // タスクベースモードでタスクが選択されている場合、完了確認ダイアログを表示
          if (mode === 'task-based' && currentTask) {
            set({ showTaskCompletionDialog: true });
          }

          // 休憩の提案
          const sessionsUntilLongBreak =
            user?.settings.sessions_until_long_break || 4;
          if (newCompletedSessions % sessionsUntilLongBreak === 0) {
            // 長い休憩を提案
            set({
              showBreakSuggestion: true,
              suggestedBreakType: 'long',
            });
          } else {
            // 短い休憩を提案
            set({
              showBreakSuggestion: true,
              suggestedBreakType: 'short',
            });
          }
        } else {
          // 休憩完了後はポモドーロに戻る
          setTimeout(() => {
            get().switchToPomodoro();
          }, 2000); // 2秒後に自動でポモドーロに切り替え
        }

        // 通知を表示
        if (
          user?.settings.notifications.desktop ||
          user?.settings.sound_enabled
        ) {
          await notificationService.showSessionCompleteNotification(
            sessionType,
            user?.settings.sound_enabled || false,
            user?.settings.sound_type || 'bell'
          );
        }

        // バイブレーション（モバイル対応）
        if (user?.settings.notifications.vibration && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      },

      switchToBreak: (breakType: 'short' | 'long' = 'short') => {
        const { user } = useAuthStore.getState();
        const sessionType = breakType === 'long' ? 'long_break' : 'short_break';
        const duration =
          breakType === 'long'
            ? user?.settings.long_break_minutes || 15
            : user?.settings.short_break_minutes || 5;

        set({
          sessionType,
          currentTime: duration * 60,
          isRunning: false,
          showBreakSuggestion: false,
        });
      },

      switchToPomodoro: () => {
        const { user } = useAuthStore.getState();
        const duration = user?.settings.pomodoro_minutes || 25;

        set({
          sessionType: 'pomodoro',
          currentTime: duration * 60,
          isRunning: false,
          showBreakSuggestion: false,
        });
      },

      updateSessionType: (type: 'pomodoro' | 'short_break' | 'long_break') => {
        const { user } = useAuthStore.getState();
        let duration: number;

        if (type === 'pomodoro') {
          duration = user?.settings.pomodoro_minutes || 25;
        } else if (type === 'short_break') {
          duration = user?.settings.short_break_minutes || 5;
        } else {
          duration = user?.settings.long_break_minutes || 15;
        }

        set({
          sessionType: type,
          currentTime: duration * 60,
          isRunning: false,
        });
      },

      setIntervalId: (id: number | null) => {
        set({ intervalId: id });
      },

      // 通知・UI状態の管理
      setShowBreakSuggestion: (show: boolean) => {
        set({ showBreakSuggestion: show });
      },

      setSuggestedBreakType: (type: 'short' | 'long') => {
        set({ suggestedBreakType: type });
      },

      setShowCompletionNotification: (show: boolean) => {
        set({ showCompletionNotification: show });
      },

      initializeTimer: () => {
        const { user } = useAuthStore.getState();
        const duration = user?.settings.pomodoro_minutes || 25;

        set({
          currentTime: duration * 60,
          isRunning: false,
          sessionType: 'pomodoro',
          intervalId: null,
        });
      },

      setTimerState: (state: Partial<TimerState>) => {
        set(state);
      },
    }),
    {
      name: 'timer-storage',
      partialize: state => ({
        completedSessions: state.completedSessions,
        sessionType: state.sessionType,
        currentTime: state.currentTime,
        currentTask: state.currentTask,
        mode: state.mode,
      }),
    }
  )
);
