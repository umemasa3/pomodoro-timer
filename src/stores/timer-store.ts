import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimerState, Task, Session } from '../types';
import { useAuthStore } from './auth-store';
import { NotificationService } from '../services/notification-service';
import { DatabaseService } from '../services/database-service';

interface TimerStore extends TimerState {
  // セッション・タスク連携
  currentTask: Task | null;
  currentSession: Session | null;
  showTaskSelection: boolean;
  showTaskCompletionDialog: boolean;

  // タスク管理
  setCurrentTask: (task: Task | null) => void;
  setShowTaskSelection: (show: boolean) => void;
  setShowTaskCompletionDialog: (show: boolean) => void;
  completeTaskInSession: (
    status: 'completed' | 'continued' | 'paused'
  ) => Promise<void>;

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

      // セッション・タスク連携
      currentTask: null,
      currentSession: null,
      showTaskSelection: false,
      showTaskCompletionDialog: false,

      // 通知・UI状態
      showBreakSuggestion: false,
      suggestedBreakType: 'short',
      showCompletionNotification: false,

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

      completeTaskInSession: async (
        status: 'completed' | 'continued' | 'paused'
      ) => {
        const { currentTask, currentSession } = get();
        const { user } = useAuthStore.getState();

        if (!currentTask || !currentSession || !user) return;

        try {
          const databaseService = DatabaseService.getInstance();

          // セッション記録を更新
          await databaseService.updateSession(currentSession.id, {
            task_completion_status: status,
            completed_at: new Date().toISOString(),
            completed: true,
          });

          // タスクの状態を更新
          if (status === 'completed') {
            await databaseService.updateTask(currentTask.id, {
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
          } else if (status === 'paused') {
            await databaseService.updateTask(currentTask.id, {
              status: 'paused',
            });
          } else if (status === 'continued') {
            await databaseService.updateTask(currentTask.id, {
              status: 'in_progress',
            });
          }

          // ポモドーロセッションの場合、完了ポモドーロ数を増加
          if (currentSession.type === 'pomodoro') {
            await databaseService.updateTask(currentTask.id, {
              completed_pomodoros: currentTask.completed_pomodoros + 1,
            });
          }

          set({
            showTaskCompletionDialog: false,
            currentSession: null,
          });

          // タスクが完了した場合、現在のタスクをクリア
          if (status === 'completed') {
            set({ currentTask: null });
          }
        } catch (error) {
          console.error('セッション完了処理でエラーが発生しました:', error);
        }
      },

      // タイマー制御
      startTimer: async () => {
        const { isRunning, intervalId, sessionType, currentTask } = get();
        const { user } = useAuthStore.getState();

        if (isRunning) return; // 既に動作中の場合は何もしない

        // ポモドーロセッションでタスクが選択されていない場合、タスク選択を促す
        if (sessionType === 'pomodoro' && !currentTask) {
          set({ showTaskSelection: true });
          return;
        }

        // セッション記録を作成
        if (user && sessionType === 'pomodoro') {
          const databaseService = DatabaseService.getInstance();
          const plannedDuration = user.settings.pomodoro_minutes;

          // タスクが選択されている場合、タスクのステータスを「進行中」に更新
          if (currentTask && currentTask.status === 'pending') {
            try {
              await databaseService.updateTask(currentTask.id, {
                status: 'in_progress',
              });
            } catch (error) {
              console.error('タスクステータス更新エラー:', error);
            }
          }

          try {
            const session = await databaseService.createSession({
              user_id: user.id,
              task_id: currentTask?.id,
              type: sessionType,
              planned_duration: plannedDuration,
              actual_duration: 0,
              completed: false,
              started_at: new Date().toISOString(),
            });
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
              const databaseService = DatabaseService.getInstance();
              const actualDuration = user.settings.pomodoro_minutes; // 完了した場合は予定時間と同じ

              await databaseService.updateSession(currentSession.id, {
                actual_duration: actualDuration,
                completed: true,
                completed_at: new Date().toISOString(),
              });
            } catch (error) {
              console.error('セッション更新でエラーが発生しました:', error);
            }
          }

          // タスクが選択されている場合、完了確認ダイアログを表示
          if (currentTask) {
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
    }),
    {
      name: 'timer-storage',
      partialize: state => ({
        completedSessions: state.completedSessions,
        sessionType: state.sessionType,
        currentTime: state.currentTime,
        currentTask: state.currentTask,
      }),
    }
  )
);
