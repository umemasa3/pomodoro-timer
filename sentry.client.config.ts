import * as Sentry from '@sentry/react';

// Sentryの初期化設定
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,

  // パフォーマンス監視
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

  // セッション記録
  replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // 統合設定
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境では詳細なエラー情報を保持
    if (import.meta.env.DEV) {
      console.error(
        'Sentry Error:',
        hint.originalException || hint.syntheticException
      );
    }

    // プライバシー保護のため、機密情報をマスク
    if (event.exception) {
      event.exception.values?.forEach(exception => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames.forEach(frame => {
            // ファイルパスから個人情報を除去
            if (frame.filename) {
              frame.filename = frame.filename.replace(
                /\/Users\/[^/]+/,
                '/Users/***'
              );
            }
          });
        }
      });
    }

    return event;
  },

  // ユーザーコンテキスト設定
  initialScope: {
    tags: {
      component: 'pomodoro-timer',
    },
  },
});
