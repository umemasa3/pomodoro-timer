import '@testing-library/jest-dom';

// グローバルテスト設定
(globalThis as Record<string, unknown>).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Web Notifications APIのモック
Object.defineProperty(window, 'Notification', {
  writable: true,
  value: class Notification {
    static permission = 'granted';
    static requestPermission = () => Promise.resolve('granted');
    constructor(title: string, options?: NotificationOptions) {
      this.title = title;
      this.body = options?.body || '';
    }
    title: string;
    body: string;
    close() {}
  },
});

// matchMediaのモック（レスポンシブテスト用）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
