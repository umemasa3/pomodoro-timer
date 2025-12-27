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
}

export interface TimerState {
  currentTime: number;
  isRunning: boolean;
  sessionType: 'pomodoro' | 'short_break' | 'long_break';
  completedSessions: number;
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
  status?: 'pending' | 'in_progress' | 'paused' | 'completed';
  priority?: 'low' | 'medium' | 'high';
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
