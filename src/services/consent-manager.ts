import { supabase } from './supabase';
import type { ConsentRecord, LegalDocument, PrivacySettings } from '../types';

/**
 * 同意管理サービス
 * 利用規約、プライバシーポリシーへの同意を管理
 */
export class ConsentManager {
  /**
   * 最新の法的文書への同意が必要かチェック
   * @param userId - ユーザーID
   * @returns 同意が必要な場合はtrue
   */
  async requiresConsent(userId: string): Promise<boolean> {
    try {
      // 最新の法的文書を取得
      const latestDocuments = await this.getLatestLegalDocuments();

      // ユーザーの最新の同意記録を取得
      const userConsent = await this.getLatestUserConsent(userId);

      if (!userConsent) {
        // 同意記録がない場合は同意が必要
        return true;
      }

      // 各文書タイプについて最新バージョンへの同意をチェック
      for (const document of latestDocuments) {
        const consentedDocument = userConsent.documents.find(
          d => d.type === document.type
        );

        if (
          !consentedDocument ||
          consentedDocument.version !== document.version
        ) {
          // 同意していない、または古いバージョンへの同意の場合
          return true;
        }

        // 有効期限をチェック（文書の有効日が同意日より後の場合）
        const documentEffectiveDate = new Date(document.effectiveDate);
        const consentDate = new Date(userConsent.consentDate);

        if (documentEffectiveDate > consentDate) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('同意要否チェックエラー:', error);
      // エラーの場合は安全側に倒して同意を要求
      return true;
    }
  }

  /**
   * ユーザーの同意を記録
   * @param userId - ユーザーID
   * @param documents - 同意する文書のリスト
   * @param method - 同意方法
   * @returns 同意記録
   */
  async recordConsent(
    userId: string,
    documents: LegalDocument[],
    method: 'signup' | 'update' | 'renewal' = 'update'
  ): Promise<ConsentRecord> {
    try {
      // IPアドレスとUser-Agentを取得
      const ipAddress = await this.getUserIP();
      const userAgent = navigator.userAgent;

      const consentRecord: Omit<ConsentRecord, 'id'> = {
        userId,
        documents: documents.map(doc => ({
          type: doc.type,
          version: doc.version,
        })),
        consentDate: new Date().toISOString(),
        ipAddress,
        userAgent,
        method,
      };

      // データベースに同意記録を保存
      const { data, error } = await supabase
        .from('consent_records')
        .insert({
          user_id: consentRecord.userId,
          documents: consentRecord.documents,
          consent_date: consentRecord.consentDate,
          ip_address: consentRecord.ipAddress,
          user_agent: consentRecord.userAgent,
          method: consentRecord.method,
        })
        .select()
        .single();

      if (error) throw error;

      // プライバシー設定も更新
      await this.updatePrivacySettings(userId, documents);

      return {
        id: data.id,
        userId: data.user_id,
        documents: data.documents,
        consentDate: data.consent_date,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        method: data.method,
      };
    } catch (error) {
      console.error('同意記録エラー:', error);
      throw new Error('同意の記録に失敗しました');
    }
  }

  /**
   * プライバシー設定を更新
   * @param userId - ユーザーID
   * @param consentedDocuments - 同意した文書のリスト
   */
  async updatePrivacySettings(
    userId: string,
    consentedDocuments: LegalDocument[]
  ): Promise<void> {
    try {
      const privacyDocument = consentedDocuments.find(
        doc => doc.type === 'privacy'
      );

      if (!privacyDocument) return;

      const privacySettings: Omit<PrivacySettings, 'ipAddress' | 'userAgent'> =
        {
          dataProcessingConsent: true, // プライバシーポリシーに同意した場合は必須
          analyticsConsent: false, // デフォルトはfalse、別途設定で変更可能
          marketingConsent: false, // デフォルトはfalse、別途設定で変更可能
          consentDate: new Date().toISOString(),
          consentVersion: privacyDocument.version,
        };

      // 既存の設定を更新または新規作成
      const { error } = await supabase.from('privacy_settings').upsert({
        user_id: userId,
        data_processing_consent: privacySettings.dataProcessingConsent,
        analytics_consent: privacySettings.analyticsConsent,
        marketing_consent: privacySettings.marketingConsent,
        consent_date: privacySettings.consentDate,
        consent_version: privacySettings.consentVersion,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('プライバシー設定更新エラー:', error);
      // プライバシー設定の更新失敗は同意記録を無効にしない
    }
  }

  /**
   * ユーザーのプライバシー設定を更新
   * @param userId - ユーザーID
   * @param settings - 更新するプライバシー設定
   */
  async updateUserPrivacySettings(
    userId: string,
    settings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const updateData: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (settings.analyticsConsent !== undefined) {
        updateData.analytics_consent = settings.analyticsConsent;
      }
      if (settings.marketingConsent !== undefined) {
        updateData.marketing_consent = settings.marketingConsent;
      }

      const { error } = await supabase
        .from('privacy_settings')
        .upsert(updateData);

      if (error) throw error;
    } catch (error) {
      console.error('プライバシー設定更新エラー:', error);
      throw new Error('プライバシー設定の更新に失敗しました');
    }
  }

  /**
   * 最新の法的文書を取得
   * @returns 有効な最新の法的文書のリスト
   */
  async getLatestLegalDocuments(): Promise<LegalDocument[]> {
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false });

      if (error) throw error;

      // 各タイプの最新バージョンのみを返す
      const latestDocuments = new Map<string, LegalDocument>();

      for (const doc of data || []) {
        const existing = latestDocuments.get(doc.type);
        if (
          !existing ||
          new Date(doc.effective_date) > new Date(existing.effectiveDate)
        ) {
          latestDocuments.set(doc.type, {
            id: doc.id,
            type: doc.type,
            version: doc.version,
            title: doc.title,
            content: doc.content,
            effectiveDate: doc.effective_date,
            isActive: doc.is_active,
            previousVersion: doc.previous_version,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
          });
        }
      }

      return Array.from(latestDocuments.values());
    } catch (error) {
      console.error('法的文書取得エラー:', error);
      // エラーの場合はデフォルトの文書を返す
      return this.getDefaultLegalDocuments();
    }
  }

  /**
   * ユーザーの最新の同意記録を取得
   * @param userId - ユーザーID
   * @returns 最新の同意記録（存在しない場合はnull）
   */
  async getLatestUserConsent(userId: string): Promise<ConsentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('consent_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        documents: data.documents,
        consentDate: data.consent_date,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
        method: data.method,
      };
    } catch (error) {
      console.error('同意記録取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザーのプライバシー設定を取得
   * @param userId - ユーザーID
   * @returns プライバシー設定
   */
  async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // 設定が存在しない場合はデフォルト値を返す
        return {
          dataProcessingConsent: false,
          analyticsConsent: false,
          marketingConsent: false,
          consentDate: new Date().toISOString(),
          consentVersion: '1.0',
        };
      }

      return {
        dataProcessingConsent: data.data_processing_consent,
        analyticsConsent: data.analytics_consent,
        marketingConsent: data.marketing_consent,
        consentDate: data.consent_date,
        consentVersion: data.consent_version,
        ipAddress: data.ip_address,
        userAgent: data.user_agent,
      };
    } catch (error) {
      console.error('プライバシー設定取得エラー:', error);
      throw new Error('プライバシー設定の取得に失敗しました');
    }
  }

  /**
   * ユーザーのIPアドレスを取得
   * @returns IPアドレス
   */
  private async getUserIP(): Promise<string> {
    try {
      // 実際の実装では、サーバーサイドでIPアドレスを取得
      // クライアントサイドでは外部APIを使用するか、サーバーから取得
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      console.warn('IPアドレス取得エラー:', error);
      return 'unknown';
    }
  }

  /**
   * デフォルトの法的文書を取得（フォールバック）
   * @returns デフォルトの法的文書
   */
  private getDefaultLegalDocuments(): LegalDocument[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'default-terms',
        type: 'terms',
        version: '1.0',
        title: '利用規約',
        content: 'デフォルトの利用規約内容',
        effectiveDate: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'default-privacy',
        type: 'privacy',
        version: '1.0',
        title: 'プライバシーポリシー',
        content: 'デフォルトのプライバシーポリシー内容',
        effectiveDate: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  /**
   * 同意の撤回
   * @param userId - ユーザーID
   * @param documentType - 撤回する文書タイプ
   */
  async revokeConsent(
    userId: string,
    documentType: 'analytics' | 'marketing'
  ): Promise<void> {
    try {
      const updateData: any = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (documentType === 'analytics') {
        updateData.analytics_consent = false;
      } else if (documentType === 'marketing') {
        updateData.marketing_consent = false;
      }

      const { error } = await supabase
        .from('privacy_settings')
        .upsert(updateData);

      if (error) throw error;

      // 撤回記録を同意記録に追加
      await supabase.from('consent_records').insert({
        user_id: userId,
        documents: [{ type: documentType, version: 'revoked' }],
        consent_date: new Date().toISOString(),
        ip_address: await this.getUserIP(),
        user_agent: navigator.userAgent,
        method: 'revocation',
      });
    } catch (error) {
      console.error('同意撤回エラー:', error);
      throw new Error('同意の撤回に失敗しました');
    }
  }
}

// シングルトンインスタンスをエクスポート
export const consentManager = new ConsentManager();
