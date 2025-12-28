/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * プロパティベーステスト専用のVitest設定
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/property-test-setup.ts'],
    css: true,
    // プロパティテスト用の設定
    testTimeout: 10000, // プロパティテストは時間がかかる可能性があるため長めに設定
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // プロパティテストファイルのみを対象とする
    include: ['src/**/*.property.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // 通常のユニットテストは除外（プロパティテストファイルは除外しない）
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        '**/*.property.test.*', // プロパティテストファイル自体は除外
      ],
    },
    // プロパティテスト用のレポーター設定
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/property-test-results.json',
    },
  },
});
