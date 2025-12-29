import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { env, isProduction, isDevelopment, isDemo } from '../utils/env';

// デモモードの場合は検証をスキップ
if (!isDemo && (!env.supabaseUrl || !env.supabaseAnonKey)) {
  throw new Error('Supabase環境変数が設定されていません');
}

// Supabaseクライアントの設定
const supabaseConfig = {
  db: {
    schema: 'public' as const,
  },
  auth: {
    // 本番環境では自動リフレッシュを有効化
    autoRefreshToken: true,
    // セッション永続化の設定
    persistSession: true,
    // 本番環境ではより厳密な設定
    detectSessionInUrl: isProduction,
    // 開発環境ではデバッグ情報を有効化
    debug: isDevelopment,
  },
  realtime: {
    // リアルタイム接続の最適化
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': `${env.appName}@${env.appVersion}`,
    },
  },
};

export const supabase = isDemo
  ? null // デモモードではSupabaseクライアントを無効化
  : createClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey,
      supabaseConfig
    );

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
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    // ユーザー登録成功時にusersテーブルにプロファイル作成
    if (data.user && !error) {
      try {
        await supabase!.from('users').insert({
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
        } as any);
      } catch (profileError) {
        console.error('ユーザープロファイル作成エラー:', profileError);
      }
    }

    return { data, error };
  },

  // ログイン
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // ログアウト
  signOut: async () => {
    const { error } = await supabase!.auth.signOut();
    return { error };
  },

  // パスワードリセット
  resetPassword: async (email: string) => {
    const { data, error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  // パスワード更新
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase!.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },

  // 現在のユーザー取得
  getCurrentUser: () => {
    return supabase!.auth.getUser();
  },

  // 現在のセッション取得
  getCurrentSession: () => {
    return supabase!.auth.getSession();
  },

  // 認証状態変更の監視
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    return supabase!.auth.onAuthStateChange(callback);
  },

  // ユーザー情報更新
  updateProfile: async (updates: {
    display_name?: string;
    avatar_url?: string;
    timezone?: string;
  }) => {
    const {
      data: { user },
    } = await supabase!.auth.getUser();

    if (!user) {
      throw new Error('認証が必要です');
    }

    // Supabase Authのメタデータ更新
    const { data: authData, error: authError } =
      await supabase!.auth.updateUser({
        data: updates,
      });

    if (authError) {
      throw new Error(`認証情報更新エラー: ${authError.message}`);
    }

    // usersテーブルの更新
    const { data: profileData, error: profileError } = await (
      supabase!.from('users') as any
    )
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
    const { data, error } = await supabase!.auth.updateUser({
      data: metadata,
    });
    return { data, error };
  },

  // メール確認の再送信
  resendConfirmation: async (email: string) => {
    const { data, error } = await supabase!.auth.resend({
      type: 'signup',
      email,
    });
    return { data, error };
  },

  // 認証状態の確認
  isAuthenticated: async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase!.auth.getSession();
    return !!session;
  },

  // トークンの更新
  refreshSession: async () => {
    const { data, error } = await supabase!.auth.refreshSession();
    return { data, error };
  },
};
