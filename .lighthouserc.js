module.exports = {
  ci: {
    // 収集設定
    collect: {
      // テスト対象URL
      url: [
        'http://localhost:3000',
        'http://localhost:3000/statistics',
        'http://localhost:3000/tasks',
      ],
      // 各URLでの実行回数
      numberOfRuns: 3,
      // 設定
      settings: {
        // デスクトップ設定
        preset: 'desktop',
        // Chrome起動オプション
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        // 出力形式
        output: ['html', 'json'],
        // 出力ディレクトリ
        outputDir: './lighthouse-reports',
      },
    },
    // アップロード設定（Lighthouse CI Server使用時）
    upload: {
      target: 'temporary-public-storage',
    },
    // アサーション（品質基準）
    assert: {
      // 各メトリクスの最小スコア
      assertions: {
        // パフォーマンス
        'categories:performance': ['error', { minScore: 0.8 }],
        // アクセシビリティ
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // ベストプラクティス
        'categories:best-practices': ['error', { minScore: 0.9 }],
        // SEO
        'categories:seo': ['error', { minScore: 0.8 }],
        // PWA
        'categories:pwa': ['warn', { minScore: 0.7 }],

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 3000 }],

        // リソース最適化
        'total-byte-weight': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }], // 50KB
        'unused-javascript': ['warn', { maxNumericValue: 100000 }], // 100KB
        'modern-image-formats': ['warn', { minScore: 0.8 }],
        'uses-webp-images': ['warn', { minScore: 0.8 }],
        'efficient-animated-content': ['warn', { minScore: 0.8 }],

        // セキュリティ
        'is-on-https': ['error', { minScore: 1 }],
        'uses-http2': ['warn', { minScore: 0.8 }],

        // アクセシビリティ詳細
        'color-contrast': ['error', { minScore: 1 }],
        'image-alt': ['error', { minScore: 1 }],
        'label': ['error', { minScore: 1 }],
        'link-name': ['error', { minScore: 1 }],
        'button-name': ['error', { minScore: 1 }],

        // PWA詳細
        'service-worker': ['warn', { minScore: 1 }],
        'installable-manifest': ['warn', { minScore: 1 }],
        'splash-screen': ['warn', { minScore: 1 }],
        'themed-omnibox': ['warn', { minScore: 1 }],
      },
    },
    // サーバー設定（開発サーバー自動起動）
    server: {
      command: 'pnpm run preview',
      port: 3000,
      // サーバー起動待機時間
      waitForServer: {
        timeout: 60000,
        interval: 1000,
      },
    },
  },
};