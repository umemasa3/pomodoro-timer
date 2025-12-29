import { useEffect, useState } from 'react';

/**
 * オンライン/オフライン状態を管理するカスタムフック
 * PWAのオフライン機能をサポートするために使用
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    /**
     * オンライン状態になった時の処理
     */
    const handleOnline = () => {
      setIsOnline(true);
      console.log('ネットワーク接続が復旧しました');
    };

    /**
     * オフライン状態になった時の処理
     */
    const handleOffline = () => {
      setIsOnline(false);
      console.log('ネットワーク接続が切断されました');
    };

    // イベントリスナーを追加
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // クリーンアップ
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
