// Supabaseデータベース型定義
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name?: string;
          avatar_url?: string;
          timezone: string;
          settings: Record<string, unknown>; // JSONB型のためRecord型を使用
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string;
          avatar_url?: string;
          timezone?: string;
          settings?: Record<string, unknown>;
        };
        Update: {
          email?: string;
          display_name?: string;
          avatar_url?: string;
          timezone?: string;
          settings?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
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
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string;
          estimated_pomodoros?: number;
          completed_pomodoros?: number;
          status?: 'pending' | 'in_progress' | 'paused' | 'completed';
          priority?: 'low' | 'medium' | 'high';
        };
        Update: {
          title?: string;
          description?: string;
          estimated_pomodoros?: number;
          completed_pomodoros?: number;
          status?: 'pending' | 'in_progress' | 'paused' | 'completed';
          priority?: 'low' | 'medium' | 'high';
          completed_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          usage_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          usage_count?: number;
        };
        Update: {
          name?: string;
          color?: string;
          usage_count?: number;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          task_id?: string;
          type: 'pomodoro' | 'short_break' | 'long_break';
          planned_duration: number;
          actual_duration?: number;
          completed: boolean;
          task_completion_status?: 'completed' | 'continued' | 'paused';
          started_at: string;
          completed_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_id?: string;
          type: 'pomodoro' | 'short_break' | 'long_break';
          planned_duration: number;
          actual_duration?: number;
          completed?: boolean;
          task_completion_status?: 'completed' | 'continued' | 'paused';
          started_at?: string;
        };
        Update: {
          actual_duration?: number;
          completed?: boolean;
          task_completion_status?: 'completed' | 'continued' | 'paused';
          completed_at?: string;
        };
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: never;
      };
    };
  };
}
