import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// デモモードの場合はダミーの値を使用
const finalSupabaseUrl = isDemoMode ? 'http://localhost:54321' : supabaseUrl;
const finalSupabaseAnonKey = isDemoMode ? 'demo-key' : supabaseAnonKey;

if (!isDemoMode && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Supabase環境変数が設定されていません');
}

export const supabase = isDemoMode
  ? null
  : createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
      db: {
        schema: 'public',
      },
    });

/**
 * 認証関連のヘルパー関数
 * Supabase Authとの連携を統一化
 */
export const auth = {
  // ユーザー登録
  signUp: async (
    email: string,
    password: string,
    userData?: {
      display_name?: string;
      timezone?: string;
    }
  ) => {
    if (isDemoMode) {
      // デモモードでは成功を返す
      return {
        data: {
          user: {
            id: 'demo-user-id',
            email,
            created_at: new Date().toISOString(),
            user_metadata: userData || {},
          },
          session: {
            access_token: 'demo-token',
            user: {
              id: 'demo-user-id',
              email,
              created_at: new Date().toISOString(),
              user_metadata: userData || {},
            },
          },
        },
        error: null,
      };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    // ユーザー登録成功時にusersテーブルにプロファイル作成
    if (data.user && !error) {
      try {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          display_name: userData?.display_name,
          timezone: userData?.timezone || 'UTC',
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
        } as Database['public']['Tables']['users']['Insert']);
      } catch (profileError) {
        console.error('ユーザープロファイル作成エラー:', profileError);
      }
    }

    return { data, error };
  },

  // ログイン
  signIn: async (email: string, password: string) => {
    if (isDemoMode) {
      // デモモードでは成功を返す
      return {
        data: {
          user: {
            id: 'demo-user-id',
            email,
            created_at: new Date().toISOString(),
            user_metadata: {
              display_name: 'デモユーザー',
              timezone: 'Asia/Tokyo',
            },
          },
          session: {
            access_token: 'demo-token',
            user: {
              id: 'demo-user-id',
              email,
              created_at: new Date().toISOString(),
              user_metadata: {
                display_name: 'デモユーザー',
                timezone: 'Asia/Tokyo',
              },
            },
          },
        },
        error: null,
      };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // ログアウト
  signOut: async () => {
    if (isDemoMode) {
      return { error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // パスワードリセット
  resetPassword: async (email: string) => {
    if (isDemoMode) {
      return { data: null, error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  // パスワード更新
  updatePassword: async (newPassword: string) => {
    if (isDemoMode) {
      return { data: null, error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // 現在のユーザー取得
  getCurrentUser: () => {
    if (isDemoMode) {
      return Promise.resolve({
        data: {
          user: {
            id: 'demo-user-id',
            email: 'demo@example.com',
            created_at: new Date().toISOString(),
            user_metadata: {
              display_name: 'デモユーザー',
              timezone: 'Asia/Tokyo',
            },
          },
        },
        error: null,
      });
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    return supabase.auth.getUser();
  },

  // 現在のセッション取得
  getCurrentSession: () => {
    if (isDemoMode) {
      return Promise.resolve({
        data: {
          session: {
            access_token: 'demo-token',
            user: {
              id: 'demo-user-id',
              email: 'demo@example.com',
              created_at: new Date().toISOString(),
              user_metadata: {
                display_name: 'デモユーザー',
                timezone: 'Asia/Tokyo',
              },
            },
          },
        },
        error: null,
      });
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    return supabase.auth.getSession();
  },

  // 認証状態変更の監視
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    if (isDemoMode) {
      // デモモードでは何もしない
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    return supabase.auth.onAuthStateChange(callback);
  },

  // ユーザー情報更新
  updateProfile: async (updates: {
    display_name?: string;
    avatar_url?: string;
    timezone?: string;
  }) => {
    if (isDemoMode) {
      return {
        authData: null,
        profileData: {
          id: 'demo-user-id',
          ...updates,
        },
      };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    // Supabase Authのメタデータ更新
    const { data: authData, error: authError } = await supabase.auth.updateUser(
      {
        data: updates,
      }
    );

    if (authError) {
      throw new Error(`認証情報更新エラー: ${authError.message}`);
    }

    // usersテーブルの更新
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .update(updates as Database['public']['Tables']['users']['Update'])
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      throw new Error(`プロファイル更新エラー: ${profileError.message}`);
    }

    return { authData, profileData };
  },

  // ユーザーメタデータ更新
  updateUserMetadata: async (metadata: Record<string, unknown>) => {
    if (isDemoMode) {
      return { data: null, error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });
    return { data, error };
  },

  // メール確認の再送信
  resendConfirmation: async (email: string) => {
    if (isDemoMode) {
      return { data: null, error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { data, error };
  },

  // 認証状態の確認
  isAuthenticated: async (): Promise<boolean> => {
    if (isDemoMode) {
      return true;
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  },

  // トークンの更新
  refreshSession: async () => {
    if (isDemoMode) {
      return { data: null, error: null };
    }

    if (!supabase) {
      throw new Error('Supabaseが初期化されていません');
    }

    const { data, error } = await supabase.auth.refreshSession();
    return { data, error };
  },
};
