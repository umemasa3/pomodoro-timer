import { supabase } from './supabase';
import type { LegalDocument } from '../types';

/**
 * 法的文書管理サービス
 * 利用規約、プライバシーポリシー等の法的文書のバージョン管理を提供
 */
export class LegalDocumentService {
  /**
   * 新しい法的文書を作成
   * @param document - 作成する文書の情報
   * @returns 作成された文書
   */
  async createLegalDocument(
    document: Omit<LegalDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LegalDocument> {
    try {
      // 既存の同タイプの文書を非アクティブにする
      if (document.isActive) {
        await this.deactivateDocumentsByType(document.type);
      }

      const { data, error } = await supabase
        .from('legal_documents')
        .insert({
          type: document.type,
          version: document.version,
          title: document.title,
          content: document.content,
          effective_date: document.effectiveDate,
          is_active: document.isActive,
          previous_version: document.previousVersion,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: data.type,
        version: data.version,
        title: data.title,
        content: data.content,
        effectiveDate: data.effective_date,
        isActive: data.is_active,
        previousVersion: data.previous_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('法的文書作成エラー:', error);
      throw new Error('法的文書の作成に失敗しました');
    }
  }

  /**
   * 法的文書を更新
   * @param id - 文書ID
   * @param updates - 更新内容
   * @returns 更新された文書
   */
  async updateLegalDocument(
    id: string,
    updates: Partial<Omit<LegalDocument, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<LegalDocument> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.effectiveDate !== undefined)
        updateData.effective_date = updates.effectiveDate;
      if (updates.isActive !== undefined)
        updateData.is_active = updates.isActive;

      // アクティブ状態を変更する場合、同タイプの他の文書を非アクティブにする
      if (updates.isActive === true) {
        const { data: currentDoc } = await supabase
          .from('legal_documents')
          .select('type')
          .eq('id', id)
          .single();

        if (currentDoc) {
          await this.deactivateDocumentsByType(currentDoc.type, id);
        }
      }

      const { data, error } = await supabase
        .from('legal_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: data.type,
        version: data.version,
        title: data.title,
        content: data.content,
        effectiveDate: data.effective_date,
        isActive: data.is_active,
        previousVersion: data.previous_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('法的文書更新エラー:', error);
      throw new Error('法的文書の更新に失敗しました');
    }
  }

  /**
   * 指定タイプの法的文書を非アクティブにする
   * @param type - 文書タイプ
   * @param excludeId - 除外する文書ID（任意）
   */
  private async deactivateDocumentsByType(
    type: 'terms' | 'privacy' | 'cookie',
    excludeId?: string
  ): Promise<void> {
    try {
      let query = supabase
        .from('legal_documents')
        .update({ is_active: false })
        .eq('type', type);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { error } = await query;
      if (error) throw error;
    } catch (error) {
      console.error('文書非アクティブ化エラー:', error);
      throw error;
    }
  }

  /**
   * アクティブな法的文書を取得
   * @param type - 文書タイプ（任意）
   * @returns アクティブな文書のリスト
   */
  async getActiveLegalDocuments(
    type?: 'terms' | 'privacy' | 'cookie'
  ): Promise<LegalDocument[]> {
    try {
      let query = supabase
        .from('legal_documents')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(doc => ({
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
      }));
    } catch (error) {
      console.error('法的文書取得エラー:', error);
      return this.getDefaultDocuments(type);
    }
  }

  /**
   * 特定の法的文書を取得
   * @param id - 文書ID
   * @returns 文書の詳細
   */
  async getLegalDocument(id: string): Promise<LegalDocument | null> {
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        type: data.type,
        version: data.version,
        title: data.title,
        content: data.content,
        effectiveDate: data.effective_date,
        isActive: data.is_active,
        previousVersion: data.previous_version,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('法的文書取得エラー:', error);
      return null;
    }
  }

  /**
   * 文書の履歴を取得
   * @param type - 文書タイプ
   * @returns 文書の履歴（新しい順）
   */
  async getDocumentHistory(
    type: 'terms' | 'privacy' | 'cookie'
  ): Promise<LegalDocument[]> {
    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('type', type)
        .order('effective_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(doc => ({
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
      }));
    } catch (error) {
      console.error('文書履歴取得エラー:', error);
      return [];
    }
  }

  /**
   * デフォルトの法的文書を取得（フォールバック）
   * @param type - 文書タイプ（任意）
   * @returns デフォルトの文書
   */
  private getDefaultDocuments(
    type?: 'terms' | 'privacy' | 'cookie'
  ): LegalDocument[] {
    const now = new Date().toISOString();
    const documents: LegalDocument[] = [];

    if (!type || type === 'terms') {
      documents.push({
        id: 'default-terms',
        type: 'terms',
        version: '1.0',
        title: '利用規約',
        content: this.getDefaultTermsContent(),
        effectiveDate: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!type || type === 'privacy') {
      documents.push({
        id: 'default-privacy',
        type: 'privacy',
        version: '1.0',
        title: 'プライバシーポリシー',
        content: this.getDefaultPrivacyContent(),
        effectiveDate: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (!type || type === 'cookie') {
      documents.push({
        id: 'default-cookie',
        type: 'cookie',
        version: '1.0',
        title: 'Cookie ポリシー',
        content: this.getDefaultCookieContent(),
        effectiveDate: now,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return documents;
  }

  /**
   * デフォルトの利用規約内容
   */
  private getDefaultTermsContent(): string {
    return `
# 利用規約

## 第1条（適用）
本規約は、当社が提供するポモドーロタイマーサービス（以下「本サービス」）の利用条件を定めるものです。

## 第2条（利用登録）
本サービスの利用を希望する方は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。

## 第3条（禁止事項）
ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
1. 法令または公序良俗に違反する行為
2. 犯罪行為に関連する行為
3. 本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為
4. 本サービスの運営を妨害するおそれのある行為
5. その他、当社が不適切と判断する行為

## 第4条（本サービスの提供の停止等）
当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。

## 第5条（著作権）
本サービスおよび本サービスに関連する一切の情報についての著作権およびその他の知的財産権は、当社または当社にその利用を許諾した権利者に帰属し、ユーザーは無断で複製、譲渡、貸与、翻訳、改変、転載、公衆送信（送信可能化を含みます。）、伝送、配布、出版、営業使用等をしてはならないものとします。

## 第6条（免責事項）
当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。

## 第7条（サービス内容の変更等）
当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。

## 第8条（利用規約の変更）
当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。

## 第9条（準拠法・裁判管轄）
本規約の解釈にあたっては、日本法を準拠法とします。
本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

以上

制定日：2024年12月29日
    `.trim();
  }

  /**
   * デフォルトのプライバシーポリシー内容
   */
  private getDefaultPrivacyContent(): string {
    return `
# プライバシーポリシー

## 1. 基本方針
当社は、ユーザーの個人情報の重要性を認識し、個人情報の保護に関する法律、その他の関係法令等を遵守し、ユーザーの個人情報を適切に取り扱います。

## 2. 収集する情報
当社は、本サービスの提供にあたり、以下の情報を収集いたします。

### 2.1 ユーザーが提供する情報
- メールアドレス
- 表示名
- タイムゾーン設定
- その他ユーザーが任意で入力する情報

### 2.2 サービス利用により生成される情報
- タスクデータ（タイトル、説明、優先度等）
- セッション履歴（作業時間、休憩時間等）
- 統計情報（生産性データ等）
- 設定情報（タイマー設定、通知設定等）

### 2.3 技術的情報
- IPアドレス
- ブラウザの種類とバージョン
- オペレーティングシステム
- アクセス日時
- 利用状況に関する情報

## 3. 利用目的
収集した個人情報は、以下の目的で利用いたします。
1. 本サービスの提供・運営
2. ユーザーサポートの提供
3. サービスの改善・新機能の開発
4. 利用状況の分析
5. セキュリティの確保
6. 法令に基づく対応

## 4. 第三者への提供
当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
1. 法令に基づく場合
2. 人の生命、身体または財産の保護のために必要がある場合
3. 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合
4. 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合

## 5. データの保存場所と期間
### 5.1 保存場所
個人情報は、Supabase Inc.が提供するクラウドサービスに保存されます。
データセンターの所在地：米国、シンガポール等

### 5.2 保存期間
- アカウント情報：アカウント削除まで
- 利用履歴：最後のアクセスから3年間
- ログ情報：収集から1年間

## 6. セキュリティ
当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
- データの暗号化（AES-256）
- アクセス制御
- 定期的なセキュリティ監査
- 従業員への教育・研修

## 7. ユーザーの権利
ユーザーは、自己の個人情報について、以下の権利を有します。
1. 開示請求権
2. 訂正・追加・削除請求権
3. 利用停止・消去請求権
4. データポータビリティの権利

## 8. Cookie等の利用
本サービスでは、サービスの利便性向上のためCookieを使用しています。
Cookieの利用を希望されない場合は、ブラウザの設定により無効にすることができます。

## 9. 個人情報の取扱いに関するお問い合わせ
個人情報の取扱いに関するご質問やご意見は、以下までご連絡ください。
メールアドレス：privacy@example.com

## 10. プライバシーポリシーの変更
当社は、必要に応じて本プライバシーポリシーを変更することがあります。
変更後のプライバシーポリシーは、本サービス上に掲載したときから効力を生じるものとします。

## 11. 適用法令・管轄裁判所
本プライバシーポリシーは日本法に準拠し、個人情報に関する紛争については、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。

以上

制定日：2024年12月29日
最終更新日：2024年12月29日
    `.trim();
  }

  /**
   * デフォルトのCookieポリシー内容
   */
  private getDefaultCookieContent(): string {
    return `
# Cookie ポリシー

## 1. Cookieとは
Cookieとは、ウェブサイトがユーザーのコンピューターに保存する小さなテキストファイルです。
Cookieにより、ウェブサイトはユーザーの設定や行動を記憶することができます。

## 2. 当サービスでのCookieの利用
当サービスでは、以下の目的でCookieを使用しています。

### 2.1 必須Cookie
サービスの基本機能を提供するために必要なCookieです。
- ログイン状態の維持
- セッション管理
- セキュリティの確保

### 2.2 機能Cookie
ユーザーの利便性を向上させるためのCookieです。
- 言語設定の記憶
- テーマ設定の記憶
- その他のユーザー設定

### 2.3 分析Cookie（オプション）
サービスの改善のために使用統計を収集するCookieです。
- ページビューの測定
- 利用パターンの分析
- パフォーマンスの監視

## 3. 第三者Cookie
当サービスでは、以下の第三者サービスのCookieを使用する場合があります。
- Google Analytics（分析目的）
- Sentry（エラー監視目的）

## 4. Cookieの管理
ユーザーは、ブラウザの設定によりCookieを管理することができます。

### 4.1 Cookieの無効化
ブラウザの設定でCookieを無効にすることができますが、一部の機能が正常に動作しない場合があります。

### 4.2 Cookieの削除
ブラウザの設定で既存のCookieを削除することができます。

## 5. Cookieポリシーの変更
当社は、必要に応じて本Cookieポリシーを変更することがあります。
変更後のポリシーは、本サービス上に掲載したときから効力を生じるものとします。

## 6. お問い合わせ
Cookieの利用に関するご質問は、以下までご連絡ください。
メールアドレス：privacy@example.com

以上

制定日：2024年12月29日
    `.trim();
  }

  /**
   * 新しいバージョンの文書を作成（既存文書の更新）
   * @param currentDocumentId - 現在の文書ID
   * @param newVersion - 新しいバージョン
   * @param newContent - 新しい内容
   * @param effectiveDate - 有効日
   * @returns 新しい文書
   */
  async createNewVersion(
    currentDocumentId: string,
    newVersion: string,
    newContent: string,
    effectiveDate: string
  ): Promise<LegalDocument> {
    try {
      // 現在の文書を取得
      const currentDocument = await this.getLegalDocument(currentDocumentId);
      if (!currentDocument) {
        throw new Error('現在の文書が見つかりません');
      }

      // 現在の文書を非アクティブにする
      await this.updateLegalDocument(currentDocumentId, { isActive: false });

      // 新しいバージョンを作成
      const newDocument = await this.createLegalDocument({
        type: currentDocument.type,
        version: newVersion,
        title: currentDocument.title,
        content: newContent,
        effectiveDate,
        isActive: true,
        previousVersion: currentDocument.version,
      });

      return newDocument;
    } catch (error) {
      console.error('新バージョン作成エラー:', error);
      throw new Error('新しいバージョンの作成に失敗しました');
    }
  }
}

// シングルトンインスタンスをエクスポート
export const legalDocumentService = new LegalDocumentService();
