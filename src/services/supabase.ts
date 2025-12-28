import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase環境変数が設定されていません');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

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
        });
      } catch (profileError) {
        console.error('ユーザープロファイル作成エラー:', profileError);
      }
    }

    return { data, error };
  },

  // ログイン
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // ログアウト
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // パスワードリセット
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  // パスワード更新
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // 現在のユーザー取得
  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  // 現在のセッション取得
  getCurrentSession: () => {
    return supabase.auth.getSession();
  },

  // 認証状態変更の監視
  onAuthStateChange: (
    callback: (event: string, session: Session | null) => void
  ) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  // ユーザー情報更新
  updateProfile: async (updates: {
    display_name?: string;
    avatar_url?: string;
    timezone?: string;
  }) => {
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
      .update(updates)
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
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });
    return { data, error };
  },

  // メール確認の再送信
  resendConfirmation: async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { data, error };
  },

  // 認証状態の確認
  isAuthenticated: async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  },

  // トークンの更新
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return { data, error };
  },
};
