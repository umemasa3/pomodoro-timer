import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { legalDocumentService } from '../../services/legal-document-service';
import type { LegalDocument } from '../../types';

interface ConsentCheckboxProps {
  onConsentChange: (consented: boolean, documents: LegalDocument[]) => void;
  required?: boolean;
  className?: string;
}

/**
 * 同意チェックボックスコンポーネント
 * サインアップ時に利用規約とプライバシーポリシーへの同意を求める
 */
export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  onConsentChange,
  required = true,
  className = '',
}) => {
  const [consented, setConsented] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLegalDocuments();
  }, []);

  useEffect(() => {
    onConsentChange(consented, documents);
  }, [consented, documents, onConsentChange]);

  const loadLegalDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const [termsDocuments, privacyDocuments] = await Promise.all([
        legalDocumentService.getActiveLegalDocuments('terms'),
        legalDocumentService.getActiveLegalDocuments('privacy'),
      ]);

      const allDocuments = [...termsDocuments, ...privacyDocuments];
      setDocuments(allDocuments);
    } catch (error) {
      console.error('法的文書読み込みエラー:', error);
      setError('法的文書の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setConsented(checked);
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-start">
          <div className="h-4 w-4 bg-gray-200 rounded mt-1 mr-3"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}
      >
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              エラーが発生しました
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadLegalDocuments}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const termsDocument = documents.find(doc => doc.type === 'terms');
  const privacyDocument = documents.find(doc => doc.type === 'privacy');

  return (
    <div className={className}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="consent-checkbox"
            name="consent"
            type="checkbox"
            checked={consented}
            onChange={e => handleConsentChange(e.target.checked)}
            required={required}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label
            htmlFor="consent-checkbox"
            className="text-gray-700 dark:text-gray-300"
          >
            {required && <span className="text-red-500">* </span>}
            以下に同意します：
          </label>
          <div className="mt-1 space-y-1">
            {termsDocument && (
              <div>
                <Link
                  to={`/legal/terms`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  利用規約
                </Link>
                <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                  (v{termsDocument.version})
                </span>
              </div>
            )}
            {privacyDocument && (
              <div>
                <Link
                  to={`/legal/privacy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                >
                  プライバシーポリシー
                </Link>
                <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                  (v{privacyDocument.version})
                </span>
              </div>
            )}
          </div>
          {required && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              アカウント作成には上記文書への同意が必要です。
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentCheckbox;
