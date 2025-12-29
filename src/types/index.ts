// 基本的な型定義

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  timezone: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  pomodoro_minutes: number; // 15-60
  short_break_minutes: number; // 3-10
  long_break_minutes: number; // 10-30
  sessions_until_long_break: number; // 2-8
  sound_enabled: boolean;
  sound_type: 'bell' | 'chime' | 'notification';
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags?: Tag[]; // タスクに関連付けられたタグ
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string; // HEX color code
  usage_count: number;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  task_id?: string;
  type: 'pomodoro' | 'short_break' | 'long_break';
  planned_duration: number; // minutes
  actual_duration: number; // minutes
  completed: boolean;
  started_at: string;
  completed_at?: string;
  task_completion_status?: 'completed' | 'continued' | 'paused';
  mode: 'task-based' | 'standalone'; // セッションのモード
  session_name?: string; // スタンドアロンモード時のセッション名
}

export interface TimerState {
  currentTime: number;
  isRunning: boolean;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
  completedSessions: number;
  mode: 'task-based' | 'standalone'; // タスク依存モードまたはスタンドアロンモード
}

// API関連の型
export interface CreateTaskRequest {
  title: string;
  description?: string;
  estimated_pomodoros?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  estimated_pomodoros?: number;
  completed_pomodoros?: number;
  status?: 'pending' | 'in_progress' | 'paused' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  completed_at?: string;
}

// 統計関連の型
export interface SessionStatistics {
  totalSessions: number;
  completedSessions: number;
  totalWorkTime: number; // minutes
  averageSessionLength: number; // minutes
  streakDays: number;
  longestStreak: number;
}

export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  averageTaskCompletion: number; // percentage
  tasksByPriority: Record<'low' | 'medium' | 'high', number>;
}

export interface TagStatistics {
  tagUsage: Record<string, number>;
  mostProductiveTag: string;
  timeByTag: Record<string, number>; // minutes
}

// マルチデバイス同期関連の型
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  lastSeen: string;
  userAgent: string;
}

export interface ConflictInfo {
  id: string;
  type: 'task' | 'session' | 'tag';
  localVersion: any;
  remoteVersion: any;
  conflictFields: string[];
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  conflicts: number;
  lastSyncTime?: string;
  connectedDevices: number;
}

export type ConflictResolutionStrategy =
  | 'last-write-wins' // 最後の書き込みが勝利
  | 'user-choice' // ユーザーが選択
  | 'merge-changes'; // 変更をマージ

// PWA関連の型定義をエクスポート
export * from './pwa';
