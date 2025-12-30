import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

interface MonitoringMetrics {
  // パフォーマンスメトリクス
  performance: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
  };
  // エラーメトリクス
  errors: {
    count: number;
    rate: number;
    lastError?: {
      message: string;
      timestamp: Date;
    };
  };
  // システムメトリクス
  system: {
    uptime: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  // ユーザーメトリクス
  users: {
    active: number;
    sessions: number;
    bounceRate: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastCheck: Date;
}

/**
 * 監視ダッシュボードコンポーネント
 * リアルタイムでアプリケーションの健全性を監視
 */
export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'healthy',
    message: 'All systems operational',
    lastCheck: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // メトリクス取得
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        // パフォーマンスメトリクスの収集
        const performanceMetrics = await collectPerformanceMetrics();

        // エラーメトリクスの収集
        const errorMetrics = await collectErrorMetrics();

        // システムメトリクスの収集
        const systemMetrics = await collectSystemMetrics();

        // ユーザーメトリクスの収集
        const userMetrics = await collectUserMetrics();

        const allMetrics: MonitoringMetrics = {
          performance: performanceMetrics,
          errors: errorMetrics,
          system: systemMetrics,
          users: userMetrics,
        };

        setMetrics(allMetrics);

        // 健全性ステータスの判定
        const status = determineHealthStatus(allMetrics);
        setHealthStatus(status);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch monitoring metrics:', err);
        setError('メトリクスの取得に失敗しました');
        setHealthStatus({
          status: 'critical',
          message: 'Monitoring system unavailable',
          lastCheck: new Date(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    // 初回実行
    fetchMetrics();

    // 30秒ごとに更新
    const interval = setInterval(fetchMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  // パフォーマンスメトリクス収集
  const collectPerformanceMetrics = async () => {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    return {
      lcp: await getLCP(),
      fid: await getFID(),
      cls: await getCLS(),
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
    };
  };

  // エラーメトリクス収集
  const collectErrorMetrics = async () => {
    // ローカルストレージからエラー情報を取得
    const errorLog = localStorage.getItem('error-log');
    const errors = errorLog ? JSON.parse(errorLog) : [];

    const recentErrors = errors.filter(
      (error: any) =>
        new Date(error.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      count: recentErrors.length,
      rate: recentErrors.length / 24, // 1時間あたりのエラー率
      lastError:
        recentErrors.length > 0
          ? recentErrors[recentErrors.length - 1]
          : undefined,
    };
  };

  // システムメトリクス収集
  const collectSystemMetrics = async () => {
    const memory = (performance as any).memory;

    return {
      uptime: performance.now() / 1000, // 秒単位
      responseTime: await measureResponseTime(),
      memoryUsage: memory ? memory.usedJSHeapSize / memory.totalJSHeapSize : 0,
      cpuUsage: await estimateCPUUsage(),
    };
  };

  // ユーザーメトリクス収集
  const collectUserMetrics = async () => {
    // セッションストレージからユーザー情報を取得
    const sessionData = sessionStorage.getItem('user-metrics');
    const userData = sessionData ? JSON.parse(sessionData) : {};

    return {
      active: userData.active || 1,
      sessions: userData.sessions || 1,
      bounceRate: userData.bounceRate || 0,
    };
  };

  // 健全性ステータス判定
  const determineHealthStatus = (metrics: MonitoringMetrics): HealthStatus => {
    const { performance, errors, system } = metrics;

    // クリティカル条件
    if (
      performance.lcp > 4000 ||
      performance.cls > 0.25 ||
      errors.rate > 10 ||
      system.responseTime > 5000
    ) {
      return {
        status: 'critical',
        message: 'Critical performance or error issues detected',
        lastCheck: new Date(),
      };
    }

    // 警告条件
    if (
      performance.lcp > 2500 ||
      performance.fid > 100 ||
      performance.cls > 0.1 ||
      errors.rate > 1 ||
      system.responseTime > 2000
    ) {
      return {
        status: 'warning',
        message: 'Performance degradation detected',
        lastCheck: new Date(),
      };
    }

    return {
      status: 'healthy',
      message: 'All systems operational',
      lastCheck: new Date(),
    };
  };

  // ヘルパー関数
  const getLCP = (): Promise<number> => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // タイムアウト
      setTimeout(() => resolve(0), 1000);
    });
  };

  const getFID = (): Promise<number> => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const entry = entries[0] as any;
          resolve(entry.processingStart - entry.startTime);
        }
      }).observe({ entryTypes: ['first-input'] });

      setTimeout(() => resolve(0), 1000);
    });
  };

  const getCLS = (): Promise<number> => {
    return new Promise(resolve => {
      let clsValue = 0;
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        resolve(clsValue);
      }).observe({ entryTypes: ['layout-shift'] });

      setTimeout(() => resolve(clsValue), 1000);
    });
  };

  const measureResponseTime = async (): Promise<number> => {
    const start = performance.now();
    try {
      await fetch('/api/health-check');
      return performance.now() - start;
    } catch {
      return -1; // エラー時
    }
  };

  const estimateCPUUsage = async (): Promise<number> => {
    const start = performance.now();
    const iterations = 100000;

    for (let i = 0; i < iterations; i++) {
      Math.random();
    }

    const duration = performance.now() - start;
    return Math.min(duration / 10, 100); // 正規化
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">監視データを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <SignalIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘルスステータス */}
      <div
        className={`border rounded-lg p-4 ${getStatusColor(healthStatus.status)}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getStatusIcon(healthStatus.status)}
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                システム状態
              </h3>
              <p className="text-sm text-gray-600">{healthStatus.message}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            最終確認: {healthStatus.lastCheck.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* メトリクスグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* パフォーマンスメトリクス */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">LCP</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.performance.lcp.toFixed(0)}ms
          </p>
          <p className="text-xs text-gray-500">目標: &lt;2.5s</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-green-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">FID</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.performance.fid.toFixed(0)}ms
          </p>
          <p className="text-xs text-gray-500">目標: &lt;100ms</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <SignalIcon className="h-5 w-5 text-purple-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">CLS</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.performance.cls.toFixed(3)}
          </p>
          <p className="text-xs text-gray-500">目標: &lt;0.1</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">エラー率</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.errors.rate.toFixed(1)}/h
          </p>
          <p className="text-xs text-gray-500">
            24時間: {metrics.errors.count}件
          </p>
        </div>
      </div>

      {/* システムメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <CpuChipIcon className="h-5 w-5 text-orange-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">応答時間</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {metrics.system.responseTime.toFixed(0)}ms
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <CpuChipIcon className="h-5 w-5 text-indigo-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">メモリ使用率</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(metrics.system.memoryUsage * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 text-teal-500 mr-2" />
            <h4 className="text-sm font-medium text-gray-900">稼働時間</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {(metrics.system.uptime / 3600).toFixed(1)}h
          </p>
        </div>
      </div>

      {/* 最新エラー */}
      {metrics.errors.lastError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">最新エラー</h4>
          <p className="text-sm text-red-700">
            {metrics.errors.lastError.message}
          </p>
          <p className="text-xs text-red-500 mt-1">
            {new Date(metrics.errors.lastError.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
