import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { legalDocumentService } from '../../services/legal-document-service';
import type { LegalDocument } from '../../types';

/**
 * 法的文書表示ページ
 * 利用規約、プライバシーポリシー、Cookieポリシーを表示
 */
export const LegalDocumentPage: React.FC = () => {
  const { type } = useParams<{ type: 'terms' | 'privacy' | 'cookie' }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (type) {
      loadDocument(type);
    }
  }, [type]);

  const loadDocument = async (documentType: 'terms' | 'privacy' | 'cookie') => {
    try {
      setLoading(true);
      setError(null);

      const documents =
        await legalDocumentService.getActiveLegalDocuments(documentType);

      if (documents.length > 0) {
        setDocument(documents[0]); // 最新のアクティブな文書を取得
      } else {
        setError('文書が見つかりませんでした');
      }
    } catch (error) {
      console.error('文書読み込みエラー:', error);
      setError('文書の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = () => {
    return <DocumentTextIcon className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            戻る
          </button>

          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || '文書が見つかりませんでした'}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => type && loadDocument(type)}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    再試行
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ナビゲーション */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          戻る
        </button>

        {/* 文書ヘッダー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                {getDocumentIcon()}
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {document.title}
                </h1>
                <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>バージョン {document.version}</span>
                  <span className="mx-2">•</span>
                  <span>
                    有効日:{' '}
                    {new Date(document.effectiveDate).toLocaleDateString(
                      'ja-JP'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 文書内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-8">
            <div
              className="prose prose-gray dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{
                __html: document.content
                  .replace(/\n/g, '<br>')
                  .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3>$1</h3>'),
              }}
            />
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            最終更新日:{' '}
            {new Date(document.updatedAt).toLocaleDateString('ja-JP')}
          </p>
          {document.previousVersion && (
            <p className="mt-1">前バージョン: {document.previousVersion}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentPage;
