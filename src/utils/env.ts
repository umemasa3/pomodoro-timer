/**
 * 環境変数管理ユーティリティ
 * 本番環境とローカル環境での設定を統一管理
 */

// 環境変数の型定義
interface EnvironmentConfig {
  // Supabase設定
  supabaseUrl: string;
  supabaseAnonKey: string;

  // アプリケーション設定
  appEnv: 'development' | 'production' | 'test';
  appVersion: string;
  appName: string;

  // 機能フラグ
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enableDevtools: boolean;
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableExportData: boolean;

  // キャッシュ設定
  cacheVersion: string;
}

/**
 * 環境変数の取得と検証
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
}

/**
 * デモモードかどうかの判定
 */
function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * boolean型の環境変数を取得
 */
function getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * 環境設定の取得
 */
export const env: EnvironmentConfig = {
  // Supabase設定（デモモードの場合はダミー値を使用）
  supabaseUrl: isDemoMode()
    ? 'https://demo.supabase.co'
    : getEnvVar('VITE_SUPABASE_URL'),
  supabaseAnonKey: isDemoMode()
    ? 'demo_anon_key'
    : getEnvVar('VITE_SUPABASE_ANON_KEY'),

  // アプリケーション設定
  appEnv: getEnvVar(
    'VITE_APP_ENV',
    'development'
  ) as EnvironmentConfig['appEnv'],
  appVersion: getEnvVar('VITE_APP_VERSION', '0.0.0'),
  appName: getEnvVar('VITE_APP_NAME', 'ポモドーロタイマー'),

  // 機能フラグ
  enableAnalytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', false),
  enableErrorReporting: getBooleanEnvVar('VITE_ENABLE_ERROR_REPORTING', false),
  enableDevtools: getBooleanEnvVar('VITE_ENABLE_DEVTOOLS', true),
  enableOfflineMode: getBooleanEnvVar('VITE_FEATURE_OFFLINE_MODE', true),
  enablePushNotifications: getBooleanEnvVar(
    'VITE_FEATURE_PUSH_NOTIFICATIONS',
    true
  ),
  enableExportData: getBooleanEnvVar('VITE_FEATURE_EXPORT_DATA', true),

  // キャッシュ設定
  cacheVersion: getEnvVar('VITE_CACHE_VERSION', '1'),
};

/**
 * 開発環境かどうかの判定
 */
export const isDevelopment = env.appEnv === 'development';

/**
 * 本番環境かどうかの判定
 */
export const isProduction = env.appEnv === 'production';

/**
 * テスト環境かどうかの判定
 */
export const isTest = env.appEnv === 'test';

/**
 * 環境設定の検証
 */
export function validateEnvironment(): void {
  // デモモードの場合は検証をスキップ
  if (isDemoMode()) {
    console.log('🎭 デモモードで実行中');
    return;
  }

  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `必要な環境変数が設定されていません: ${missingVars.join(', ')}\n` +
        '.env.localファイルを作成し、必要な環境変数を設定してください。'
    );
  }

  // Supabase URLの形式チェック
  if (
    !env.supabaseUrl.startsWith('https://') ||
    !env.supabaseUrl.includes('.supabase.co')
  ) {
    throw new Error('VITE_SUPABASE_URLの形式が正しくありません');
  }

  console.log('✅ 環境変数の検証が完了しました');

  if (isDevelopment) {
    console.log('🔧 開発環境で実行中');
    console.log(`📱 アプリ名: ${env.appName}`);
    console.log(`🔢 バージョン: ${env.appVersion}`);
  }
}

/**
 * 機能フラグの確認
 */
export function isFeatureEnabled(
  feature: keyof Pick<
    EnvironmentConfig,
    | 'enableAnalytics'
    | 'enableErrorReporting'
    | 'enableDevtools'
    | 'enableOfflineMode'
    | 'enablePushNotifications'
    | 'enableExportData'
  >
): boolean {
  return env[feature];
}

/**
 * デバッグ情報の出力（開発環境のみ）
 */
export function logEnvironmentInfo(): void {
  if (!isDevelopment) return;

  console.group('🌍 環境情報');
  console.log('環境:', env.appEnv);
  console.log('バージョン:', env.appVersion);
  console.log('デモモード:', isDemoMode());
  if (!isDemoMode()) {
    console.log('Supabase URL:', env.supabaseUrl);
  }
  console.log('機能フラグ:', {
    analytics: env.enableAnalytics,
    errorReporting: env.enableErrorReporting,
    devtools: env.enableDevtools,
    offlineMode: env.enableOfflineMode,
    pushNotifications: env.enablePushNotifications,
    exportData: env.enableExportData,
  });
  console.groupEnd();
}

/**
 * デモモードかどうかの判定（エクスポート用）
 */
export const isDemo = isDemoMode();
