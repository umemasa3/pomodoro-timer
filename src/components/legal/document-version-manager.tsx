import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { legalDocumentService } from '../../services/legal-document-service';
import type { LegalDocument } from '../../types';

interface DocumentVersionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'terms' | 'privacy' | 'cookie';
}

/**
 * 法的文書バージョン管理コンポーネント
 * 管理者用の文書バージョン管理機能を提供
 */
export const DocumentVersionManager: React.FC<DocumentVersionManagerProps> = ({
  isOpen,
  onClose,
  documentType,
}) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    content: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen, documentType, loadDocuments]);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const documentHistory =
        await legalDocumentService.getDocumentHistory(documentType);
      setDocuments(documentHistory);
    } catch (error) {
      console.error('文書履歴読み込みエラー:', error);
      setError('文書履歴の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [documentType]);

  const handleCreateDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      await legalDocumentService.createLegalDocument({
        type: documentType,
        version: formData.version,
        title: formData.title,
        content: formData.content,
        effectiveDate: new Date(formData.effectiveDate).toISOString(),
        isActive: true,
      });

      setSuccess('新しい文書を作成しました');
      setShowCreateForm(false);
      resetForm();
      await loadDocuments();
    } catch (error) {
      console.error('文書作成エラー:', error);
      setError('文書の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!editingDocument) return;

    try {
      setLoading(true);
      setError(null);

      await legalDocumentService.updateLegalDocument(editingDocument.id, {
        title: formData.title,
        content: formData.content,
        effectiveDate: new Date(formData.effectiveDate).toISOString(),
      });

      setSuccess('文書を更新しました');
      setEditingDocument(null);
      resetForm();
      await loadDocuments();
    } catch (error) {
      console.error('文書更新エラー:', error);
      setError('文書の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewVersion = async (currentDocument: LegalDocument) => {
    const newVersion = prompt(
      '新しいバージョン番号を入力してください:',
      `${parseFloat(currentDocument.version) + 0.1}`
    );

    if (!newVersion) return;

    try {
      setLoading(true);
      setError(null);

      await legalDocumentService.createNewVersion(
        currentDocument.id,
        newVersion,
        currentDocument.content,
        new Date().toISOString()
      );

      setSuccess(`バージョン ${newVersion} を作成しました`);
      await loadDocuments();
    } catch (error) {
      console.error('新バージョン作成エラー:', error);
      setError('新しいバージョンの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateDocument = async (document: LegalDocument) => {
    if (document.isActive) return;

    try {
      setLoading(true);
      setError(null);

      await legalDocumentService.updateLegalDocument(document.id, {
        isActive: true,
      });

      setSuccess(`バージョン ${document.version} をアクティブにしました`);
      await loadDocuments();
    } catch (error) {
      console.error('文書アクティブ化エラー:', error);
      setError('文書のアクティブ化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (document: LegalDocument) => {
    setEditingDocument(document);
    setFormData({
      title: document.title,
      version: document.version,
      content: document.content,
      effectiveDate: document.effectiveDate.split('T')[0],
    });
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setFormData({
      title: getDefaultTitle(documentType),
      version: '1.0',
      content: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      version: '',
      content: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    });
    setEditingDocument(null);
    setShowCreateForm(false);
  };

  const getDefaultTitle = (type: 'terms' | 'privacy' | 'cookie') => {
    switch (type) {
      case 'terms':
        return '利用規約';
      case 'privacy':
        return 'プライバシーポリシー';
      case 'cookie':
        return 'Cookie ポリシー';
      default:
        return '法的文書';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center"
                  >
                    <DocumentTextIcon className="h-6 w-6 mr-2 text-blue-600" />
                    {getDefaultTitle(documentType)} - バージョン管理
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
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-600">{error}</p>
                        <button
                          onClick={clearMessages}
                          className="mt-2 text-xs text-red-500 hover:text-red-700"
                        >
                          閉じる
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm text-green-600">{success}</p>
                        <button
                          onClick={clearMessages}
                          className="mt-2 text-xs text-green-500 hover:text-green-700"
                        >
                          閉じる
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 文書一覧 */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900 dark:text-white">
                        文書履歴
                      </h4>
                      <button
                        onClick={startCreate}
                        disabled={loading || showCreateForm || editingDocument}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        新規作成
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {documents.map(document => (
                        <div
                          key={document.id}
                          className={`p-4 border rounded-lg ${
                            document.isActive
                              ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center">
                                <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                                  バージョン {document.version}
                                </h5>
                                {document.isActive && (
                                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    アクティブ
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {new Date(
                                  document.effectiveDate
                                ).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEdit(document)}
                                disabled={loading}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="編集"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {!document.isActive && (
                                <button
                                  onClick={() =>
                                    handleActivateDocument(document)
                                  }
                                  disabled={loading}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
                                >
                                  アクティブ化
                                </button>
                              )}
                              {document.isActive && (
                                <button
                                  onClick={() =>
                                    handleCreateNewVersion(document)
                                  }
                                  disabled={loading}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                                >
                                  新バージョン
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 編集フォーム */}
                  {(showCreateForm || editingDocument) && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white">
                          {editingDocument ? '文書編集' : '新規文書作成'}
                        </h4>
                        <button
                          onClick={resetForm}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            タイトル
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            バージョン
                          </label>
                          <input
                            type="text"
                            value={formData.version}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                version: e.target.value,
                              })
                            }
                            disabled={!!editingDocument}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            有効日
                          </label>
                          <input
                            type="date"
                            value={formData.effectiveDate}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                effectiveDate: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            内容
                          </label>
                          <textarea
                            value={formData.content}
                            onChange={e =>
                              setFormData({
                                ...formData,
                                content: e.target.value,
                              })
                            }
                            rows={12}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Markdown形式で文書内容を入力してください..."
                          />
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={
                              editingDocument
                                ? handleUpdateDocument
                                : handleCreateDocument
                            }
                            disabled={
                              loading ||
                              !formData.title ||
                              !formData.version ||
                              !formData.content
                            }
                            className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading
                              ? '処理中...'
                              : editingDocument
                                ? '更新'
                                : '作成'}
                          </button>
                          <button
                            onClick={resetForm}
                            disabled={loading}
                            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DocumentVersionManager;
