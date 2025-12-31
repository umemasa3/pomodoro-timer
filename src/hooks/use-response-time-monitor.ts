/**
 * 応答時間監視用のReact Hook
 * ページ遷移、API呼び出し、コンポーネント描画時間を自動監視
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getPerformanceMonitor } from '../services/performance-monitor';

interface UseResponseTimeMonitorOptions {
  enabled?: boolean;
  componentName?: string;
  trackPageTransitions?: boolean;
  trackComponentRender?: boolean;
}

interface ResponseTimeMonitorHook {
  recordApiCall: (endpoint: string, promise: Promise<any>) => Promise<any>;
  recordPageTransition: (fromRoute: string, toRoute: string) => void;
  recordComponentRender: (renderTime: number) => void;
  startTimer: () => () => number;
}

/**
 * 応答時間監視Hook
 */
export function useResponseTimeMonitor(
  options: UseResponseTimeMonitorOptions = {}
): ResponseTimeMonitorHook {
  const {
    enabled = true,
    componentName = 'UnknownComponent',
    trackPageTransitions = true,
    trackComponentRender = true,
  } = options;

  const location = useLocation();
  const previousLocationRef = useRef<string>(location.pathname);
  const pageTransitionStartRef = useRef<number>();
  const componentRenderStartRef = useRef<number>();
  const performanceMonitor = getPerformanceMonitor();

  // 初期化
  useEffect(() => {
    pageTransitionStartRef.current = Date.now();
    componentRenderStartRef.current = Date.now();
  }, []);

  // ページ遷移の監視
  useEffect(() => {
    if (!enabled || !trackPageTransitions) return;

    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;

    if (previousPath !== currentPath) {
      const transitionTime = Date.now() - pageTransitionStartRef.current;
      performanceMonitor.recordPageTransitionTime(
        previousPath,
        currentPath,
        transitionTime
      );

      // 次の遷移のための準備
      previousLocationRef.current = currentPath;
      pageTransitionStartRef.current = Date.now();
    }
  }, [location.pathname, enabled, trackPageTransitions, performanceMonitor]);

  // コンポーネント描画時間の監視
  useEffect(() => {
    if (!enabled || !trackComponentRender) return;

    const renderTime = Date.now() - componentRenderStartRef.current;
    performanceMonitor.recordComponentRenderTime(componentName, renderTime);

    // 次の描画のための準備
    componentRenderStartRef.current = Date.now();
  });

  // API呼び出し時間の記録
  const recordApiCall = useCallback(
    async <T>(endpoint: string, promise: Promise<T>): Promise<T> => {
      if (!enabled) return promise;

      const startTime = Date.now();

      try {
        const result = await promise;
        const responseTime = Date.now() - startTime;
        performanceMonitor.recordApiResponseTime(endpoint, responseTime);
        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        performanceMonitor.recordApiResponseTime(
          `${endpoint}-error`,
          responseTime
        );
        throw error;
      }
    },
    [enabled, performanceMonitor]
  );

  // ページ遷移時間の手動記録
  const recordPageTransition = useCallback(
    (fromRoute: string, toRoute: string) => {
      if (!enabled) return;

      const transitionTime = Date.now() - pageTransitionStartRef.current;
      performanceMonitor.recordPageTransitionTime(
        fromRoute,
        toRoute,
        transitionTime
      );
      pageTransitionStartRef.current = Date.now();
    },
    [enabled, performanceMonitor]
  );

  // コンポーネント描画時間の手動記録
  const recordComponentRender = useCallback(
    (renderTime: number) => {
      if (!enabled) return;

      performanceMonitor.recordComponentRenderTime(componentName, renderTime);
    },
    [enabled, componentName, performanceMonitor]
  );

  // タイマー機能
  const startTimer = useCallback(() => {
    const startTime = Date.now();

    return () => {
      return Date.now() - startTime;
    };
  }, []);

  return {
    recordApiCall,
    recordPageTransition,
    recordComponentRender,
    startTimer,
  };
}

/**
 * API呼び出し専用Hook
 */
export function useApiResponseTimeMonitor(enabled = true) {
  const performanceMonitor = getPerformanceMonitor();

  const recordApiCall = useCallback(
    async <T>(endpoint: string, promise: Promise<T>): Promise<T> => {
      if (!enabled) return promise;

      const startTime = Date.now();

      try {
        const result = await promise;
        const responseTime = Date.now() - startTime;
        performanceMonitor.recordApiResponseTime(endpoint, responseTime);

        // 2秒以内の目標チェック
        if (responseTime <= 2000) {
          console.log(
            `✅ API応答時間目標達成: ${endpoint} - ${responseTime}ms`
          );
        }

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        performanceMonitor.recordApiResponseTime(
          `${endpoint}-error`,
          responseTime
        );
        throw error;
      }
    },
    [enabled, performanceMonitor]
  );

  return { recordApiCall };
}

/**
 * ページ遷移専用Hook
 */
export function usePageTransitionMonitor(enabled = true) {
  const location = useLocation();
  const transitionStartRef = useRef<number>();
  const performanceMonitor = getPerformanceMonitor();

  // 初期化
  useEffect(() => {
    transitionStartRef.current = Date.now();
  }, []);

  const [previousRoute, setPreviousRoute] = useState<string>(location.pathname);

  useEffect(() => {
    if (!enabled) return;

    const currentPath = location.pathname;

    if (previousRoute !== currentPath) {
      const transitionTime = transitionStartRef.current
        ? Date.now() - transitionStartRef.current
        : 0;

      if (transitionTime > 0) {
        performanceMonitor.recordPageTransitionTime(
          previousRoute,
          currentPath,
          transitionTime
        );

        // 1秒以内の目標チェック
        if (transitionTime <= 1000) {
          console.log(
            `✅ ページ遷移時間目標達成: ${previousRoute} → ${currentPath} - ${transitionTime}ms`
          );
        }
      }

      // 次のレンダリングサイクルで状態を更新
      const timer = setTimeout(() => {
        setPreviousRoute(currentPath);
      }, 0);

      transitionStartRef.current = Date.now();

      return () => clearTimeout(timer);
    }
  }, [location.pathname, enabled, performanceMonitor, previousRoute]);

  return {
    currentRoute: location.pathname,
    previousRoute,
  };
}

/**
 * コンポーネント描画時間専用Hook
 */
export function useComponentRenderMonitor(
  componentName: string,
  enabled = true
) {
  const renderStartRef = useRef<number>();
  const performanceMonitor = getPerformanceMonitor();

  // 初期化
  useEffect(() => {
    renderStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const renderTime = Date.now() - renderStartRef.current;
    performanceMonitor.recordComponentRenderTime(componentName, renderTime);

    // 100ms以内の目標チェック
    if (renderTime <= 100) {
      console.log(
        `✅ コンポーネント描画時間目標達成: ${componentName} - ${renderTime}ms`
      );
    }

    renderStartRef.current = Date.now();
  });

  const recordRenderTime = useCallback(
    (customRenderTime?: number) => {
      if (!enabled) return;

      const renderTime =
        customRenderTime ?? Date.now() - renderStartRef.current;
      performanceMonitor.recordComponentRenderTime(componentName, renderTime);
      renderStartRef.current = Date.now();
    },
    [enabled, componentName, performanceMonitor]
  );

  return { recordRenderTime };
}
