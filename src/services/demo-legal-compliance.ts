/**
 * デモモード用法的コンプライアンス機能
 * 実際のデータベースなしで法的コンプライアンス機能をシミュレート
 */

import type {
  LegalDocument,
  ConsentRecord,
  PrivacySetting,
  DataExportLog,
  AccountDeletionRequest,
} from '../types/database';

// デモ用のメモリストレージ
class DemoStorage {
  private legalDocuments: Map<string, LegalDocument> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private privacySettings: Map<string, PrivacySetting> = new Map();
  private dataExportLogs: Map<string, DataExportLog[]> = new Map();
  private accountDeletionRequests: Map<string, AccountDeletionRequest> =
    new Map();

  constructor() {
    this.initializeDefaultDocuments();
  }

  private initializeDefaultDocuments() {
    // デフォルトの法的文書を初期化
    const defaultDocuments: LegalDocument[] = [
      {
        id: 'terms-1.0',
        type: 'terms',
        version: '1.0',
        title: '利用規約',
        content:
          '# 利用規約\n\n本規約は、当社が提供するポモドーロタイマーサービスの利用条件を定めるものです。',
        effective_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'privacy-1.0',
        type: 'privacy',
        version: '1.0',
        title: 'プライバシーポリシー',
        content:
          '# プライバシーポリシー\n\n当社は、ユーザーの個人情報の重要性を認識し、適切に取り扱います。',
        effective_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'cookie-1.0',
        type: 'cookie',
        version: '1.0',
        title: 'Cookieポリシー',
        content:
          '# Cookieポリシー\n\nCookieとは、ウェブサイトがユーザーのコンピューターに保存する小さなテキストファイルです。',
        effective_date: new Date().toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    defaultDocuments.forEach(doc => {
      this.legalDocuments.set(doc.id, doc);
    });
  }

  // 法的文書関連
  getLegalDocuments(): LegalDocument[] {
    return Array.from(this.legalDocuments.values());
  }

  getLegalDocumentById(id: string): LegalDocument | null {
    return this.legalDocuments.get(id) || null;
  }

  createLegalDocument(
    document: Omit<LegalDocument, 'id' | 'created_at' | 'updated_at'>
  ): LegalDocument {
    const id = `${document.type}-${document.version}-${Date.now()}`;
    const newDocument: LegalDocument = {
      ...document,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.legalDocuments.set(id, newDocument);
    return newDocument;
  }

  // 同意記録関連
  getConsentRecords(userId: string): ConsentRecord[] {
    return this.consentRecords.get(userId) || [];
  }

  createConsentRecord(
    record: Omit<ConsentRecord, 'id' | 'created_at'>
  ): ConsentRecord {
    const id = `consent-${Date.now()}`;
    const newRecord: ConsentRecord = {
      ...record,
      id,
      created_at: new Date().toISOString(),
    };

    const userRecords = this.consentRecords.get(record.user_id) || [];
    userRecords.push(newRecord);
    this.consentRecords.set(record.user_id, userRecords);

    return newRecord;
  }

  // プライバシー設定関連
  getPrivacySettings(userId: string): PrivacySetting | null {
    return this.privacySettings.get(userId) || null;
  }

  upsertPrivacySettings(
    settings: Omit<PrivacySetting, 'id' | 'created_at' | 'updated_at'>
  ): PrivacySetting {
    const existing = this.privacySettings.get(settings.user_id);
    const id = existing?.id || `privacy-${Date.now()}`;

    const newSettings: PrivacySetting = {
      ...settings,
      id,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.privacySettings.set(settings.user_id, newSettings);
    return newSettings;
  }

  // データエクスポートログ関連
  getDataExportLogs(userId: string): DataExportLog[] {
    return this.dataExportLogs.get(userId) || [];
  }

  createDataExportLog(
    log: Omit<DataExportLog, 'id' | 'created_at'>
  ): DataExportLog {
    const id = `export-${Date.now()}`;
    const newLog: DataExportLog = {
      ...log,
      id,
      created_at: new Date().toISOString(),
    };

    const userLogs = this.dataExportLogs.get(log.user_id) || [];
    userLogs.push(newLog);
    this.dataExportLogs.set(log.user_id, userLogs);

    return newLog;
  }

  // アカウント削除要求関連
  getAccountDeletionRequest(userId: string): AccountDeletionRequest | null {
    return this.accountDeletionRequests.get(userId) || null;
  }

  createAccountDeletionRequest(
    request: Omit<AccountDeletionRequest, 'id' | 'created_at' | 'updated_at'>
  ): AccountDeletionRequest {
    const id = `deletion-${Date.now()}`;
    const newRequest: AccountDeletionRequest = {
      ...request,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.accountDeletionRequests.set(request.user_id, newRequest);
    return newRequest;
  }

  updateAccountDeletionRequest(
    userId: string,
    updates: Partial<AccountDeletionRequest>
  ): AccountDeletionRequest | null {
    const existing = this.accountDeletionRequests.get(userId);
    if (!existing) return null;

    const updated: AccountDeletionRequest = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.accountDeletionRequests.set(userId, updated);
    return updated;
  }

  deleteAccountDeletionRequest(userId: string): boolean {
    return this.accountDeletionRequests.delete(userId);
  }

  // 全データ削除（アカウント削除時）
  deleteAllUserData(userId: string): void {
    this.consentRecords.delete(userId);
    this.privacySettings.delete(userId);
    this.dataExportLogs.delete(userId);
    this.accountDeletionRequests.delete(userId);
  }
}

// シングルトンインスタンス
export const demoStorage = new DemoStorage();

/**
 * デモモード判定ヘルパー
 */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * デモモード用のエラー生成
 */
export function createDemoModeError(operation: string): Error {
  return new Error(
    `${operation}はデモモードでは利用できません。実際のSupabaseデータベースが必要です。`
  );
}
