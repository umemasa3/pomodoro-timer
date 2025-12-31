/**
 * Core Web Vitals最適化ユーティリティ
 * LCP、FID、CLSの基準値クリアのための最適化機能を提供
 */

import { lazy } from 'react';

// LCP最適化: 重要なリソースのプリロード
export function preloadCriticalResources(): void {
  // フォントのプリロード
  const fontPreloads = [
    '/fonts/inter-var.woff2',
    '/fonts/inter-var-latin.woff2',
  ];

  fontPreloads.forEach(fontUrl => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = fontUrl;
    document.head.appendChild(link);
  });

  // 重要な画像のプリロード
  const criticalImages = [
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/apple-touch-icon.png',
  ];

  criticalImages.forEach(imageUrl => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = imageUrl;
    document.head.appendChild(link);
  });
}

// LCP最適化: 重要なコンポーネントの即座読み込み
export const CriticalComponents = {
  // タイマーコンポーネントは即座に読み込み（LCP要素）
  TimerComponent: lazy(() =>
    import('../components/timer/timer-component').then(module => ({
      default: module.TimerComponent,
    }))
  ),

  // 認証コンポーネントも即座に読み込み
  AuthPage: lazy(() =>
    import('../pages/auth-page').then(module => ({
      default: module.AuthPage,
    }))
  ),
};

// FID最適化: 非重要なコンポーネントの遅延読み込み
export const LazyComponents = {
  // 統計ページは遅延読み込み
  StatisticsPage: lazy(() =>
    import('../pages/statistics-page').then(module => ({
      default: module.StatisticsPage,
    }))
  ),

  // タスクページは遅延読み込み
  TasksPage: lazy(() =>
    import('../pages/tasks-page').then(module => ({
      default: module.TasksPage,
    }))
  ),

  // 監視ダッシュボードは遅延読み込み
  MonitoringDashboard: lazy(() =>
    import('../components/monitoring-dashboard').then(module => ({
      default: module.MonitoringDashboard,
    }))
  ),

  // 運用ダッシュボードは遅延読み込み
  OperationsDashboard: lazy(() =>
    import('../components/operations-dashboard').then(module => ({
      default: module.OperationsDashboard,
    }))
  ),

  // 応答時間ダッシュボードは遅延読み込み
  ResponseTimeDashboard: lazy(() =>
    import('../components/monitoring/response-time-dashboard').then(module => ({
      default: module.ResponseTimeDashboard,
    }))
  ),

  // オンボーディング関連は遅延読み込み
  OnboardingTour: lazy(() =>
    import('../components/onboarding/onboarding-tour').then(module => ({
      default: module.OnboardingTour,
    }))
  ),

  SetupWizard: lazy(() =>
    import('../components/onboarding/setup-wizard').then(module => ({
      default: module.SetupWizard,
    }))
  ),
};

// CLS最適化: レイアウトシフト防止
export class LayoutStabilizer {
  private static resizeObserver: ResizeObserver | null = null;
  private static observedElements = new Set<Element>();

  /**
   * 要素のサイズ変更を監視してレイアウトシフトを防ぐ
   */
  static observeElement(element: Element): void {
    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
          const element = entry.target;

          // 要素に固定サイズを設定してレイアウトシフトを防ぐ
          if (element instanceof HTMLElement) {
            const { width, height } = entry.contentRect;

            // 最小サイズを設定
            if (width > 0 && height > 0) {
              element.style.minWidth = `${width}px`;
              element.style.minHeight = `${height}px`;
            }
          }
        });
      });
    }

    if (!this.observedElements.has(element)) {
      this.resizeObserver.observe(element);
      this.observedElements.add(element);
    }
  }

  /**
   * 要素の監視を停止
   */
  static unobserveElement(element: Element): void {
    if (this.resizeObserver && this.observedElements.has(element)) {
      this.resizeObserver.unobserve(element);
      this.observedElements.delete(element);
    }
  }

  /**
   * すべての監視を停止
   */
  static disconnect(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.observedElements.clear();
    }
  }
}

// FID最適化: メインスレッドブロッキングの回避
export class TaskScheduler {
  private static taskQueue: Array<() => void> = [];
  private static isProcessing = false;

  /**
   * 重い処理を小さなチャンクに分割して実行
   */
  static scheduleTask(
    task: () => void,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    if (priority === 'high') {
      this.taskQueue.unshift(task);
    } else {
      this.taskQueue.push(task);
    }

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * アイドル時間を利用してタスクを実行
   */
  private static processQueue(): void {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    // requestIdleCallbackが利用可能な場合は使用
    if ('requestIdleCallback' in window) {
      requestIdleCallback(deadline => {
        while (deadline.timeRemaining() > 0 && this.taskQueue.length > 0) {
          const task = this.taskQueue.shift();
          if (task) {
            try {
              task();
            } catch (error) {
              console.error('Scheduled task error:', error);
            }
          }
        }
        this.processQueue();
      });
    } else {
      // フォールバック: setTimeoutを使用
      setTimeout(() => {
        const task = this.taskQueue.shift();
        if (task) {
          try {
            task();
          } catch (error) {
            console.error('Scheduled task error:', error);
          }
        }
        this.processQueue();
      }, 0);
    }
  }

  /**
   * 重い計算処理を分割実行
   */
  static async processLargeDataset<T, R>(
    data: T[],
    processor: (item: T) => R,
    chunkSize: number = 100
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      // チャンクを処理
      const chunkResults = chunk.map(processor);
      results.push(...chunkResults);

      // 次のチャンクの前にメインスレッドを解放
      if (i + chunkSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return results;
  }
}

// リソース最適化: 画像の遅延読み込み
export class ImageOptimizer {
  private static intersectionObserver: IntersectionObserver | null = null;
  private static observedImages = new Set<HTMLImageElement>();

  /**
   * 画像の遅延読み込みを設定
   */
  static setupLazyLoading(): void {
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              const src = img.dataset.src;

              if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                this.intersectionObserver?.unobserve(img);
                this.observedImages.delete(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01,
        }
      );
    }
  }

  /**
   * 画像要素を遅延読み込み対象に追加
   */
  static observeImage(img: HTMLImageElement): void {
    if (!this.intersectionObserver) {
      this.setupLazyLoading();
    }

    if (!this.observedImages.has(img)) {
      this.intersectionObserver?.observe(img);
      this.observedImages.add(img);
    }
  }

  /**
   * WebP対応の画像URLを生成
   */
  static getOptimizedImageUrl(originalUrl: string): string {
    // WebP対応チェック
    const supportsWebP = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();

    if (supportsWebP && !originalUrl.includes('.webp')) {
      // 拡張子をWebPに変更
      return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }

    return originalUrl;
  }
}

// パフォーマンス測定とレポート
export class PerformanceReporter {
  /**
   * Core Web Vitalsを測定してレポート
   */
  static async measureCoreWebVitals(): Promise<{
    lcp: number | null;
    fid: number | null;
    cls: number | null;
  }> {
    const results = {
      lcp: null as number | null,
      fid: null as number | null,
      cls: null as number | null,
    };

    // LCP測定
    if ('PerformanceObserver' in window) {
      try {
        await new Promise<void>(resolve => {
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              results.lcp = lastEntry.startTime;
            }
            observer.disconnect();
            resolve();
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          // タイムアウト設定
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 5000);
        });
      } catch (error) {
        console.warn('LCP measurement failed:', error);
      }

      // FID測定
      try {
        await new Promise<void>(resolve => {
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              results.fid = entry.processingStart - entry.startTime;
            });
            observer.disconnect();
            resolve();
          });
          observer.observe({ entryTypes: ['first-input'] });

          // タイムアウト設定
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 10000);
        });
      } catch (error) {
        console.warn('FID measurement failed:', error);
      }

      // CLS測定
      try {
        let clsValue = 0;
        await new Promise<void>(resolve => {
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            results.cls = clsValue;
          });
          observer.observe({ entryTypes: ['layout-shift'] });

          // 5秒後に測定終了
          setTimeout(() => {
            observer.disconnect();
            results.cls = clsValue;
            resolve();
          }, 5000);
        });
      } catch (error) {
        console.warn('CLS measurement failed:', error);
      }
    }

    return results;
  }

  /**
   * パフォーマンス最適化の推奨事項を生成
   */
  static generateOptimizationRecommendations(metrics: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
  }): string[] {
    const recommendations: string[] = [];

    // LCP最適化推奨
    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push(
        'LCP改善: 重要なリソースのプリロード、画像最適化、サーバー応答時間の改善を検討してください'
      );
    }

    // FID最適化推奨
    if (metrics.fid && metrics.fid > 100) {
      recommendations.push(
        'FID改善: JavaScriptの分割読み込み、重い処理の最適化、メインスレッドのブロッキング回避を検討してください'
      );
    }

    // CLS最適化推奨
    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push(
        'CLS改善: 画像・動画のサイズ指定、フォント読み込み最適化、動的コンテンツの事前領域確保を検討してください'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Core Web Vitalsは良好です！');
    }

    return recommendations;
  }
}

// Core Web Vitals最適化: 積極的な最適化設定
export class CoreWebVitalsOptimizer {
  private static isInitialized = false;

  /**
   * Core Web Vitals基準値クリアのための積極的最適化を実行
   */
  static async optimizeForCoreWebVitals(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. LCP最適化: 重要なリソースの即座プリロード
    this.optimizeLCP();

    // 2. FID最適化: メインスレッドブロッキング回避
    this.optimizeFID();

    // 3. CLS最適化: レイアウトシフト防止
    this.optimizeCLS();

    // 4. 継続的な監視と自動調整
    this.startContinuousOptimization();
  }

  /**
   * LCP最適化: 2.5秒以下を目標
   */
  private static optimizeLCP(): void {
    // 重要なリソースの即座プリロード
    const criticalResources = [
      { href: '/src/main.tsx', as: 'script' },
      { href: '/src/index.css', as: 'style' },
      { href: '/pwa-192x192.png', as: 'image', type: 'image/png' },
      { href: '/apple-touch-icon.png', as: 'image', type: 'image/png' },
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      if (resource.as === 'font') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // DNS プリフェッチの追加
    const dnsPrefetchDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ];

    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

    // 重要な画像の即座読み込み
    const criticalImages = document.querySelectorAll(
      'img[data-critical="true"]'
    );
    criticalImages.forEach(img => {
      if (img instanceof HTMLImageElement && img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
  }

  /**
   * FID最適化: 100ms以下を目標
   */
  private static optimizeFID(): void {
    // 重い処理の分割実行
    const originalSetTimeout = window.setTimeout;
    (window as any).setTimeout = function (
      callback: TimerHandler,
      delay: number = 0,
      ...args: any[]
    ) {
      // 5ms以上の遅延がある場合は、より小さなチャンクに分割
      if (delay > 5) {
        return originalSetTimeout(
          () => {
            TaskScheduler.scheduleTask(() => {
              if (typeof callback === 'function') {
                callback();
              } else if (typeof callback === 'string') {
                eval(callback);
              }
            }, 'normal');
          },
          Math.min(delay, 5)
        );
      }
      return originalSetTimeout(callback, delay, ...args);
    };

    // 非重要なスクリプトの遅延読み込み
    const nonCriticalScripts = document.querySelectorAll(
      'script[data-defer="true"]'
    );
    nonCriticalScripts.forEach(script => {
      if (script instanceof HTMLScriptElement) {
        script.defer = true;
      }
    });

    // アイドル時間を活用した処理の最適化
    if ('requestIdleCallback' in window) {
      const idleOptimizations = [
        () => this.preloadNonCriticalResources(),
        () => this.optimizeEventListeners(),
        () => this.cleanupUnusedResources(),
      ];

      idleOptimizations.forEach(optimization => {
        requestIdleCallback(optimization, { timeout: 1000 });
      });
    }
  }

  /**
   * CLS最適化: 0.1以下を目標
   */
  private static optimizeCLS(): void {
    // 画像・動画のサイズ属性を自動設定
    const mediaElements = document.querySelectorAll('img, video');
    mediaElements.forEach(element => {
      if (
        element instanceof HTMLImageElement ||
        element instanceof HTMLVideoElement
      ) {
        if (!element.width || !element.height) {
          // アスペクト比を維持するためのCSS設定
          element.style.aspectRatio = 'auto';
          element.style.width = '100%';
          element.style.height = 'auto';
        }
      }
    });

    // フォント読み込み最適化
    const fontLinks = document.querySelectorAll('link[href*="fonts"]');
    fontLinks.forEach(link => {
      if (link instanceof HTMLLinkElement) {
        link.setAttribute('font-display', 'swap');
      }
    });

    // 動的コンテンツの事前領域確保
    const dynamicContainers = document.querySelectorAll(
      '[data-dynamic="true"]'
    );
    dynamicContainers.forEach(container => {
      if (container instanceof HTMLElement) {
        const minHeight = container.dataset.minHeight || '100px';
        container.style.minHeight = minHeight;
      }
    });

    // レイアウトシフトの監視と自動修正
    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const { width, height } = entry.contentRect;

          // 要素のサイズが確定したら最小サイズを設定
          if (width > 0 && height > 0) {
            element.style.minWidth = `${width}px`;
            element.style.minHeight = `${height}px`;
          }
        });
      });

      // 重要な要素を監視対象に追加
      const criticalElements = document.querySelectorAll(
        '[data-cls-critical="true"]'
      );
      criticalElements.forEach(element => {
        resizeObserver.observe(element);
      });
    }
  }

  /**
   * 継続的な最適化と監視
   */
  private static startContinuousOptimization(): void {
    // 5秒ごとにCore Web Vitalsをチェックして動的最適化
    setInterval(async () => {
      const metrics = await PerformanceReporter.measureCoreWebVitals();

      // LCPが基準値を超えている場合の緊急最適化
      if (metrics.lcp && metrics.lcp > 2500) {
        this.emergencyLCPOptimization();
      }

      // FIDが基準値を超えている場合の緊急最適化
      if (metrics.fid && metrics.fid > 100) {
        this.emergencyFIDOptimization();
      }

      // CLSが基準値を超えている場合の緊急最適化
      if (metrics.cls && metrics.cls > 0.1) {
        this.emergencyCLSOptimization();
      }
    }, 5000);
  }

  /**
   * 緊急LCP最適化
   */
  private static emergencyLCPOptimization(): void {
    // 非重要な画像の遅延読み込みを強制
    const images = document.querySelectorAll('img:not([data-critical="true"])');
    images.forEach(img => {
      if (img instanceof HTMLImageElement && img.src && !img.dataset.src) {
        img.dataset.src = img.src;
        img.src =
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';
        ImageOptimizer.observeImage(img);
      }
    });

    // 非重要なCSSの遅延読み込み
    const nonCriticalStyles = document.querySelectorAll(
      'link[rel="stylesheet"]:not([data-critical="true"])'
    );
    nonCriticalStyles.forEach(link => {
      if (link instanceof HTMLLinkElement) {
        link.media = 'print';
        link.onload = () => {
          link.media = 'all';
        };
      }
    });
  }

  /**
   * 緊急FID最適化
   */
  private static emergencyFIDOptimization(): void {
    // 重いイベントリスナーの最適化
    const heavyListeners = ['scroll', 'resize', 'mousemove'];
    heavyListeners.forEach(eventType => {
      const elements = document.querySelectorAll(
        `[data-${eventType}-listener="true"]`
      );
      elements.forEach(element => {
        // パッシブリスナーに変更
        const originalListener = (element as any)[`on${eventType}`];
        if (originalListener) {
          element.removeEventListener(eventType, originalListener);
          element.addEventListener(eventType, originalListener, {
            passive: true,
          });
        }
      });
    });

    // 非重要なJavaScriptの実行を遅延
    TaskScheduler.scheduleTask(() => {
      const nonCriticalScripts = document.querySelectorAll(
        'script[data-defer="true"]'
      );
      nonCriticalScripts.forEach(script => {
        if (script instanceof HTMLScriptElement && !script.defer) {
          script.defer = true;
        }
      });
    }, 'low');
  }

  /**
   * 緊急CLS最適化
   */
  private static emergencyCLSOptimization(): void {
    // すべての画像に固定サイズを設定
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        const computedStyle = window.getComputedStyle(img);
        const width = computedStyle.width;
        const height = computedStyle.height;

        if (width !== 'auto' && height !== 'auto') {
          img.style.width = width;
          img.style.height = height;
        }
      }
    });

    // 動的コンテンツの領域を固定
    const dynamicElements = document.querySelectorAll('[data-dynamic="true"]');
    dynamicElements.forEach(element => {
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          element.style.minWidth = `${rect.width}px`;
          element.style.minHeight = `${rect.height}px`;
        }
      }
    });
  }

  /**
   * 非重要なリソースのプリロード
   */
  private static preloadNonCriticalResources(): void {
    const nonCriticalResources = [
      '/sounds/notification.mp3',
      '/sounds/break.mp3',
      '/sounds/complete.mp3',
    ];

    nonCriticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * イベントリスナーの最適化
   */
  private static optimizeEventListeners(): void {
    // パッシブリスナーの設定
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'scroll'];
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options
    ) {
      if (passiveEvents.includes(type) && typeof options !== 'object') {
        options = { passive: true };
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * 未使用リソースのクリーンアップ
   */
  private static cleanupUnusedResources(): void {
    // 未使用の画像プリロードを削除
    const preloadLinks = document.querySelectorAll(
      'link[rel="preload"][as="image"]'
    );
    preloadLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const isUsed = document.querySelector(`img[src="${href}"]`);
        if (!isUsed) {
          link.remove();
        }
      }
    });

    // 未使用のフォントプリロードを削除
    const fontPreloads = document.querySelectorAll(
      'link[rel="preload"][as="font"]'
    );
    fontPreloads.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        const fontFamily = href.match(/\/([^/]+)\.(woff2?|ttf|eot)$/)?.[1];
        if (fontFamily) {
          const isUsed = Array.from(document.styleSheets).some(sheet => {
            try {
              return Array.from(sheet.cssRules).some(rule =>
                rule.cssText.includes(fontFamily)
              );
            } catch {
              return false;
            }
          });
          if (!isUsed) {
            link.remove();
          }
        }
      }
    });
  }
}

// 初期化関数
export function initializePerformanceOptimizations(): void {
  // Core Web Vitals最適化の実行
  CoreWebVitalsOptimizer.optimizeForCoreWebVitals();

  // 重要なリソースのプリロード
  preloadCriticalResources();

  // 画像の遅延読み込み設定
  ImageOptimizer.setupLazyLoading();

  // 応答時間監視の初期化
  if (typeof window !== 'undefined') {
    import('../services/performance-monitor').then(
      ({ initializePerformanceMonitoring }) => {
        initializePerformanceMonitoring({
          thresholds: {
            LCP: 2500,
            FID: 100,
            CLS: 0.1,
            customMetrics: {
              'page-load-time': 3000,
              'api-response-time': 2000, // 2秒以内の目標
              'page-transition-time': 1000, // 1秒以内のページ遷移目標
              'route-change-time': 800, // 800ms以内のルート変更目標
              'component-render-time': 100, // 100ms以内のコンポーネント描画目標
              'navigation-timing': 2000, // 2秒以内のナビゲーション目標
            },
          },
        });
      }
    );
  }

  // パフォーマンス測定の開始
  if (typeof window !== 'undefined') {
    // ページ読み込み完了後にCore Web Vitalsを測定
    window.addEventListener('load', async () => {
      // 少し待ってから測定開始
      setTimeout(async () => {
        const metrics = await PerformanceReporter.measureCoreWebVitals();
        const recommendations =
          PerformanceReporter.generateOptimizationRecommendations(metrics);

        console.log('📊 Core Web Vitals測定結果:', metrics);
        console.log('💡 最適化推奨事項:', recommendations);

        // 基準値チェック
        const lcpPassed = !metrics.lcp || metrics.lcp <= 2500;
        const fidPassed = !metrics.fid || metrics.fid <= 100;
        const clsPassed = !metrics.cls || metrics.cls <= 0.1;
        const allPassed = lcpPassed && fidPassed && clsPassed;

        console.log(
          `🎯 Core Web Vitals基準値チェック: ${allPassed ? '✅ 全基準クリア' : '❌ 要改善'}`
        );
        if (metrics.lcp)
          console.log(
            `   LCP: ${metrics.lcp.toFixed(2)}ms ${lcpPassed ? '✅' : '❌'} (基準: 2500ms)`
          );
        if (metrics.fid)
          console.log(
            `   FID: ${metrics.fid.toFixed(2)}ms ${fidPassed ? '✅' : '❌'} (基準: 100ms)`
          );
        if (metrics.cls)
          console.log(
            `   CLS: ${metrics.cls.toFixed(3)} ${clsPassed ? '✅' : '❌'} (基準: 0.1)`
          );

        // パフォーマンス監視サービスに結果を送信
        if (metrics.lcp) {
          window.dispatchEvent(
            new CustomEvent('performance-metric', {
              detail: { name: 'LCP', value: metrics.lcp },
            })
          );
        }
        if (metrics.fid) {
          window.dispatchEvent(
            new CustomEvent('performance-metric', {
              detail: { name: 'FID', value: metrics.fid },
            })
          );
        }
        if (metrics.cls) {
          window.dispatchEvent(
            new CustomEvent('performance-metric', {
              detail: { name: 'CLS', value: metrics.cls },
            })
          );
        }
      }, 1000);
    });
  }
}
