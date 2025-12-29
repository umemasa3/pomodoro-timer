import { supabase } from './supabase';
import type { AccountDeletionRequest } from '../types';

/**
 * アカウント削除サービス
 * 30日の猶予期間を設けたアカウント削除機能を提供
 */
export class AccountDeletionService {
  /**
   * アカウント削除を要求
   * @param userId - 削除対象のユーザーID
   * @param reason - 削除理由（任意）
   * @returns 削除要求の詳細
   */
  async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<AccountDeletionRequest> {
    try {
      const now = new Date();
      const scheduledDeletionDate = new Date(now);
      scheduledDeletionDate.setDate(now.getDate() + 30); // 30日後

      const cancellationDeadline = new Date(scheduledDeletionDate);
      cancellationDeadline.setHours(23, 59, 59, 999); // 削除予定日の23:59:59まで

      const deletionRequest: Omit<AccountDeletionRequest, 'id'> = {
        userId,
        requestedAt: now.toISOString(),
        scheduledDeletionAt: scheduledDeletionDate.toISOString(),
        reason,
        status: 'pending',
        cancellationDeadline: cancellationDeadline.toISOString(),
      };

      // データベースに削除要求を保存
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: deletionRequest.userId,
          requested_at: deletionRequest.requestedAt,
          scheduled_deletion_at: deletionRequest.scheduledDeletionAt,
          reason: deletionRequest.reason,
          status: deletionRequest.status,
          cancellation_deadline: deletionRequest.cancellationDeadline,
        })
        .select()
        .single();

      if (error) throw error;

      // ユーザーに削除予定の通知メールを送信
      await this.sendDeletionNotificationEmail(userId, scheduledDeletionDate);

      // 削除スケジュールをセット（実際の実装では外部のジョブスケジューラーを使用）
      await this.scheduleDeletion(data.id, scheduledDeletionDate);

      return {
        id: data.id,
        userId: data.user_id,
        requestedAt: data.requested_at,
        scheduledDeletionAt: data.scheduled_deletion_at,
        reason: data.reason,
        status: data.status,
        cancellationDeadline: data.cancellation_deadline,
      };
    } catch (error) {
      console.error('アカウント削除要求エラー:', error);
      throw new Error('アカウント削除の要求に失敗しました');
    }
  }

  /**
   * アカウント削除をキャンセル
   * @param userId - ユーザーID
   * @returns キャンセル成功の可否
   */
  async cancelAccountDeletion(userId: string): Promise<boolean> {
    try {
      // 有効な削除要求を取得
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !deletionRequest) {
        throw new Error('有効な削除要求が見つかりません');
      }

      // キャンセル期限をチェック
      const now = new Date();
      const cancellationDeadline = new Date(
        deletionRequest.cancellation_deadline
      );

      if (now > cancellationDeadline) {
        throw new Error('キャンセル期限を過ぎています');
      }

      // 削除要求をキャンセル状態に更新
      const { error: updateError } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: now.toISOString(),
        })
        .eq('id', deletionRequest.id);

      if (updateError) throw updateError;

      // 削除スケジュールをキャンセル
      await this.cancelScheduledDeletion(deletionRequest.id);

      // キャンセル通知メールを送信
      await this.sendCancellationNotificationEmail(userId);

      return true;
    } catch (error) {
      console.error('アカウント削除キャンセルエラー:', error);
      throw new Error('アカウント削除のキャンセルに失敗しました');
    }
  }

  /**
   * 実際のアカウント削除を実行
   * @param deletionRequestId - 削除要求ID
   */
  async executeAccountDeletion(deletionRequestId: string): Promise<void> {
    try {
      // 削除要求を取得
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('id', deletionRequestId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !deletionRequest) {
        throw new Error('有効な削除要求が見つかりません');
      }

      const userId = deletionRequest.user_id;

      // 段階的にデータを削除
      await this.deleteUserData(userId);

      // 削除要求を完了状態に更新
      await supabase
        .from('account_deletion_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', deletionRequestId);

      console.log(`ユーザー ${userId} のアカウント削除が完了しました`);
    } catch (error) {
      console.error('アカウント削除実行エラー:', error);

      // 削除要求にエラー状態を記録
      await supabase
        .from('account_deletion_requests')
        .update({
          status: 'error',
          error_message:
            error instanceof Error ? error.message : '不明なエラー',
          error_occurred_at: new Date().toISOString(),
        })
        .eq('id', deletionRequestId);

      throw error;
    }
  }

  /**
   * ユーザーの全データを削除
   * @param userId - 削除対象のユーザーID
   */
  private async deleteUserData(userId: string): Promise<void> {
    // トランザクション内で全データを削除
    const { error } = await supabase.rpc('delete_user_data_completely', {
      target_user_id: userId,
    });

    if (error) {
      // RPC関数が存在しない場合は、個別に削除
      await this.deleteUserDataIndividually(userId);
    }
  }

  /**
   * ユーザーデータを個別に削除（フォールバック）
   * @param userId - 削除対象のユーザーID
   */
  private async deleteUserDataIndividually(userId: string): Promise<void> {
    // 依存関係の順序で削除
    const tables = [
      'sessions',
      'goals',
      'task_tags',
      'tasks',
      'tags',
      'privacy_settings',
      'consent_records',
      'data_export_logs',
      'account_deletion_requests',
      'users', // 最後にユーザー自体を削除
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error && !error.message.includes('does not exist')) {
        console.warn(`テーブル ${table} からの削除でエラー:`, error);
      }
    }

    // 認証システムからもユーザーを削除
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('認証システムからのユーザー削除でエラー:', authError);
    }
  }

  /**
   * 削除通知メールを送信
   * @param userId - ユーザーID
   * @param scheduledDate - 削除予定日
   */
  private async sendDeletionNotificationEmail(
    userId: string,
    scheduledDate: Date
  ): Promise<void> {
    try {
      // ユーザー情報を取得
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user) return;

      // メール送信（実際の実装では外部のメールサービスを使用）
      const emailContent = {
        to: user.email,
        subject: 'アカウント削除のご確認',
        html: `
          <h2>アカウント削除のお知らせ</h2>
          <p>${user.display_name || 'ユーザー'}様</p>
          <p>アカウント削除のご要求を承りました。</p>
          <p><strong>削除予定日:</strong> ${scheduledDate.toLocaleDateString('ja-JP')}</p>
          <p>削除をキャンセルしたい場合は、削除予定日の前日までにアプリケーションにログインしてキャンセル手続きを行ってください。</p>
          <p>ご不明な点がございましたら、サポートまでお問い合わせください。</p>
        `,
      };

      // 実際のメール送信処理（プレースホルダー）
      console.log('削除通知メール送信:', emailContent);
    } catch (error) {
      console.warn('削除通知メール送信エラー:', error);
    }
  }

  /**
   * キャンセル通知メールを送信
   * @param userId - ユーザーID
   */
  private async sendCancellationNotificationEmail(
    userId: string
  ): Promise<void> {
    try {
      // ユーザー情報を取得
      const { data: user } = await supabase
        .from('users')
        .select('email, display_name')
        .eq('id', userId)
        .single();

      if (!user) return;

      // メール送信（実際の実装では外部のメールサービスを使用）
      const emailContent = {
        to: user.email,
        subject: 'アカウント削除のキャンセル確認',
        html: `
          <h2>アカウント削除キャンセルのお知らせ</h2>
          <p>${user.display_name || 'ユーザー'}様</p>
          <p>アカウント削除のキャンセルが完了しました。</p>
          <p>引き続きサービスをご利用いただけます。</p>
          <p>ご不明な点がございましたら、サポートまでお問い合わせください。</p>
        `,
      };

      // 実際のメール送信処理（プレースホルダー）
      console.log('キャンセル通知メール送信:', emailContent);
    } catch (error) {
      console.warn('キャンセル通知メール送信エラー:', error);
    }
  }

  /**
   * 削除スケジュールを設定
   * @param deletionRequestId - 削除要求ID
   * @param scheduledDate - 削除予定日
   */
  private async scheduleDeletion(
    deletionRequestId: string,
    scheduledDate: Date
  ): Promise<void> {
    // 実際の実装では、外部のジョブスケジューラー（Cron、AWS Lambda、Vercel Cron Jobs等）を使用
    console.log(
      `削除スケジュール設定: ID=${deletionRequestId}, 予定日=${scheduledDate.toISOString()}`
    );

    // プレースホルダー：実際にはジョブキューに登録
    // await jobScheduler.schedule('deleteAccount', { deletionRequestId }, scheduledDate);
  }

  /**
   * 削除スケジュールをキャンセル
   * @param deletionRequestId - 削除要求ID
   */
  private async cancelScheduledDeletion(
    deletionRequestId: string
  ): Promise<void> {
    // 実際の実装では、スケジュールされたジョブをキャンセル
    console.log(`削除スケジュールキャンセル: ID=${deletionRequestId}`);

    // プレースホルダー：実際にはジョブキューからキャンセル
    // await jobScheduler.cancel('deleteAccount', { deletionRequestId });
  }

  /**
   * ユーザーの削除要求状態を取得
   * @param userId - ユーザーID
   * @returns 削除要求の詳細（存在しない場合はnull）
   */
  async getDeletionRequestStatus(
    userId: string
  ): Promise<AccountDeletionRequest | null> {
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        requestedAt: data.requested_at,
        scheduledDeletionAt: data.scheduled_deletion_at,
        reason: data.reason,
        status: data.status,
        cancellationDeadline: data.cancellation_deadline,
      };
    } catch (error) {
      console.error('削除要求状態取得エラー:', error);
      return null;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const accountDeletionService = new AccountDeletionService();
