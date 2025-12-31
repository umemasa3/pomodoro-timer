/// <reference types="vite/client" />

// NodeJS型定義（ブラウザ環境用）
declare namespace NodeJS {
  interface Timeout {
    ref(): this;
    unref(): this;
    hasRef(): boolean;
    refresh(): this;
    [Symbol.toPrimitive](): number;
  }

  interface Timer extends Timeout {
    // Timerインターフェースに追加のプロパティがある場合はここに定義
    readonly id?: number;
  }
}

// Process型定義（ブラウザ環境用）
declare const process: {
  env: {
    NODE_ENV: string;
    [key: string]: string | undefined;
  };
};

// TimerHandler型定義
type TimerHandler = string | (() => void);

// 環境変数の型定義
interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ENABLE_SOURCE_MAPS: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Core Web Vitals関連の型定義
interface PerformanceEntry {
  readonly duration: number;
  readonly entryType: string;
  readonly name: string;
  readonly startTime: number;
  toJSON(): any;
}

interface PerformanceObserver {
  observe(options: PerformanceObserverInit): void;
  disconnect(): void;
  takeRecords(): PerformanceEntryList;
}

interface PerformanceObserverInit {
  entryTypes?: string[];
  type?: string;
  buffered?: boolean;
}

type PerformanceEntryList = PerformanceEntry[];

interface PerformanceObserverCallback {
  (entries: PerformanceObserverEntryList, observer: PerformanceObserver): void;
}

interface PerformanceObserverEntryList {
  getEntries(): PerformanceEntryList;
  getEntriesByName(name: string, type?: string): PerformanceEntryList;
  getEntriesByType(type: string): PerformanceEntryList;
}

declare const PerformanceObserver: {
  prototype: PerformanceObserver;
  new (callback: PerformanceObserverCallback): PerformanceObserver;
  readonly supportedEntryTypes: ReadonlyArray<string>;
};

// Web Vitals関連の型定義
interface LayoutShiftEntry extends PerformanceEntry {
  readonly value: number;
  readonly hadRecentInput: boolean;
  readonly lastInputTime: number;
  readonly sources: LayoutShiftAttribution[];
}

interface LayoutShiftAttribution {
  readonly node?: Node;
  readonly previousRect: DOMRectReadOnly;
  readonly currentRect: DOMRectReadOnly;
}

interface LargestContentfulPaintEntry extends PerformanceEntry {
  readonly renderTime: number;
  readonly loadTime: number;
  readonly size: number;
  readonly id: string;
  readonly url: string;
  readonly element?: Element;
}

interface FirstInputEntry extends PerformanceEntry {
  readonly processingStart: number;
  readonly processingEnd: number;
  readonly cancelable: boolean;
  readonly target?: Node;
}

// RequestIdleCallback関連の型定義
interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleRequestOptions {
  timeout?: number;
}

interface IdleRequestCallback {
  (deadline: IdleDeadline): void;
}

declare function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number;

declare function cancelIdleCallback(handle: number): void;

// Performance Memory API（Chrome拡張）
interface PerformanceMemory {
  readonly jsHeapSizeLimit: number;
  readonly totalJSHeapSize: number;
  readonly usedJSHeapSize: number;
}

interface Performance {
  readonly memory?: PerformanceMemory;
}
