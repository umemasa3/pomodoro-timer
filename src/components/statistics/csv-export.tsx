import React, { useState } from 'react';
import { DatabaseService } from '../../services/database-service';

/**
 * CSVエクスポート機能コンポーネント
 * 要件3.21: 統計データのCSV形式エクスポート
 */
export const CSVExport: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus({ type: null, message: '' });

      // CSVデータを取得
      const csvData = await DatabaseService.exportStatisticsToCSV();

      // ファイル名を生成（日時を含む）
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `pomodoro-statistics-${timestamp}.csv`;

      // BOMを追加してUTF-8エンコーディングを明示
      const bom = '\uFEFF';
      const csvWithBom = bom + csvData;

      // Blobを作成してダウンロード
      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setExportStatus({
        type: 'success',
        message: `統計データを ${filename} としてエクスポートしました`,
      });
    } catch (error) {
      console.error('CSVエクスポートエラー:', error);
      setExportStatus({
        type: 'error',
        message: 'エクスポートに失敗しました。もう一度お試しください。',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportFeatures = [
    {
      icon: '📊',
      title: 'セッション履歴',
      description: '全てのポモドーロセッションの詳細データ',
    },
    {
      icon: '✅',
      title: 'タスク履歴',
      description: '作成・完了したタスクの一覧と詳細',
    },
    {
      icon: '🏷️',
      title: 'タグ別統計',
      description: 'タグごとの作業時間と完了率',
    },
    {
      icon: '🎯',
      title: '目標進捗',
      description: '週間・月間目標の達成状況',
    },
    {
      icon: '📈',
      title: '比較分析',
      description: '前週・前月との比較データ',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          データエクスポート
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          CSV形式でダウンロード
        </div>
      </div>

      {/* エクスポート内容の説明 */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          エクスポートされるデータ
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exportFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
            >
              <span className="text-lg">{feature.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {feature.title}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {feature.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* エクスポートボタン */}
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={handleExport}
          disabled={isExporting}
          type="button"
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors ${
            isExporting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isExporting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              エクスポート中...
            </>
          ) : (
            <>
              <svg
                className="-ml-1 mr-3 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              統計データをエクスポート
            </>
          )}
        </button>

        {/* ステータスメッセージ */}
        {exportStatus.type && (
          <div
            className={`p-3 rounded-md text-sm ${
              exportStatus.type === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            <div className="flex items-center">
              {exportStatus.type === 'success' ? (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {exportStatus.message}
            </div>
          </div>
        )}
      </div>

      {/* 使用方法の説明 */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          💡 CSVファイルの活用方法
        </h5>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Excel、Google スプレッドシート、Numbers で開けます</li>
          <li>• データ分析やグラフ作成に活用できます</li>
          <li>• 他のツールとの連携やバックアップに便利です</li>
          <li>• 日本語文字化けを防ぐため、UTF-8 BOM付きで出力されます</li>
        </ul>
      </div>
    </div>
  );
};
