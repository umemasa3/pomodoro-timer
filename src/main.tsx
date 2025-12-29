import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { validateEnvironment, logEnvironmentInfo } from './utils/env';

// Sentryの初期化（最初に実行）
import '../sentry.client.config';

// 環境変数の検証
try {
  validateEnvironment();
  logEnvironmentInfo();
} catch (error) {
  console.error('❌ 環境設定エラー:', error);
  // 本番環境では詳細なエラー情報を表示しない
  if (import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="
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
      ">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">設定エラー</h1>
        <p style="margin-bottom: 1rem; max-width: 600px;">${error instanceof Error ? error.message : '環境設定に問題があります'}</p>
        <p style="font-size: 0.875rem; color: #6b7280;">
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
