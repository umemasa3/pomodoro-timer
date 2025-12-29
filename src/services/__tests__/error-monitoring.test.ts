import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { ErrorMonitoringService } from '../error-monitoring';

// Sentryをモック
vi.mock('@sentry/react', () => ({
  setUser: vi.fn(),
  captureException: vi.fn(() => 'test-error-id'),
  captureMessage: vi.fn(() => 'test-message-id'),
  addBreadcrumb: vi.fn(),
  startSpan: vi.fn((config, callback) => callback({ setTag: vi.fn() })),
  metrics: {
    gauge: vi.fn(),
  },
  getClient: vi.fn(() => ({
    getOptions: vi.fn(() => ({
      initialScope: undefined,
    })),
  })),
}));

const mockedSentry = vi.mocked(Sentry);

describe('ErrorMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setUserContext', () => {
    it('ユーザーコンテキストを設定する', () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
      };

      ErrorMonitoringService.setUserContext(mockUser as any);

      expect(mockedSentry.setUser).toHaveBeenCalledWith({
        id: 'test-user-id',
        email: 'test@example.com',
      });
    });

    it('nullユーザーでコンテキストをクリアする', () => {
      ErrorMonitoringService.setUserContext(null);

      expect(mockedSentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('captureError', () => {
    it('エラーをキャプチャする', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent' };

      const errorId = ErrorMonitoringService.captureError(error, context);

      expect(mockedSentry.captureException).toHaveBeenCalledWith(error, {
        extra: context,
        tags: {
          errorBoundary: true,
        },
      });
      expect(errorId).toBe('test-error-id');
    });
  });

  describe('captureMessage', () => {
    it('メッセージをキャプチャする', () => {
      const message = 'Test message';
      const level = 'warning';

      const messageId = ErrorMonitoringService.captureMessage(message, level);

      expect(mockedSentry.captureMessage).toHaveBeenCalledWith(message, level);
      expect(messageId).toBe('test-message-id');
    });

    it('デフォルトレベルでメッセージをキャプチャする', () => {
      const message = 'Test message';

      ErrorMonitoringService.captureMessage(message);

      expect(mockedSentry.captureMessage).toHaveBeenCalledWith(message, 'info');
    });
  });

  describe('addBreadcrumb', () => {
    it('ブレッドクラムを追加する', () => {
      const message = 'User clicked button';
      const category = 'user';
      const level = 'info';

      ErrorMonitoringService.addBreadcrumb(message, category, level);

      expect(mockedSentry.addBreadcrumb).toHaveBeenCalledWith({
        message,
        category,
        level,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('generateErrorReport', () => {
    it('エラーレポートを生成する', () => {
      const error = new Error('Test error');
      const componentStack = 'Component stack trace';

      const report = ErrorMonitoringService.generateErrorReport(
        error,
        componentStack
      );

      expect(report).toMatchObject({
        id: expect.stringMatching(/^error_\d+_[a-z0-9]+$/),
        message: 'Test error',
        stack: expect.any(String),
        componentStack,
        timestamp: expect.any(Date),
        userAgent: expect.any(String),
        url: expect.any(String),
        userId: undefined,
      });
    });

    it('コンポーネントスタックなしでエラーレポートを生成する', () => {
      const error = new Error('Test error');

      const report = ErrorMonitoringService.generateErrorReport(error);

      expect(report).toMatchObject({
        id: expect.stringMatching(/^error_\d+_[a-z0-9]+$/),
        message: 'Test error',
        componentStack: undefined,
      });
    });
  });

  describe('classifyErrorSeverity', () => {
    it('セキュリティエラーをクリティカルに分類する', () => {
      const error = new Error('Security violation detected');
      const severity = ErrorMonitoringService.classifyErrorSeverity(error);
      expect(severity).toBe('critical');
    });

    it('ネットワークエラーを高に分類する', () => {
      const error = new Error('Network request failed');
      const severity = ErrorMonitoringService.classifyErrorSeverity(error);
      expect(severity).toBe('high');
    });

    it('TypeErrorを高に分類する', () => {
      const error = new TypeError('Cannot read property of undefined');
      const severity = ErrorMonitoringService.classifyErrorSeverity(error);
      expect(severity).toBe('high');
    });

    it('レンダリングエラーを中に分類する', () => {
      const error = new Error('Component render failed');
      const severity = ErrorMonitoringService.classifyErrorSeverity(error);
      expect(severity).toBe('medium');
    });

    it('その他のエラーを低に分類する', () => {
      const error = new Error('Some other error');
      const severity = ErrorMonitoringService.classifyErrorSeverity(error);
      expect(severity).toBe('low');
    });
  });

  describe('startTransaction', () => {
    it('パフォーマンストランザクションを開始する', () => {
      const name = 'test-transaction';
      const operation = 'test-operation';

      ErrorMonitoringService.startTransaction(name, operation);

      expect(mockedSentry.startSpan).toHaveBeenCalledWith(
        {
          name,
          op: operation,
        },
        expect.any(Function)
      );
    });
  });

  describe('addMetric', () => {
    it('カスタムメトリクスを記録する', () => {
      const name = 'test-metric';
      const value = 42;
      const unit = 'milliseconds';

      ErrorMonitoringService.addMetric(name, value, unit);

      expect(mockedSentry.metrics.gauge).toHaveBeenCalledWith(name, value, {
        unit,
      });
    });

    it('デフォルト単位でメトリクスを記録する', () => {
      const name = 'test-metric';
      const value = 42;

      ErrorMonitoringService.addMetric(name, value);

      expect(mockedSentry.metrics.gauge).toHaveBeenCalledWith(name, value, {
        unit: 'none',
      });
    });
  });
});
