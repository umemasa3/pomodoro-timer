// Supabaseデータベース型定義
import type { User, Task, Tag, Session } from './index';

// 法的文書の型定義
export interface LegalDocument {
  id: string;
  type: 'terms' | 'privacy' | 'cookie';
  version: string;
  title: string;
  content: string;
  effective_date: string;
  is_active: boolean;
  previous_version?: string;
  created_at: string;
  updated_at: string;
}

// 同意記録の型定義
export interface ConsentRecord {
  id: string;
  user_id: string;
  documents: Array<{
    type: 'terms' | 'privacy' | 'cookie' | 'analytics' | 'marketing';
    version: string;
  }>;
  consent_date: string;
  ip_address: string;
  user_agent: string;
  method: 'signup' | 'update' | 'renewal';
  created_at: string;
}

// プライバシー設定の型定義
export interface PrivacySetting {
  id: string;
  user_id: string;
  data_processing_consent: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
  consent_date: string;
  consent_version: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  updated_at: string;
}

// データエクスポートログの型定義
export interface DataExportLog {
  id: string;
  user_id: string;
  exported_at: string;
  export_type: string;
  status: string;
  created_at: string;
}

// アカウント削除リクエストの型定義
export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  scheduled_deletion_at: string;
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'error';
  cancellation_deadline: string;
  error_message?: string;
  error_occurred_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at'>>;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id' | 'created_at'>;
        Update: Partial<Omit<Tag, 'id' | 'created_at'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id'>;
        Update: Partial<Omit<Session, 'id'>>;
      };
      task_tags: {
        Row: {
          task_id: string;
          tag_id: string;
        };
        Insert: {
          task_id: string;
          tag_id: string;
        };
        Update: never;
      };
      legal_documents: {
        Row: LegalDocument;
        Insert: Omit<LegalDocument, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<LegalDocument, 'id' | 'created_at'>>;
      };
      consent_records: {
        Row: ConsentRecord;
        Insert: Omit<ConsentRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<ConsentRecord, 'id' | 'created_at'>>;
      };
      privacy_settings: {
        Row: PrivacySetting;
        Insert: Omit<PrivacySetting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PrivacySetting, 'id' | 'created_at'>>;
      };
      data_export_logs: {
        Row: DataExportLog;
        Insert: Omit<DataExportLog, 'id' | 'created_at'>;
        Update: Partial<Omit<DataExportLog, 'id' | 'created_at'>>;
      };
      account_deletion_requests: {
        Row: AccountDeletionRequest;
        Insert: Omit<
          AccountDeletionRequest,
          'id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<Omit<AccountDeletionRequest, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      delete_user_data_completely: {
        Args: { target_user_id: string };
        Returns: void;
      };
    };
  };
}
