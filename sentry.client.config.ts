import * as Sentry from '@sentry/react';

// Sentryの初期化設定
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_APP_VERSION,

  // パフォーマンス監視
  tracesSampleRate: getTracesSampleRate(),
  
  // プロファイリング
  profilesSampleRate: getProfilesSampleRate(),

  // セッション記録
  replaysSessionSampleRate: getReplaySessionSampleRate(),
  replaysOnErrorSampleRate: 1.0,

  // 統合設定
  integrations: [
    Sentry.browserTracingIntegration({
      // ルーティング追跡
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      ),
    }),
    Sentry.replayIntegration({
      // プライバシー設定
      maskAllText: import.meta.env.PROD,
      blockAllMedia: import.meta.env.PROD,
      maskAllInputs: true,
      // 記録対象の設定
      networkDetailAllowUrls: [
        /^https:\/\/.*\.supabase\.co/,
        /^https:\/\/.*\.vercel\.app/,
      ],
      // セッション記録の品質設定
      sampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
    // カスタム統合
    Sentry.httpIntegration({
      // HTTP リクエストの追跡
      breadcrumbs: true,
      tracing: true,
    }),
    // ユーザーインタラクション追跡
    Sentry.browserProfilingIntegration(),
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

    // スパムエラーのフィルタリング
    if (isSpamError(event, hint)) {
      return null;
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

    // リクエストデータから機密情報を除去
    if (event.request) {
      // ヘッダーから認証情報を除去
      if (event.request.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      // クエリパラメータから機密情報を除去
      if (event.request.query_string) {
        event.request.query_string = event.request.query_string.replace(
          /([?&])(token|key|password|secret)=[^&]*/gi,
          '$1$2=***'
        );
      }
    }

    return event;
  },

  // パフォーマンス監視の設定
  beforeSendTransaction(event) {
    // 開発環境では全てのトランザクションを送信
    if (import.meta.env.DEV) {
      return event;
    }

    // 本番環境では重要なトランザクションのみ送信
    if (event.transaction) {
      // ページロードとナビゲーションのみ追跡
      if (
        event.transaction.includes('pageload') ||
        event.transaction.includes('navigation') ||
        event.transaction.includes('/api/')
      ) {
        return event;
      }
    }

    return null;
  },

  // ユーザーコンテキスト設定
  initialScope: {
    tags: {
      component: 'pomodoro-timer',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.VITE_APP_ENV || 'development',
    },
    level: 'info',
  },

  // デバッグ設定
  debug: import.meta.env.DEV,
  
  // 自動セッション追跡
  autoSessionTracking: true,
  
  // 送信前の最大待機時間
  shutdownTimeout: 2000,
  
  // 最大ブレッドクラム数
  maxBreadcrumbs: 100,
  
  // アタッチメントの最大サイズ
  maxValueLength: 1024,
});

// サンプリングレート設定関数
function getTracesSampleRate(): number {
  const env = import.meta.env.VITE_APP_ENV;
  switch (env) {
    case 'production':
      return 0.1; // 本番環境: 10%
    case 'staging':
      return 0.5; // ステージング環境: 50%
    default:
      return 1.0; // 開発環境: 100%
  }
}

function getProfilesSampleRate(): number {
  const env = import.meta.env.VITE_APP_ENV;
  switch (env) {
    case 'production':
      return 0.05; // 本番環境: 5%
    case 'staging':
      return 0.2; // ステージング環境: 20%
    default:
      return 1.0; // 開発環境: 100%
  }
}

function getReplaySessionSampleRate(): number {
  const env = import.meta.env.VITE_APP_ENV;
  switch (env) {
    case 'production':
      return 0.1; // 本番環境: 10%
    case 'staging':
      return 0.3; // ステージング環境: 30%
    default:
      return 1.0; // 開発環境: 100%
  }
}

// スパムエラー判定
function isSpamError(event: Sentry.Event, hint: Sentry.EventHint): boolean {
  const error = hint.originalException || hint.syntheticException;
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // よくあるスパムエラーをフィルタリング
    const spamPatterns = [
      'non-error promise rejection captured',
      'network error',
      'loading chunk',
      'script error',
      'network request failed',
      'fetch error',
      'cors error',
    ];
    
    return spamPatterns.some(pattern => message.includes(pattern));
  }
  
  return false;
}

// カスタムエラー報告関数
export function reportError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

// カスタムメッセージ報告関数
export function reportMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureMessage(message);
  });
}

// パフォーマンス測定関数
export function measurePerformance<T>(name: string, fn: () => T): T {
  const transaction = Sentry.startTransaction({ name });
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  try {
    const result = fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}

// React Router統合用のインポート（必要に応じて）
import React from 'react';
// 注意: 実際のReact Routerのバージョンに応じてインポートを調整してください
// import { useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
