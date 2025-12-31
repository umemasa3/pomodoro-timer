import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { validateEnvironment, logEnvironmentInfo } from './utils/env';
import { initializePerformanceMonitoring } from './services/performance-monitor';
import { initializeHealthMonitoring } from './services/health-monitor';
import { startCoreWebVitalsAutoTest } from './utils/core-web-vitals-test';
import { initializePerformanceOptimizations } from './utils/performance-optimization';

// Sentryの初期化（最初に実行）
import '../sentry.client.config';

// Core Web Vitals最適化の即座実行（最優先）
initializePerformanceOptimizations();

// パフォーマンス監視の初期化
if (typeof window !== 'undefined') {
  initializePerformanceMonitoring({
    enabled: true,
    enableConsoleLogging: import.meta.env.DEV,
    thresholds: {
      LCP: 2500, // Core Web Vitals基準値
      FID: 100, // Core Web Vitals基準値
      CLS: 0.1, // Core Web Vitals基準値
      customMetrics: {
        'page-load-time': 3000,
        'api-response-time': 2000,
        'memory-usage': 100 * 1024 * 1024,
      },
    },
  });

  // ヘルスモニターの初期化
  initializeHealthMonitoring({
    enabled: true,
    enableConsoleLogging: import.meta.env.DEV,
    checkInterval: 60000, // 1分
    alertThresholds: {
      responseTime: 5000,
      errorRate: 0.1,
      consecutiveFailures: 3,
    },
  });

  // Core Web Vitals自動測定の開始（開発環境のみ）
  if (import.meta.env.DEV) {
    startCoreWebVitalsAutoTest();
  }
}

// 環境変数の検証
try {
  validateEnvironment();
  logEnvironmentInfo();
} catch (error) {
  console.error('❌ 環境設定エラー:', error);
  // 本番環境では詳細なエラー情報を表示しない
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div 
        role="alert" 
        aria-live="assertive"
        style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
          background: #f3f4f6;
          color: #374151;
          padding: 2rem;
          text-align: center;
        "
      >
        <h1 
          style="color: #dc2626; margin-bottom: 1rem;"
          id="error-title"
        >
          設定エラー
        </h1>
        <p 
          style="margin-bottom: 1rem; max-width: 600px;"
          aria-describedby="error-title"
        >
          ${error instanceof Error ? error.message : '環境設定に問題があります'}
        </p>
        <p 
          style="font-size: 0.875rem; color: #6b7280;"
          role="note"
        >
          .env.localファイルを作成し、必要な環境変数を設定してください。<br>
          詳細は.env.exampleファイルを参照してください。
        </p>
      </div>
    `;
    throw error;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
