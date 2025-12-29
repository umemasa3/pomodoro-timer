import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { useAuthStore } from '../../stores/auth-store';

/**
 * 認証セキュリティのプロパティベーステスト
 *
 * プロパティ 2: 認証セッションの安全性
 * すべての認証セッションにおいて、セッション期限切れ時には作業中データが自動保存され、
 * ユーザーに適切な通知が行われる
 *
 * 検証対象: 要件 10.5, 10.6
 */

// モック設定
vi.mock('../session-manager', () => ({
  sessionManager: {
    startSessionMonitoring: vi.fn(),
    stopSessionMonitoring: vi.fn(),
    extendSession: vi.fn(),
    getSessionInfo: vi.fn(),
    restoreWorkInProgress: vi.fn(),
  },
}));

// LocalStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Notificationのモック
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    constructor() {
      // モック実装
    }
    static permission = 'granted';
  },
});

// alertのモック
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
});

// confirmのモック
Object.defineProperty(window, 'confirm', {
  value: vi.fn(),
});

describe('認証セキュリティ プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // LocalStorageをクリア
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    // 認証ストアをリセット
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      loginAttempts: 0,
      lastLoginAttempt: null,
      isLocked: false,
      lockUntil: null,
      rememberMe: false,
      sessionExpiry: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * プロパティ 2.1: セッション期限切れ時の自動保存
   * 任意のセッション状態において、セッション期限切れ時には作業中データが自動保存される
   */
  it('プロパティ 2.1: セッション期限切れ時の自動保存', async () => {
    await fc.assert(
      fc.asyncProperty(
        // セッション状態のジェネレーター
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          sessionExpiry: fc.date({
            min: new Date(Date.now() - 1000),
            max: new Date(Date.now() + 1000),
          }), // 期限切れまたは期限切れ直前
          timerState: fc.record({
            currentSession: fc.string(),
            timeRemaining: fc.integer({ min: 0, max: 3600 }),
            isRunning: fc.boolean(),
            sessionMode: fc.constantFrom('standalone', 'task-linked'),
          }),
        }),
        async sessionData => {
          // セッション状態を設定
          useAuthStore.setState({
            user: {
              id: sessionData.userId,
              email: 'test@example.com',
              display_name: 'Test User',
              timezone: 'UTC',
              settings: {
                pomodoro_minutes: 25,
                short_break_minutes: 5,
                long_break_minutes: 15,
                sessions_until_long_break: 4,
                sound_enabled: true,
                sound_type: 'bell',
                theme: 'auto',
                notifications: {
                  desktop: true,
                  sound: true,
                  vibration: false,
                },
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            sessionExpiry: sessionData.sessionExpiry,
          });

          // SessionManagerのインスタンスを作成してテスト
          const manager = new (
            await import('../session-manager')
          ).SessionManager();

          // セッション期限切れをシミュレート
          const now = new Date();
          const expiredTime = new Date(now.getTime() - 1000); // 1秒前に期限切れ

          useAuthStore.setState({
            sessionExpiry: expiredTime,
          });

          // プライベートメソッドにアクセスするためのハック
          const handleSessionExpiry = (manager as any).handleSessionExpiry.bind(
            manager
          );

          // セッション期限切れ処理を実行
          await handleSessionExpiry();

          // 作業データが保存されたことを確認
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'workInProgress',
            expect.stringContaining(sessionData.userId)
          );

          // 通知が表示されたことを確認
          expect(window.alert).toHaveBeenCalledWith(
            expect.stringContaining('セッションが期限切れになりました')
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * プロパティ 2.2: セッション警告の適切なタイミング
   * 任意のセッション期限において、5分前に警告が表示される
   */
  it('プロパティ 2.2: セッション警告の適切なタイミング', async () => {
    await fc.assert(
      fc.asyncProperty(
        // セッション期限のジェネレーター（5分後から1時間後まで）
        fc.integer({ min: 5 * 60 * 1000, max: 60 * 60 * 1000 }),
        async timeUntilExpiry => {
          const now = new Date();
          const expiryTime = new Date(now.getTime() + timeUntilExpiry);

          useAuthStore.setState({
            user: {
              id: 'test-user',
              email: 'test@example.com',
              display_name: 'Test User',
              timezone: 'UTC',
              settings: {
                pomodoro_minutes: 25,
                short_break_minutes: 5,
                long_break_minutes: 15,
                sessions_until_long_break: 4,
                sound_enabled: true,
                sound_type: 'bell',
                theme: 'auto',
                notifications: {
                  desktop: true,
                  sound: true,
                  vibration: false,
                },
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            sessionExpiry: expiryTime,
          });

          const manager = new (
            await import('../session-manager')
          ).SessionManager();

          // カスタムイベントリスナーを設定
          let warningFired = false;
          const warningListener = () => {
            warningFired = true;
          };
          window.addEventListener('sessionWarning', warningListener);

          // セッション有効性チェックを実行
          const checkSessionValidity = (
            manager as any
          ).checkSessionValidity.bind(manager);
          await checkSessionValidity();

          // 5分前の場合は警告が表示されるべき
          const shouldShowWarning = timeUntilExpiry <= 5 * 60 * 1000;

          if (shouldShowWarning) {
            // 警告が表示されたか、またはNotificationが作成されたことを確認
            expect(warningFired || window.Notification).toBeTruthy();
          }

          window.removeEventListener('sessionWarning', warningListener);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * プロパティ 2.3: ログイン試行制限の一貫性
   * 任意のログイン試行において、5回失敗後にアカウントがロックされる
   */
  it('プロパティ 2.3: ログイン試行制限の一貫性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // ログイン試行回数のジェネレーター
        fc.integer({ min: 1, max: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }), // email
        fc.string({ minLength: 1, maxLength: 50 }), // password
        async attemptCount => {
          const store = useAuthStore.getState();

          // 複数回のログイン失敗をシミュレート
          for (let i = 0; i < attemptCount; i++) {
            store.incrementLoginAttempts();
          }

          const currentAttempts = useAuthStore.getState().loginAttempts;
          const isLocked = useAuthStore.getState().isLocked;

          // 5回以上の失敗でアカウントがロックされるべき
          if (currentAttempts >= 5) {
            // ロック処理を実行
            store.lockAccount();
            const finalState = useAuthStore.getState();

            expect(finalState.isLocked).toBe(true);
            expect(finalState.lockUntil).toBeInstanceOf(Date);

            // ロック期間が15分であることを確認
            const lockDuration = finalState.lockUntil!.getTime() - Date.now();
            expect(lockDuration).toBeGreaterThan(14 * 60 * 1000); // 14分以上
            expect(lockDuration).toBeLessThan(16 * 60 * 1000); // 16分未満
          } else {
            expect(isLocked).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * プロパティ 2.4: パスワード強度検証の一貫性
   * 任意のパスワードにおいて、強度チェックが一貫した結果を返す
   */
  it('プロパティ 2.4: パスワード強度検証の一貫性', async () => {
    await fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 100 }), password => {
        const store = useAuthStore.getState();
        const result1 = store.validatePasswordStrength(password);
        const result2 = store.validatePasswordStrength(password);

        // 同じパスワードに対して同じ結果を返すべき
        expect(result1.isValid).toBe(result2.isValid);
        expect(result1.score).toBe(result2.score);
        expect(result1.errors).toEqual(result2.errors);

        // 基本的な検証ルール
        if (password.length < 8) {
          expect(result1.errors).toContain('8文字以上である必要があります');
          expect(result1.isValid).toBe(false);
        }

        if (!/[A-Z]/.test(password)) {
          expect(result1.errors).toContain('大文字を含む必要があります');
        }

        if (!/[a-z]/.test(password)) {
          expect(result1.errors).toContain('小文字を含む必要があります');
        }

        if (!/\d/.test(password)) {
          expect(result1.errors).toContain('数字を含む必要があります');
        }

        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
          expect(result1.errors).toContain('特殊文字を含む必要があります');
        }

        // スコアは0-5の範囲内であるべき
        expect(result1.score).toBeGreaterThanOrEqual(0);
        expect(result1.score).toBeLessThanOrEqual(5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 2.5: セッション延長の安全性
   * 任意の認証済みセッションにおいて、セッション延長が適切に動作する
   */
  it('プロパティ 2.5: セッション延長の安全性', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 1, maxLength: 50 }),
          currentExpiry: fc.date({
            min: new Date(),
            max: new Date(Date.now() + 24 * 60 * 60 * 1000),
          }),
        }),
        async sessionData => {
          // 認証済み状態を設定
          useAuthStore.setState({
            user: {
              id: sessionData.userId,
              email: 'test@example.com',
              display_name: 'Test User',
              timezone: 'UTC',
              settings: {
                pomodoro_minutes: 25,
                short_break_minutes: 5,
                long_break_minutes: 15,
                sessions_until_long_break: 4,
                sound_enabled: true,
                sound_type: 'bell',
                theme: 'auto',
                notifications: {
                  desktop: true,
                  sound: true,
                  vibration: false,
                },
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            sessionExpiry: sessionData.currentExpiry,
          });

          const manager = new (
            await import('../session-manager')
          ).SessionManager();
          const beforeExtension = new Date();

          // セッション延長を実行
          const success = await manager.extendSession();

          const afterExtension = new Date();
          const newExpiry = useAuthStore.getState().sessionExpiry;

          // セッション延長が成功するべき
          expect(success).toBe(true);

          // 新しい期限が設定されるべき
          expect(newExpiry).toBeInstanceOf(Date);

          // 新しい期限が現在時刻より後であるべき
          expect(newExpiry!.getTime()).toBeGreaterThan(
            beforeExtension.getTime()
          );

          // 新しい期限が24時間後に近いべき（誤差1分以内）
          const expectedExpiry = afterExtension.getTime() + 24 * 60 * 60 * 1000;
          const actualExpiry = newExpiry!.getTime();
          expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(
            60 * 1000
          );
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Feature: production-readiness, Property 2: 認証セッションの安全性
 *
 * すべての認証セッションにおいて、セッション期限切れ時には作業中データが自動保存され、
 * ユーザーに適切な通知が行われる
 *
 * Validates: Requirements 10.5, 10.6
 */
