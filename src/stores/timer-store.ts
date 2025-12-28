import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimerState } from '../types';
import { useAuthStore } from './auth-store';
import { NotificationService } from '../services/notification-service';

interface TimerStore extends TimerState {
  // タイマー制御
  startTimer: () => void;
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

      // 通知・UI状態
      showBreakSuggestion: false,
      suggestedBreakType: 'short',
      showCompletionNotification: false,

      // タイマー制御
      startTimer: () => {
        const { isRunning, intervalId } = get();

        if (isRunning) return; // 既に動作中の場合は何もしない

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
        const { intervalId, sessionType, completedSessions } = get();
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

        // ポモドーロセッションの場合、完了数を増加
        if (sessionType === 'pomodoro') {
          const newCompletedSessions = completedSessions + 1;
          set({ completedSessions: newCompletedSessions });

          // セッション記録をデータベースに保存（将来実装）
          // TODO: セッション記録の保存機能を実装

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
      }),
    }
  )
);
