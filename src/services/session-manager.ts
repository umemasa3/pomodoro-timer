import { useAuthStore } from '../stores/auth-store';
import { useTimerStore } from '../stores/timer-store';

/**
 * セッション管理サービス
 * 認証セッションの監視、期限管理、自動保存機能を提供
 */
export class SessionManager {
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private warningShown = false;
  private readonly SESSION_CHECK_INTERVAL = 60 * 1000; // 1分
  private readonly AUTO_SAVE_INTERVAL = 30 * 1000; // 30秒
  private readonly WARNING_THRESHOLD = 5 * 60 * 1000; // 5分前に警告

  /**
   * セッション監視を開始
   */
  startSessionMonitoring(): void {
    this.stopSessionMonitoring(); // 既存の監視を停止

    // セッション有効性チェック
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, this.SESSION_CHECK_INTERVAL);

    // 自動保存
    this.autoSaveInterval = setInterval(() => {
      this.autoSaveWorkInProgress();
    }, this.AUTO_SAVE_INTERVAL);

    console.log('セッション監視を開始しました');
  }

  /**
   * セッション監視を停止
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.warningShown = false;
    console.log('セッション監視を停止しました');
  }

  /**
   * セッション有効性をチェック
   */
  private async checkSessionValidity(): Promise<void> {
    const authState = useAuthStore.getState();

    if (!authState.isAuthenticated || !authState.sessionExpiry) {
      return;
    }

    const now = new Date();
    const expiryTime = new Date(authState.sessionExpiry);
    const timeUntilExpiry = expiryTime.getTime() - now.getTime();

    // セッションが既に期限切れの場合
    if (timeUntilExpiry <= 0) {
      await this.handleSessionExpiry();
      return;
    }

    // 5分前に警告を表示
    if (timeUntilExpiry <= this.WARNING_THRESHOLD && !this.warningShown) {
      this.showSessionExpiryWarning(Math.ceil(timeUntilExpiry / 1000 / 60));
      this.warningShown = true;
    }
  }

  /**
   * セッション期限切れ時の処理
   */
  private async handleSessionExpiry(): Promise<void> {
    console.log('セッションが期限切れになりました');

    // 作業中データの自動保存
    await this.saveWorkInProgress();

    // セッション監視を停止
    this.stopSessionMonitoring();

    // ユーザーに通知
    this.showSessionExpiredNotification();

    // 認証状態をクリア（ログアウト処理）
    const { signOut } = useAuthStore.getState();
    await signOut();

    // ログイン画面にリダイレクト
    this.redirectToLogin();
  }

  /**
   * セッション期限警告を表示
   */
  private showSessionExpiryWarning(minutesRemaining: number): void {
    const message = `セッションが${minutesRemaining}分後に期限切れになります。作業を続ける場合は、ページを更新してください。`;

    // ブラウザ通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('セッション期限警告', {
        body: message,
        icon: '/favicon.ico',
        tag: 'session-warning',
      });
    }

    // コンソールログ
    console.warn(message);

    // カスタムイベントを発火してUIに通知
    window.dispatchEvent(
      new CustomEvent('sessionWarning', {
        detail: { minutesRemaining, message },
      })
    );
  }

  /**
   * セッション期限切れ通知を表示
   */
  private showSessionExpiredNotification(): void {
    const message =
      'セッションが期限切れになりました。作業データは自動保存されました。再度ログインしてください。';

    // ブラウザ通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('セッション期限切れ', {
        body: message,
        icon: '/favicon.ico',
        tag: 'session-expired',
      });
    }

    // アラート表示
    alert(message);

    // カスタムイベントを発火
    window.dispatchEvent(
      new CustomEvent('sessionExpired', {
        detail: { message },
      })
    );
  }

  /**
   * 作業中データの自動保存
   */
  private async autoSaveWorkInProgress(): Promise<void> {
    try {
      const timerState = useTimerStore.getState();
      const authState = useAuthStore.getState();

      if (!authState.isAuthenticated) {
        return;
      }

      // タイマーが動作中の場合のみ自動保存
      if (timerState.isRunning) {
        await this.saveWorkInProgress();
      }
    } catch (error) {
      console.error('自動保存エラー:', error);
    }
  }

  /**
   * 作業中データを保存
   */
  private async saveWorkInProgress(): Promise<void> {
    try {
      const timerState = useTimerStore.getState();
      const authState = useAuthStore.getState();

      if (!authState.user) {
        return;
      }

      // 現在の作業状態をローカルストレージに保存
      const workInProgress = {
        userId: authState.user.id,
        timestamp: new Date().toISOString(),
        timerState: {
          currentSession: timerState.currentSession,
          timeRemaining: timerState.timeRemaining,
          isRunning: timerState.isRunning,
          associatedTask: timerState.associatedTask,
          sessionMode: timerState.sessionMode,
          sessionCount: timerState.sessionCount,
        },
        // 必要に応じて他の状態も保存
      };

      localStorage.setItem('workInProgress', JSON.stringify(workInProgress));
      console.log('作業データを自動保存しました');
    } catch (error) {
      console.error('作業データの保存に失敗しました:', error);
    }
  }

  /**
   * 保存された作業データを復元
   */
  async restoreWorkInProgress(): Promise<boolean> {
    try {
      const savedWork = localStorage.getItem('workInProgress');
      if (!savedWork) {
        return false;
      }

      const workData = JSON.parse(savedWork);
      const authState = useAuthStore.getState();

      // 現在のユーザーの作業データかチェック
      if (!authState.user || workData.userId !== authState.user.id) {
        localStorage.removeItem('workInProgress');
        return false;
      }

      // 保存から24時間以上経過している場合は削除
      const savedTime = new Date(workData.timestamp);
      const now = new Date();
      const hoursSinceLastSave =
        (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSave > 24) {
        localStorage.removeItem('workInProgress');
        return false;
      }

      // ユーザーに復元するか確認
      const shouldRestore = confirm(
        `前回の作業データが見つかりました（${savedTime.toLocaleString()}）。復元しますか？`
      );

      if (shouldRestore) {
        // タイマー状態を復元
        const { setTimerState } = useTimerStore.getState();
        if (setTimerState && workData.timerState) {
          // タイマーは停止状態で復元
          setTimerState({
            ...workData.timerState,
            isRunning: false,
          });
        }

        console.log('作業データを復元しました');
        localStorage.removeItem('workInProgress');
        return true;
      } else {
        localStorage.removeItem('workInProgress');
        return false;
      }
    } catch (error) {
      console.error('作業データの復元に失敗しました:', error);
      localStorage.removeItem('workInProgress');
      return false;
    }
  }

  /**
   * ログイン画面にリダイレクト
   */
  private redirectToLogin(): void {
    // SPAの場合、ルーターを使用してリダイレクト
    window.location.hash = '#/auth';

    // または、カスタムイベントを発火してルーターに処理を委譲
    window.dispatchEvent(new CustomEvent('redirectToLogin'));
  }

  /**
   * セッション期限を延長
   */
  async extendSession(): Promise<boolean> {
    try {
      const authState = useAuthStore.getState();

      if (!authState.isAuthenticated) {
        return false;
      }

      // 新しいセッション期限を設定（現在時刻から24時間後）
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // 状態を更新
      useAuthStore.setState({
        sessionExpiry: newExpiry,
      });

      // 警告フラグをリセット
      this.warningShown = false;

      console.log('セッション期限を延長しました:', newExpiry);
      return true;
    } catch (error) {
      console.error('セッション期限の延長に失敗しました:', error);
      return false;
    }
  }

  /**
   * 現在のセッション情報を取得
   */
  getSessionInfo(): {
    isActive: boolean;
    expiresAt: Date | null;
    timeRemaining: number | null;
  } {
    const authState = useAuthStore.getState();

    if (!authState.isAuthenticated || !authState.sessionExpiry) {
      return {
        isActive: false,
        expiresAt: null,
        timeRemaining: null,
      };
    }

    const expiresAt = new Date(authState.sessionExpiry);
    const timeRemaining = expiresAt.getTime() - Date.now();

    return {
      isActive: timeRemaining > 0,
      expiresAt,
      timeRemaining: Math.max(0, timeRemaining),
    };
  }
}

// シングルトンインスタンス
export const sessionManager = new SessionManager();
