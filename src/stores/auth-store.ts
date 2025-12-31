import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { auth } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // 新規追加: セキュリティ機能
  loginAttempts: number;
  lastLoginAttempt: Date | null;
  isLocked: boolean;
  lockUntil: Date | null;
  rememberMe: boolean;
  sessionExpiry: Date | null;

  // アクション
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signUp: (
    email: string,
    password: string,
    userData?: {
      display_name?: string;
      timezone?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    display_name?: string;
    avatar_url?: string;
    timezone?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserSettings: (
    settings: Partial<User['settings']>
  ) => Promise<{ success: boolean; error?: string }>;
  initializeAuth: () => Promise<void>;

  // 新規追加: セキュリティ機能
  checkAccountLock: () => boolean;
  incrementLoginAttempts: () => void;
  resetLoginAttempts: () => void;
  lockAccount: () => void;
  unlockAccount: () => void;
  validatePasswordStrength: (password: string) => {
    isValid: boolean;
    errors: string[];
    score: number;
  };
}

type UserMetadata = Record<string, unknown>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      // セキュリティ機能の初期値
      loginAttempts: 0,
      lastLoginAttempt: null,
      isLocked: false,
      lockUntil: null,
      rememberMe: false,
      sessionExpiry: null,

      setUser: user => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      setLoading: loading => {
        set({ isLoading: loading });
      },

      signUp: async (email, password, userData) => {
        const { validatePasswordStrength } = get();

        // パスワード強度チェック
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          return {
            success: false,
            error: `パスワードが要件を満たしていません: ${passwordValidation.errors.join(', ')}`,
          };
        }

        set({ isLoading: true });

        try {
          // テスト環境の場合はモック認証を使用
          if (import.meta.env.VITE_APP_ENV === 'test') {
            const { mockAuth } = await import('../services/supabase-mock');
            const { data, error } = await mockAuth.signUp(
              email,
              password,
              userData
            );

            if (error) {
              set({ isLoading: false });
              return {
                success: false,
                error: error.message || 'ユーザー登録に失敗しました',
              };
            }

            if (data.user) {
              set({
                user: data.user as User,
                isAuthenticated: true,
                isLoading: false,
              });
              return { success: true };
            }
          }

          const { data, error } = await auth.signUp(email, password, userData);

          if (error) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || 'ユーザー登録に失敗しました',
            };
          }

          // メール確認が必要な場合
          if (data.user && !data.session) {
            set({ isLoading: false });
            return {
              success: true,
              error:
                'メールアドレスに確認リンクを送信しました。メールを確認してアカウントを有効化してください。',
            };
          }

          // 自動ログインされた場合
          if (data.user && data.session) {
            // ユーザープロファイルを取得
            const {
              data: { user: authUser },
            } = await auth.getCurrentUser();
            if (authUser) {
              const metadata = authUser.user_metadata as UserMetadata;
              const userProfile: User = {
                id: authUser.id,
                email: authUser.email!,
                display_name:
                  userData?.display_name ||
                  (metadata?.display_name as string | undefined),
                avatar_url: metadata?.avatar_url as string | undefined,
                timezone:
                  userData?.timezone || (metadata?.timezone as string) || 'UTC',
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
                created_at: authUser.created_at,
                updated_at: new Date().toISOString(),
              };

              set({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
              });
            }
          }

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'ユーザー登録に失敗しました',
          };
        }
      },

      signIn: async (email, password, rememberMe = false) => {
        const {
          checkAccountLock,
          incrementLoginAttempts,
          resetLoginAttempts,
          lockAccount,
        } = get();

        // アカウントロック状態をチェック
        if (checkAccountLock()) {
          const { lockUntil } = get();
          const remainingTime = lockUntil
            ? Math.ceil((lockUntil.getTime() - Date.now()) / 1000 / 60)
            : 0;
          return {
            success: false,
            error: `アカウントがロックされています。あと${remainingTime}分後に再試行してください。`,
          };
        }

        set({ isLoading: true });

        try {
          // テスト環境の場合はモック認証を使用
          if (import.meta.env.VITE_APP_ENV === 'test') {
            const { mockAuth } = await import('../services/supabase-mock');
            const { data, error } = await mockAuth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              incrementLoginAttempts();
              const { loginAttempts } = get();

              if (loginAttempts >= 5) {
                lockAccount();
                set({ isLoading: false });
                return {
                  success: false,
                  error:
                    'ログイン試行回数が上限に達しました。アカウントがロックされました。',
                };
              }

              set({ isLoading: false });
              return {
                success: false,
                error: error.message || 'ログインに失敗しました',
              };
            }

            if (data.user) {
              resetLoginAttempts();
              set({
                user: data.user as User,
                isAuthenticated: true,
                isLoading: false,
                rememberMe,
                sessionExpiry: rememberMe
                  ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日
                  : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間
              });

              return { success: true };
            }
          }

          // 本番環境での認証処理
          const { data, error } = await auth.signIn(email, password);

          if (error) {
            // ログイン失敗時の処理
            incrementLoginAttempts();
            const { loginAttempts } = get();

            // 5回失敗でアカウントロック
            if (loginAttempts >= 5) {
              lockAccount();
              set({ isLoading: false });
              return {
                success: false,
                error:
                  'ログインに5回失敗したため、アカウントを15分間ロックしました。',
              };
            }

            set({ isLoading: false });
            return {
              success: false,
              error: `${error.message || 'ログインに失敗しました'} (残り${5 - loginAttempts}回)`,
            };
          }

          if (data.user && data.session) {
            // ログイン成功時の処理
            resetLoginAttempts();

            // セッション期限の設定
            const sessionDuration = rememberMe
              ? 30 * 24 * 60 * 60 * 1000
              : 24 * 60 * 60 * 1000; // 30日 or 1日
            const sessionExpiry = new Date(Date.now() + sessionDuration);

            // ユーザープロファイルを取得
            const {
              data: { user: authUser },
            } = await auth.getCurrentUser();
            if (authUser) {
              const metadata = authUser.user_metadata as UserMetadata;
              const userProfile: User = {
                id: authUser.id,
                email: authUser.email!,
                display_name: metadata?.display_name as string | undefined,
                avatar_url: metadata?.avatar_url as string | undefined,
                timezone: (metadata?.timezone as string) || 'UTC',
                settings: (metadata?.settings as User['settings']) || {
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
                created_at: authUser.created_at,
                updated_at: new Date().toISOString(),
              };

              set({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
                rememberMe,
                sessionExpiry,
              });

              // セッション監視を開始
              const { sessionManager } =
                await import('../services/session-manager');
              sessionManager.startSessionMonitoring();
            }
          }

          return { success: true };
        } catch (error) {
          incrementLoginAttempts();
          set({ isLoading: false });
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'ログインに失敗しました',
          };
        }
      },

      signOut: async () => {
        set({ isLoading: true });

        try {
          // セッション監視を停止
          const { sessionManager } =
            await import('../services/session-manager');
          sessionManager.stopSessionMonitoring();

          await auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            // セキュリティ状態をリセット
            loginAttempts: 0,
            lastLoginAttempt: null,
            isLocked: false,
            lockUntil: null,
            rememberMe: false,
            sessionExpiry: null,
          });
        } catch (error) {
          console.error('ログアウトエラー:', error);
          // エラーが発生してもローカル状態はクリア
          const { sessionManager } =
            await import('../services/session-manager');
          sessionManager.stopSessionMonitoring();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            // セキュリティ状態をリセット
            loginAttempts: 0,
            lastLoginAttempt: null,
            isLocked: false,
            lockUntil: null,
            rememberMe: false,
            sessionExpiry: null,
          });
        }
      },

      resetPassword: async email => {
        try {
          const { error } = await auth.resetPassword(email);

          if (error) {
            return {
              success: false,
              error: error.message || 'パスワードリセットに失敗しました',
            };
          }

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'パスワードリセットに失敗しました',
          };
        }
      },

      updatePassword: async newPassword => {
        try {
          const { error } = await auth.updatePassword(newPassword);

          if (error) {
            return {
              success: false,
              error: error.message || 'パスワード更新に失敗しました',
            };
          }

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'パスワード更新に失敗しました',
          };
        }
      },

      updateProfile: async updates => {
        const { user } = get();
        if (!user) {
          return { success: false, error: '認証が必要です' };
        }

        try {
          const { profileData } = await auth.updateProfile(updates);

          // ローカル状態を更新
          set({
            user: {
              ...user,
              ...(profileData as Partial<User>),
              updated_at: new Date().toISOString(),
            },
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : 'プロファイル更新に失敗しました',
          };
        }
      },

      updateUserSettings: async settingsUpdates => {
        const { user } = get();
        if (!user) {
          return { success: false, error: '認証が必要です' };
        }

        try {
          // 新しい設定をマージ
          const newSettings = {
            ...user.settings,
            ...settingsUpdates,
          };

          // Supabaseのuser_metadataを更新
          const { error } = await auth.updateUserMetadata({
            settings: newSettings,
          });

          if (error) {
            return {
              success: false,
              error: error.message || '設定の更新に失敗しました',
            };
          }

          // ローカル状態を更新
          set({
            user: {
              ...user,
              settings: newSettings,
              updated_at: new Date().toISOString(),
            },
          });

          return { success: true };
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : '設定の更新に失敗しました',
          };
        }
      },

      // セキュリティ機能の実装
      checkAccountLock: () => {
        const { isLocked, lockUntil } = get();

        if (!isLocked || !lockUntil) {
          return false;
        }

        // ロック期限が過ぎている場合は自動的にロック解除
        if (Date.now() > lockUntil.getTime()) {
          set({
            isLocked: false,
            lockUntil: null,
            loginAttempts: 0,
          });
          return false;
        }

        return true;
      },

      incrementLoginAttempts: () => {
        const { loginAttempts } = get();
        set({
          loginAttempts: loginAttempts + 1,
          lastLoginAttempt: new Date(),
        });
      },

      resetLoginAttempts: () => {
        set({
          loginAttempts: 0,
          lastLoginAttempt: null,
        });
      },

      lockAccount: () => {
        const lockDuration = 15 * 60 * 1000; // 15分
        const lockUntil = new Date(Date.now() + lockDuration);

        set({
          isLocked: true,
          lockUntil,
          loginAttempts: 0,
        });
      },

      unlockAccount: () => {
        set({
          isLocked: false,
          lockUntil: null,
          loginAttempts: 0,
        });
      },

      validatePasswordStrength: (password: string) => {
        const errors: string[] = [];
        let score = 0;

        // 最小長チェック
        if (password.length < 8) {
          errors.push('8文字以上である必要があります');
        } else {
          score += 1;
        }

        // 大文字チェック
        if (!/[A-Z]/.test(password)) {
          errors.push('大文字を含む必要があります');
        } else {
          score += 1;
        }

        // 小文字チェック
        if (!/[a-z]/.test(password)) {
          errors.push('小文字を含む必要があります');
        } else {
          score += 1;
        }

        // 数字チェック
        if (!/\d/.test(password)) {
          errors.push('数字を含む必要があります');
        } else {
          score += 1;
        }

        // 特殊文字チェック
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
          errors.push('特殊文字を含む必要があります');
        } else {
          score += 1;
        }

        // 禁止パターンチェック
        const forbiddenPatterns = [
          /123456/,
          /password/i,
          /qwerty/i,
          /admin/i,
          /user/i,
        ];

        for (const pattern of forbiddenPatterns) {
          if (pattern.test(password)) {
            errors.push('一般的なパスワードパターンは使用できません');
            score = Math.max(0, score - 2);
            break;
          }
        }

        return {
          isValid: errors.length === 0 && score >= 4,
          errors,
          score,
        };
      },

      initializeAuth: async () => {
        set({ isLoading: true });

        try {
          // デモモードの場合は自動的にデモユーザーでログイン
          if (import.meta.env.VITE_DEMO_MODE === 'true') {
            const demoUser: User = {
              id: 'demo-user-id',
              email: 'demo@example.com',
              display_name: 'デモユーザー',
              avatar_url: undefined,
              timezone: 'Asia/Tokyo',
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
            };

            set({
              user: demoUser,
              isAuthenticated: true,
              isLoading: false,
            });

            // デモモードでもセッション監視を開始
            const { sessionManager } =
              await import('../services/session-manager');
            sessionManager.startSessionMonitoring();

            return;
          }

          // テスト環境の場合は認証なしで開始
          if (import.meta.env.VITE_APP_ENV === 'test') {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          // 現在のセッションを確認
          const {
            data: { session },
          } = await auth.getCurrentSession();

          if (session?.user) {
            const authUser = session.user;
            const metadata = authUser.user_metadata as UserMetadata;
            const userProfile: User = {
              id: authUser.id,
              email: authUser.email!,
              display_name: metadata?.display_name as string | undefined,
              avatar_url: metadata?.avatar_url as string | undefined,
              timezone: (metadata?.timezone as string) || 'UTC',
              settings: (metadata?.settings as User['settings']) || {
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
              created_at: authUser.created_at,
              updated_at: new Date().toISOString(),
            };

            // セッション期限を設定（既存のセッションの場合は24時間後）
            const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

            set({
              user: userProfile,
              isAuthenticated: true,
              isLoading: false,
              sessionExpiry,
            });

            // セッション監視を開始
            const { sessionManager } =
              await import('../services/session-manager');
            sessionManager.startSessionMonitoring();

            // 保存された作業データがあれば復元を提案
            await sessionManager.restoreWorkInProgress();
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }

          // 認証状態変更の監視を開始
          auth.onAuthStateChange(async (event, session) => {
            if (
              event === 'SIGNED_IN' &&
              session &&
              typeof session === 'object' &&
              'user' in session &&
              session.user
            ) {
              const authUser = session.user as {
                id: string;
                email: string;
                created_at: string;
                user_metadata: Record<string, unknown>;
              };
              const metadata = authUser.user_metadata;
              const userProfile: User = {
                id: authUser.id,
                email: authUser.email!,
                display_name: metadata?.display_name as string | undefined,
                avatar_url: metadata?.avatar_url as string | undefined,
                timezone: (metadata?.timezone as string) || 'UTC',
                settings: (metadata?.settings as User['settings']) || {
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
                created_at: authUser.created_at,
                updated_at: new Date().toISOString(),
              };

              // セッション期限を設定
              const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

              set({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
                sessionExpiry,
              });

              // セッション監視を開始
              const { sessionManager } =
                await import('../services/session-manager');
              sessionManager.startSessionMonitoring();
            } else if (event === 'SIGNED_OUT') {
              // セッション監視を停止
              const { sessionManager } =
                await import('../services/session-manager');
              sessionManager.stopSessionMonitoring();

              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                // セキュリティ状態をリセット
                loginAttempts: 0,
                lastLoginAttempt: null,
                isLocked: false,
                lockUntil: null,
                rememberMe: false,
                sessionExpiry: null,
              });
            }
          });
        } catch (error) {
          console.error('認証初期化エラー:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        loginAttempts: state.loginAttempts,
        lastLoginAttempt: state.lastLoginAttempt,
        isLocked: state.isLocked,
        lockUntil: state.lockUntil,
        rememberMe: state.rememberMe,
        sessionExpiry: state.sessionExpiry,
      }),
    }
  )
);
