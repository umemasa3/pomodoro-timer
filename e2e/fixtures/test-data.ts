/**
 * E2Eテスト用のテストデータ
 */

export const testUsers = {
  // 基本テストユーザー
  basic: {
    email: 'test@example.com',
    password: 'testpassword123',
    displayName: 'テストユーザー',
  },

  // 管理者ユーザー
  admin: {
    email: 'admin@example.com',
    password: 'adminpassword123',
    displayName: '管理者',
  },

  // 新規ユーザー（サインアップテスト用）
  newUser: {
    email: 'newuser@example.com',
    password: 'newuserpassword123',
    displayName: '新規ユーザー',
  },
};

export const testTasks = {
  // 基本タスク
  basic: {
    title: 'テストタスク1',
    description: 'これはテスト用のタスクです',
    estimatedPomodoros: 2,
    tags: ['開発', 'テスト'],
  },

  // 長時間タスク
  longTask: {
    title: '長時間タスク',
    description: '複数のポモドーロが必要なタスク',
    estimatedPomodoros: 5,
    tags: ['プロジェクト', '重要'],
  },

  // 短時間タスク
  shortTask: {
    title: '短時間タスク',
    description: '1ポモドーロで完了するタスク',
    estimatedPomodoros: 1,
    tags: ['簡単', 'クイック'],
  },

  // タグなしタスク
  noTagTask: {
    title: 'タグなしタスク',
    description: 'タグが設定されていないタスク',
    estimatedPomodoros: 1,
    tags: [],
  },
};

export const testTags = [
  { name: '開発', color: '#3B82F6' },
  { name: 'テスト', color: '#10B981' },
  { name: 'プロジェクト', color: '#F59E0B' },
  { name: '重要', color: '#EF4444' },
  { name: '簡単', color: '#8B5CF6' },
  { name: 'クイック', color: '#06B6D4' },
];

export const testSettings = {
  // デフォルト設定
  default: {
    pomodoroMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
    soundEnabled: true,
    soundType: 'bell' as const,
    theme: 'light' as const,
  },

  // カスタム設定
  custom: {
    pomodoroMinutes: 30,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    sessionsUntilLongBreak: 3,
    soundEnabled: false,
    soundType: 'chime' as const,
    theme: 'dark' as const,
  },

  // 短時間設定（テスト用）
  quick: {
    pomodoroMinutes: 1, // テスト用の短時間
    shortBreakMinutes: 1,
    longBreakMinutes: 2,
    sessionsUntilLongBreak: 2,
    soundEnabled: true,
    soundType: 'notification' as const,
    theme: 'auto' as const,
  },
};

export const testSessions = [
  {
    type: 'pomodoro' as const,
    taskTitle: 'テストタスク1',
    duration: 25,
    completed: true,
  },
  {
    type: 'shortBreak' as const,
    taskTitle: null,
    duration: 5,
    completed: true,
  },
  {
    type: 'pomodoro' as const,
    taskTitle: 'テストタスク1',
    duration: 25,
    completed: false,
  },
];

/**
 * ランダムなテストデータ生成用のヘルパー関数
 */
export const generateTestData = {
  /**
   * ランダムなユーザーデータを生成
   */
  user: () => ({
    email: `test${Date.now()}@example.com`,
    password: `password${Math.random().toString(36).substring(7)}`,
    displayName: `テストユーザー${Math.floor(Math.random() * 1000)}`,
  }),

  /**
   * ランダムなタスクデータを生成
   */
  task: () => ({
    title: `タスク${Math.floor(Math.random() * 1000)}`,
    description: `説明${Math.random().toString(36).substring(7)}`,
    estimatedPomodoros: Math.floor(Math.random() * 5) + 1,
    tags: ['テスト', '自動生成'].slice(0, Math.floor(Math.random() * 2) + 1),
  }),

  /**
   * ランダムなタグデータを生成
   */
  tag: () => ({
    name: `タグ${Math.floor(Math.random() * 1000)}`,
    color: `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`,
  }),
};
