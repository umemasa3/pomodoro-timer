/**
 * E2Eテスト用のモックSupabaseサービス
 * 実際のSupabaseサーバーなしでテストを実行可能にする
 */

import type { User } from '../types';

// モックユーザーデータ
const mockUsers = new Map<
  string,
  { email: string; password: string; user: User }
>();

// デフォルトテストユーザーを追加
mockUsers.set('test@example.com', {
  email: 'test@example.com',
  password: 'testpassword123',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    display_name: 'テストユーザー',
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
  },
});

// 現在のセッション状態
let currentSession: { user: User } | null = null;

/**
 * モック認証サービス
 */
export const mockAuth = {
  // ユーザー登録
  signUp: async (
    email: string,
    password: string,
    userData?: {
      display_name?: string;
      timezone?: string;
    }
  ) => {
    // 既存ユーザーチェック
    if (mockUsers.has(email)) {
      return {
        data: { user: null, session: null },
        error: { message: 'ユーザーは既に存在します' },
      };
    }

    // 新規ユーザー作成
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      display_name: userData?.display_name || email.split('@')[0],
      avatar_url: undefined,
      timezone: userData?.timezone || 'Asia/Tokyo',
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

    mockUsers.set(email, { email, password, user: newUser });

    return {
      data: {
        user: newUser,
        session: { user: newUser },
      },
      error: null,
    };
  },

  // ログイン
  signInWithPassword: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    const userData = mockUsers.get(email);

    if (!userData || userData.password !== password) {
      return {
        data: { user: null, session: null },
        error: { message: 'メールアドレスまたはパスワードが正しくありません' },
      };
    }

    currentSession = { user: userData.user };

    return {
      data: {
        user: userData.user,
        session: currentSession,
      },
      error: null,
    };
  },

  // ログアウト
  signOut: async () => {
    currentSession = null;
    return { error: null };
  },

  // パスワードリセット
  resetPasswordForEmail: async (email: string) => {
    if (!mockUsers.has(email)) {
      return {
        data: null,
        error: { message: 'ユーザーが見つかりません' },
      };
    }

    return {
      data: { message: 'パスワードリセットメールを送信しました' },
      error: null,
    };
  },

  // パスワード更新
  updateUser: async ({ password, data }: { password?: string; data?: any }) => {
    if (!currentSession) {
      return {
        data: { user: null },
        error: { message: '認証が必要です' },
      };
    }

    // パスワード更新
    if (password) {
      const userData = mockUsers.get(currentSession.user.email);
      if (userData) {
        userData.password = password;
      }
    }

    // メタデータ更新
    if (data) {
      Object.assign(currentSession.user, data);
    }

    return {
      data: { user: currentSession.user },
      error: null,
    };
  },

  // 現在のユーザー取得
  getUser: async () => {
    return {
      data: { user: currentSession?.user || null },
      error: null,
    };
  },

  // 現在のセッション取得
  getSession: async () => {
    return {
      data: { session: currentSession },
      error: null,
    };
  },

  // 認証状態変更の監視（モック）
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    // モックでは即座にコールバックを呼び出す
    setTimeout(() => {
      callback('INITIAL_SESSION', currentSession);
    }, 100);

    return {
      data: { subscription: { unsubscribe: () => {} } },
    };
  },

  // セッション更新
  refreshSession: async () => {
    return {
      data: { session: currentSession },
      error: null,
    };
  },

  // メール確認の再送信
  resend: async () => {
    return {
      data: { message: '確認メールを再送信しました' },
      error: null,
    };
  },
};

/**
 * モックSupabaseクライアント
 */
export const mockSupabase = {
  auth: mockAuth,
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
};
