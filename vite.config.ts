import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 環境変数を読み込み
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isStaging = mode === 'staging';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react({
        // 本番環境でのReact最適化
        babel: isProduction ? {
          plugins: [
            ['babel-plugin-react-remove-properties', { properties: ['data-testid'] }]
          ]
        } : undefined
      }),
      // Sentryプラグイン（本番・ステージング環境のみ）
      ...((isProduction || isStaging) && env.VITE_SENTRY_DSN
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              authToken: env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                assets: './dist/**',
              },
              release: {
                name: env.VITE_APP_VERSION || '1.0.0',
                cleanArtifacts: true,
              },
            }),
          ]
        : []),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // キャッシュサイズの最適化
          maximumFileSizeToCacheInBytes: isProduction ? 3000000 : 5000000, // 本番: 3MB, 開発: 5MB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24時間
                },
                cacheKeyWillBeUsed: async ({ request }) => {
                  // 認証ヘッダーを除外してキャッシュキーを生成
                  const url = new URL(request.url);
                  return url.href;
                },
              },
            },
            {
              // 静的アセットのキャッシュ戦略
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
                },
              },
            },
            {
              // フォントファイルのキャッシュ
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
                },
              },
            },
            {
              // APIレスポンスのキャッシュ（短期間）
              urlPattern: /\/api\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5, // 5分
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: env.VITE_APP_NAME || 'ポモドーロタイマー',
          short_name: 'ポモドーロ',
          description: env.VITE_APP_DESCRIPTION || '効率的な時間管理のためのポモドーロテクニックタイマー',
          theme_color: '#ef4444',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    // 環境変数の定義
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __IS_PRODUCTION__: JSON.stringify(isProduction),
    },
    // ビルド最適化設定
    build: {
      // 出力ディレクトリ
      outDir: 'dist',
      // アセットディレクトリ
      assetsDir: 'assets',
      // チャンクサイズの最適化
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // ベンダーライブラリの分離
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('framer-motion')) {
                return 'ui-vendor';
              }
              if (id.includes('zustand')) {
                return 'state-vendor';
              }
              return 'vendor';
            }
            // アプリケーションコードの分離
            if (id.includes('/src/components/')) {
              return 'components';
            }
            if (id.includes('/src/services/')) {
              return 'services';
            }
            if (id.includes('/src/stores/')) {
              return 'stores';
            }
          },
          // ファイル名にハッシュを含める（キャッシュバスティング）
          chunkFileNames: () => {
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].[ext]`;
            }
            if (/\.(woff2?|ttf|eot)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].[ext]`;
            }
            if (/\.css$/i.test(assetInfo.name)) {
              return `assets/css/[name]-[hash].[ext]`;
            }
            return `assets/[name]-[hash].[ext]`;
          },
        },
      },
      // 圧縮設定
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true, // 本番環境でconsole.logを除去
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2, // 最適化パス数
        },
        mangle: {
          safari10: true, // Safari 10対応
        },
        format: {
          comments: false, // コメントを除去
        },
      } : undefined,
      // ソースマップの設定
      sourcemap: env.VITE_ENABLE_SOURCE_MAPS === 'true' || isDevelopment,
      // チャンクサイズ警告の閾値
      chunkSizeWarningLimit: isProduction ? 500 : 1000,
      // CSS コード分割
      cssCodeSplit: true,
      // レポート生成
      reportCompressedSize: isProduction,
      // ターゲットブラウザ
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    },
    // 開発サーバー設定
    server: {
      port: 3000,
      host: true,
      // HMRの最適化
      hmr: {
        overlay: !isProduction,
      },
      // プロキシ設定（開発時のAPI呼び出し用）
      proxy: isDevelopment ? {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      } : undefined,
    },
    // プレビューサーバー設定
    preview: {
      port: 3000,
      host: true,
    },
    // 依存関係の事前バンドル最適化
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        '@headlessui/react',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
        'framer-motion',
        'zustand',
      ],
      // 除外する依存関係
      exclude: ['@sentry/vite-plugin'],
    },
    // CSS設定
    css: {
      // PostCSS設定
      postcss: './postcss.config.cjs',
      // CSS modules設定
      modules: {
        localsConvention: 'camelCase',
      },
      // 本番環境でのCSS最適化
      ...(isProduction && {
        devSourcemap: false,
      }),
    },
    // ESBuild設定
    esbuild: {
      // 本番環境でのデバッグ情報除去
      drop: isProduction ? ['console', 'debugger'] : [],
      // JSX設定
      jsx: 'automatic',
      // ターゲット
      target: 'es2020',
    },
  };
});
