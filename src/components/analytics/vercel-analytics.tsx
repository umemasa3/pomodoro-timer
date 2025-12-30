import { useEffect } from 'react';

/**
 * Vercel Analytics統合コンポーネント
 * 本番環境でのみ分析データを収集
 */
export function VercelAnalytics() {
  useEffect(() => {
    // 本番環境かつ分析が有効な場合のみ実行
    if (
      import.meta.env.VITE_APP_ENV === 'production' &&
      import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
      import.meta.env.VITE_VERCEL_ANALYTICS_ID
    ) {
      // Vercel Analytics スクリプトを動的に読み込み
      const script = document.createElement('script');
      script.src = '/_vercel/insights/script.js';
      script.defer = true;
      script.setAttribute(
        'data-project-id',
        import.meta.env.VITE_VERCEL_ANALYTICS_ID
      );

      // スクリプト読み込み完了時の処理
      script.onload = () => {
        console.log('Vercel Analytics initialized');

        // カスタムイベントの設定
        if (window.va) {
          // ページビューの追跡
          window.va('track', 'pageview', {
            page: window.location.pathname,
            title: document.title,
          });
        }
      };

      // エラーハンドリング
      script.onerror = error => {
        console.warn('Failed to load Vercel Analytics:', error);
      };

      document.head.appendChild(script);

      // クリーンアップ
      return () => {
        const existingScript = document.querySelector(
          'script[src="/_vercel/insights/script.js"]'
        );
        if (existingScript) {
          document.head.removeChild(existingScript);
        }
      };
    }
  }, []);

  return null;
}

/**
 * カスタムイベント追跡用のフック
 */
export function useVercelAnalytics() {
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (
      import.meta.env.VITE_APP_ENV === 'production' &&
      import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
      window.va
    ) {
      window.va('track', eventName, properties);
    }
  };

  const trackPageView = (page?: string) => {
    if (
      import.meta.env.VITE_APP_ENV === 'production' &&
      import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
      window.va
    ) {
      window.va('track', 'pageview', {
        page: page || window.location.pathname,
        title: document.title,
      });
    }
  };

  const trackConversion = (conversionName: string, value?: number) => {
    if (
      import.meta.env.VITE_APP_ENV === 'production' &&
      import.meta.env.VITE_ENABLE_ANALYTICS === 'true' &&
      window.va
    ) {
      window.va('track', 'conversion', {
        name: conversionName,
        value,
      });
    }
  };

  return {
    trackEvent,
    trackPageView,
    trackConversion,
  };
}

// Vercel Analytics用の型定義
declare global {
  interface Window {
    va?: (
      command: string,
      eventName: string,
      properties?: Record<string, any>
    ) => void;
  }
}
