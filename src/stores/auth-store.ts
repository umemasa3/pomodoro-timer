import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { auth } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

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
    password: string
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
}

type UserMetadata = Record<string, unknown>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

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
        set({ isLoading: true });

        try {
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

      signIn: async (email, password) => {
        set({ isLoading: true });

        try {
          const { data, error } = await auth.signIn(email, password);

          if (error) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || 'ログインに失敗しました',
            };
          }

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
              });
            }
          }

          return { success: true };
        } catch (error) {
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
          await auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error('ログアウトエラー:', error);
          // エラーが発生してもローカル状態はクリア
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
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

            set({
              user: userProfile,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }

          // 認証状態変更の監視を開始
          auth.onAuthStateChange((event, session) => {
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

              set({
                user: userProfile,
                isAuthenticated: true,
                isLoading: false,
              });
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
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
      }),
    }
  )
);
