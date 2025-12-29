/**
 * PWA関連の型定義
 */

/**
 * BeforeInstallPromptEvent インターフェース
 * PWAインストールプロンプトのイベント型
 */
export interface BeforeInstallPromptEvent extends Event {
  /**
   * デフォルトのインストールプロンプトを防ぐ
   */
  preventDefault(): void;

  /**
   * インストールプロンプトを表示
   */
  prompt(): Promise<void>;

  /**
   * ユーザーの選択結果
   */
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

/**
 * Service Worker更新イベント
 */
export interface ServiceWorkerUpdateEvent {
  type: 'waiting' | 'controlling' | 'activated';
  sw?: ServiceWorker;
}

/**
 * PWA設定オプション
 */
export interface PWAConfig {
  /**
   * Service Workerの自動更新を有効にするか
   */
  autoUpdate: boolean;

  /**
   * インストールプロンプトを表示するか
   */
  showInstallPrompt: boolean;

  /**
   * オフライン通知を表示するか
   */
  showOfflineIndicator: boolean;

  /**
   * キャッシュ戦略
   */
  cacheStrategy: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate';
}

/**
 * グローバルなWindow型の拡張
 */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}
