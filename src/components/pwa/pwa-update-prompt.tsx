import React, { useEffect, useState } from 'react';
import { Workbox } from 'workbox-window';

/**
 * PWAアップデート通知コンポーネント
 * Service Workerの更新を検出し、ユーザーにアップデートを促す
 */
export const PWAUpdatePrompt: React.FC = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    // Service Workerがサポートされているかチェック
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/sw.js');

      // 新しいService Workerが利用可能になった時
      workbox.addEventListener('waiting', () => {
        setShowUpdatePrompt(true);
      });

      // Service Workerが制御を開始した時
      workbox.addEventListener('controlling', () => {
        window.location.reload();
      });

      workbox.register();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWb(workbox);
    }
  }, []);

  /**
   * アップデートを適用する
   */
  const handleUpdate = () => {
    if (wb) {
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });

      // 待機中のService Workerにメッセージを送信してアクティブ化
      wb.messageSkipWaiting();
    }
  };

  /**
   * アップデート通知を閉じる
   */
  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              新しいバージョンが利用可能です
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              アプリを更新して最新機能をお楽しみください
            </p>
            <div className="mt-3 flex space-x-3">
              <button
                type="button"
                onClick={handleUpdate}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                更新
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
              >
                後で
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
