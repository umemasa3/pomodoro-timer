/**
 * パフォーマンス監視ユーティリティ
 * 本番環境でのパフォーマンス測定とレポート
 */

import { env, isProduction, isDevelopment } from './env';

// パフォーマンスメトリクスの型定義
interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift

  // カスタムメトリクス
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;

  // アプリケーション固有
  timerAccuracy?: number;
  supabaseResponseTime?: number;
  cacheHitRate?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined' && isProduction) {
      this.initializeObservers();
      this.measureInitialMetrics();
    }
  }

  /**
   * パフォーマンスオブザーバーの初期化
   */
  private initializeObservers(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          };

          if (lastEntry) {
            this.metrics.lcp = lastEntry.renderTime || lastEntry.loadTime || 0;
            this.reportMetric('lcp', this.metrics.lcp);
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer初期化エラー:', error);
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'first-input') {
              const fidEntry = entry as PerformanceEntry & {
                processingStart?: number;
              };
              this.metrics.fid = fidEntry.processingStart
                ? fidEntry.processingStart - entry.startTime
                : 0;
              this.reportMetric('fid', this.metrics.fid);
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer初期化エラー:', error);
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'layout-shift') {
              const layoutShiftEntry = entry as PerformanceEntry & {
                value?: number;
                hadRecentInput?: boolean;
              };

              if (!layoutShiftEntry.hadRecentInput) {
                clsValue += layoutShiftEntry.value || 0;
              }
            }
          });

          this.metrics.cls = clsValue;
          this.reportMetric('cls', this.metrics.cls);
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer初期化エラー:', error);
      }
    }
  }

  /**
   * 初期メトリクスの測定
   */
  private measureInitialMetrics(): void {
    // DOMContentLoaded時間
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now();
        this.reportMetric('domContentLoaded', this.metrics.domContentLoaded);
      });
    } else {
      this.metrics.domContentLoaded = performance.now();
    }

    // ページ読み込み完了時間
    window.addEventListener('load', () => {
      this.metrics.loadComplete = performance.now();
      this.reportMetric('loadComplete', this.metrics.loadComplete);

      // Navigation Timing APIからのメトリクス
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigationEntries = performance.getEntriesByType(
          'navigation'
        ) as PerformanceNavigationTiming[];
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0];

          // Time to First Byte
          if (nav && nav.responseStart && nav.requestStart) {
            this.metrics.ttfb = nav.responseStart - nav.requestStart;
            this.reportMetric('ttfb', this.metrics.ttfb);
          }

          // First Contentful Paint
          const paintEntries = performance.getEntriesByType('paint');
          const fcpEntry = paintEntries.find(
            entry => entry.name === 'first-contentful-paint'
          );
          if (fcpEntry) {
            this.metrics.fcp = fcpEntry.startTime;
            this.reportMetric('fcp', this.metrics.fcp);
          }
        }
      }
    });
  }

  /**
   * タイマーの精度を測定
   */
  measureTimerAccuracy(expectedDuration: number, actualDuration: number): void {
    const accuracy = Math.abs(expectedDuration - actualDuration);
    this.metrics.timerAccuracy = accuracy;
    this.reportMetric('timerAccuracy', accuracy);
  }

  /**
   * Supabaseレスポンス時間を測定
   */
  measureSupabaseResponse(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.metrics.supabaseResponseTime = responseTime;
    this.reportMetric('supabaseResponseTime', responseTime);
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHit(isHit: boolean): void {
    // 簡単なキャッシュヒット率計算
    const currentRate = this.metrics.cacheHitRate || 0;
    const newRate = isHit ? currentRate + 0.1 : Math.max(0, currentRate - 0.1);
    this.metrics.cacheHitRate = Math.min(1, newRate);

    if (isDevelopment) {
      console.log(
        `キャッシュ${isHit ? 'ヒット' : 'ミス'}: 現在の率 ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`
      );
    }
  }

  /**
   * メトリクスをレポート
   */
  public reportMetric(name: string, value: number): void {
    if (isDevelopment) {
      console.log(`📊 ${name}: ${value.toFixed(2)}ms`);
    }

    // 本番環境では分析サービスに送信
    if (isProduction && env.enableAnalytics) {
      this.sendToAnalytics(name, value);
    }
  }

  /**
   * 分析サービスにメトリクスを送信
   */
  private sendToAnalytics(metricName: string, value: number): void {
    // 実際の分析サービス（Google Analytics、Mixpanel等）への送信
    // ここでは例として console.log を使用
    if (typeof (window as any).gtag !== 'undefined') {
      // Google Analytics 4の例
      (window as any).gtag('event', 'performance_metric', {
        metric_name: metricName,
        metric_value: value,
        app_version: env.appVersion,
      });
    }

    // カスタム分析エンドポイントへの送信例
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric: metricName,
        value,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        appVersion: env.appVersion,
      }),
    }).catch(error => {
      console.warn('分析データ送信エラー:', error);
    });
  }

  /**
   * 現在のメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): string {
    const report = [
      '📊 パフォーマンスレポート',
      '========================',
      '',
      'Core Web Vitals:',
      `  FCP: ${this.metrics.fcp?.toFixed(2) || 'N/A'}ms`,
      `  LCP: ${this.metrics.lcp?.toFixed(2) || 'N/A'}ms`,
      `  FID: ${this.metrics.fid?.toFixed(2) || 'N/A'}ms`,
      `  CLS: ${this.metrics.cls?.toFixed(3) || 'N/A'}`,
      '',
      'カスタムメトリクス:',
      `  TTFB: ${this.metrics.ttfb?.toFixed(2) || 'N/A'}ms`,
      `  DOM読み込み: ${this.metrics.domContentLoaded?.toFixed(2) || 'N/A'}ms`,
      `  完全読み込み: ${this.metrics.loadComplete?.toFixed(2) || 'N/A'}ms`,
      `  タイマー精度: ${this.metrics.timerAccuracy?.toFixed(2) || 'N/A'}ms`,
      `  Supabaseレスポンス: ${this.metrics.supabaseResponseTime?.toFixed(2) || 'N/A'}ms`,
      `  キャッシュヒット率: ${((this.metrics.cacheHitRate || 0) * 100).toFixed(1)}%`,
    ].join('\n');

    return report;
  }

  /**
   * オブザーバーのクリーンアップ
   */
  cleanup(): void {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
  }
}

// グローバルインスタンス
export const performanceMonitor = new PerformanceMonitor();

/**
 * パフォーマンス測定用のデコレータ関数
 */
export function measurePerformance<
  T extends (...args: unknown[]) => Promise<unknown>,
>(fn: T, metricName: string): T {
  return (async (...args: unknown[]) => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const endTime = performance.now();
      performanceMonitor.reportMetric(metricName, endTime - startTime);
      return result;
    } catch (error) {
      const endTime = performance.now();
      performanceMonitor.reportMetric(
        `${metricName}_error`,
        endTime - startTime
      );
      throw error;
    }
  }) as T;
}

/**
 * Web Vitalsの閾値チェック
 */
export function checkWebVitalsThresholds(metrics: PerformanceMetrics): {
  fcp: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  lcp: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  fid: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  cls: 'good' | 'needs-improvement' | 'poor' | 'unknown';
} {
  return {
    fcp: metrics.fcp
      ? metrics.fcp <= 1800
        ? 'good'
        : metrics.fcp <= 3000
          ? 'needs-improvement'
          : 'poor'
      : 'unknown',
    lcp: metrics.lcp
      ? metrics.lcp <= 2500
        ? 'good'
        : metrics.lcp <= 4000
          ? 'needs-improvement'
          : 'poor'
      : 'unknown',
    fid: metrics.fid
      ? metrics.fid <= 100
        ? 'good'
        : metrics.fid <= 300
          ? 'needs-improvement'
          : 'poor'
      : 'unknown',
    cls: metrics.cls
      ? metrics.cls <= 0.1
        ? 'good'
        : metrics.cls <= 0.25
          ? 'needs-improvement'
          : 'poor'
      : 'unknown',
  };
}

// 開発環境でのパフォーマンス情報表示
if (isDevelopment) {
  // 5秒後にレポートを表示
  setTimeout(() => {
    console.log(performanceMonitor.generateReport());
  }, 5000);
}
