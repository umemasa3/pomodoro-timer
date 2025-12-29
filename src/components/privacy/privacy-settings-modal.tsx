import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { consentManager } from '../../services/consent-manager';
import { dataExportService } from '../../services/data-export-service';
import { accountDeletionService } from '../../services/account-deletion-service';
import type { PrivacySettings, AccountDeletionRequest } from '../../types';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * プライバシー設定モーダル
 * ユーザーのプライバシー設定、データエクスポート、アカウント削除機能を提供
 */
export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [privacySettings, setPrivacySettings] =
    useState<PrivacySettings | null>(null);
  const [deletionRequest, setDeletionRequest] =
    useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // プライバシー設定を読み込み
  useEffect(() => {
    if (isOpen && userId) {
      loadPrivacySettings();
      loadDeletionRequestStatus();
    }
  }, [isOpen, userId, loadPrivacySettings, loadDeletionRequestStatus]);

  const loadPrivacySettings = useCallback(async () => {
    try {
      const settings = await consentManager.getUserPrivacySettings(userId);
      setPrivacySettings(settings);
    } catch (error) {
      console.error('プライバシー設定読み込みエラー:', error);
      setError('プライバシー設定の読み込みに失敗しました');
    }
  }, [userId]);

  const loadDeletionRequestStatus = useCallback(async () => {
    try {
      const request =
        await accountDeletionService.getDeletionRequestStatus(userId);
      setDeletionRequest(request);
    } catch (error) {
      console.error('削除要求状態読み込みエラー:', error);
    }
  }, [userId]);

  const handlePrivacySettingChange = async (
    setting: 'analyticsConsent' | 'marketingConsent',
    value: boolean
  ) => {
    if (!privacySettings) return;

    try {
      setLoading(true);
      setError(null);

      await consentManager.updateUserPrivacySettings(userId, {
        [setting]: value,
      });

      setPrivacySettings({
        ...privacySettings,
        [setting]: value,
      });

      setSuccess('プライバシー設定を更新しました');
    } catch (error) {
      console.error('プライバシー設定更新エラー:', error);
      setError('プライバシー設定の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const exportData = await dataExportService.exportUserData(userId);
      dataExportService.downloadAsJson(exportData);

      setSuccess('データのエクスポートが完了しました');
    } catch (error) {
      console.error('データエクスポートエラー:', error);
      setError('データのエクスポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (
      !confirm(
        '本当にアカウントを削除しますか？この操作は30日後に実行され、それまでキャンセル可能です。'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request =
        await accountDeletionService.requestAccountDeletion(userId);
      setDeletionRequest(request);

      setSuccess('アカウント削除を要求しました。30日後に削除が実行されます。');
    } catch (error) {
      console.error('アカウント削除要求エラー:', error);
      setError('アカウント削除の要求に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletionRequest) return;

    if (!confirm('アカウント削除をキャンセルしますか？')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await accountDeletionService.cancelAccountDeletion(userId);
      setDeletionRequest(null);

      setSuccess('アカウント削除をキャンセルしました');
    } catch (error) {
      console.error('アカウント削除キャンセルエラー:', error);
      setError('アカウント削除のキャンセルに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!privacySettings) {
    return null;
  }

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center"
                  >
                    <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
                    プライバシー設定
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* エラー・成功メッセージ */}
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                      onClick={clearMessages}
                      className="mt-2 text-xs text-red-500 hover:text-red-700"
                    >
                      閉じる
                    </button>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">{success}</p>
                    <button
                      onClick={clearMessages}
                      className="mt-2 text-xs text-green-500 hover:text-green-700"
                    >
                      閉じる
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {/* データ処理の同意 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      データ処理の同意
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            必須データ処理
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            サービス提供に必要な基本データの処理（無効にできません）
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.dataProcessingConsent}
                          disabled
                          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 opacity-50"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            分析データの使用
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            サービス改善のための匿名化された使用統計の収集
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.analyticsConsent}
                          onChange={e =>
                            handlePrivacySettingChange(
                              'analyticsConsent',
                              e.target.checked
                            )
                          }
                          disabled={loading}
                          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            マーケティング情報の受信
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            新機能やアップデートに関する情報の受信
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacySettings.marketingConsent}
                          onChange={e =>
                            handlePrivacySettingChange(
                              'marketingConsent',
                              e.target.checked
                            )
                          }
                          disabled={loading}
                          className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* データエクスポート */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      データのエクスポート
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      あなたのすべてのデータをJSON形式でダウンロードできます。
                      タスク、セッション履歴、統計情報などが含まれます。
                    </p>
                    <button
                      onClick={handleDataExport}
                      disabled={loading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      {loading ? 'エクスポート中...' : 'データをエクスポート'}
                    </button>
                  </div>

                  {/* アカウント削除 */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      アカウントの削除
                    </h4>

                    {deletionRequest ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <TrashIcon className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              アカウント削除が予定されています
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>
                                削除予定日:{' '}
                                {new Date(
                                  deletionRequest.scheduledDeletionAt
                                ).toLocaleDateString('ja-JP')}
                              </p>
                              <p>
                                キャンセル期限:{' '}
                                {new Date(
                                  deletionRequest.cancellationDeadline
                                ).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <div className="mt-4">
                              <button
                                onClick={handleCancelDeletion}
                                disabled={loading}
                                className="bg-yellow-100 px-3 py-2 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                              >
                                {loading
                                  ? 'キャンセル中...'
                                  : '削除をキャンセル'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          アカウントを削除すると、すべてのデータが完全に削除されます。
                          削除は30日後に実行され、それまでキャンセル可能です。
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <TrashIcon className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                この操作は取り消せません
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>すべてのタスクとセッション履歴</li>
                                  <li>統計データと目標設定</li>
                                  <li>アカウント情報と設定</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleAccountDeletion}
                          disabled={loading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          {loading ? '削除要求中...' : 'アカウントを削除'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 同意情報 */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p>
                      最終同意日:{' '}
                      {new Date(privacySettings.consentDate).toLocaleDateString(
                        'ja-JP'
                      )}
                    </p>
                    <p>同意バージョン: {privacySettings.consentVersion}</p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PrivacySettingsModal;
