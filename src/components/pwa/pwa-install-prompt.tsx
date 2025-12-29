import React, { useEffect, useState } from 'react';

/**
 * PWAインストール促進コンポーネント
 * ブラウザのインストールプロンプトを管理し、ユーザーにアプリのインストールを促す
 */
export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    /**
     * beforeinstallpromptイベントをキャッチしてプロンプトを保存
     */
    const handleBeforeInstallPrompt = (e: Event) => {
      // デフォルトのプロンプトを防ぐ
      e.preventDefault();
      // 後で使用するためにイベントを保存
      setDeferredPrompt(e);
      // カスタムインストールボタンを表示
      setShowInstallPrompt(true);
    };

    /**
     * アプリがインストールされた後の処理
     */
    const handleAppInstalled = () => {
      console.log('PWA がインストールされました');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * インストールボタンがクリックされた時の処理
   */
  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // インストールプロンプトを表示
    deferredPrompt.prompt();

    // ユーザーの選択結果を待つ
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('ユーザーがPWAインストールを承認しました');
    } else {
      console.log('ユーザーがPWAインストールを拒否しました');
    }

    // プロンプトを一度使用したらクリア
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  /**
   * インストール促進を閉じる
   */
  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // 24時間後に再度表示するためにローカルストレージに記録
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // 24時間以内に閉じられた場合は表示しない
  useEffect(() => {
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const timeDiff = Date.now() - parseInt(dismissedTime);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (timeDiff < twentyFourHours) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowInstallPrompt(false);
      }
    }
  }, []);

  if (!showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="rounded-lg bg-gradient-to-r from-red-500 to-pink-500 p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-white">
              アプリをインストール
            </p>
            <p className="mt-1 text-sm text-red-100">
              ホーム画面に追加して、いつでも素早くアクセス
            </p>
            <div className="mt-3 flex space-x-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                インストール
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-red-500 hover:bg-red-700"
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
