import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandler } from '../error-handler';

// モック
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleInfo = vi.fn();
const mockConsoleLog = vi.fn();

// グローバルオブジェクトのモック
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'test-agent',
  },
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000/test',
  },
  writable: true,
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // コンソールメソッドをモック
    vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
    vi.spyOn(console, 'info').mockImplementation(mockConsoleInfo);
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);

    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorQueue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleError', () => {
    it('エラーを正しく処理する', async () => {
      const testError = new Error('テストエラー');

      await errorHandler.handleError(testError, {
        type: 'network',
        severity: 'medium',
        showToUser: false,
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByType.network).toBe(1);
      expect(stats.errorsBySeverity.medium).toBe(1);
    });

    it('エラータイプを自動分類する', async () => {
      const networkError = new Error('network connection failed');
      const authError = new Error('unauthorized access');
      const dbError = new Error('database connection error');

      await errorHandler.handleError(networkError, { showToUser: false });
      await errorHandler.handleError(authError, { showToUser: false });
      await errorHandler.handleError(dbError, { showToUser: false });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.network).toBe(1);
      expect(stats.errorsByType.authentication).toBe(1);
      expect(stats.errorsByType.database).toBe(1);
    });

    it('重要度を自動判定する', async () => {
      const criticalError = new Error('critical system failure');
      const authError = new Error('authentication failed');
      const validationError = new Error('validation error');

      await errorHandler.handleError(criticalError, { showToUser: false });
      await errorHandler.handleError(authError, {
        type: 'authentication',
        showToUser: false,
      });
      await errorHandler.handleError(validationError, {
        type: 'validation',
        showToUser: false,
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsBySeverity.critical).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(1);
      expect(stats.errorsBySeverity.low).toBe(1);
    });
  });

  describe('handleNetworkError', () => {
    it('ネットワークエラーを処理してリトライする', async () => {
      const networkError = new Error('Network request failed');
      let callCount = 0;

      const operation = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Still failing');
        }
        return Promise.resolve('success');
      });

      const result = await errorHandler.handleNetworkError(
        networkError,
        operation
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数に達したら失敗する', async () => {
      const networkError = new Error('Network request failed');
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(
        errorHandler.handleNetworkError(networkError, operation)
      ).rejects.toThrow('Always fails');

      expect(operation).toHaveBeenCalledTimes(4); // 初回 + 3回のリトライ
    }, 10000); // タイムアウトを10秒に設定
  });

  describe('handleDatabaseError', () => {
    it('データベースエラーを処理する', async () => {
      const dbError = new Error('Database connection failed');

      await errorHandler.handleDatabaseError(dbError, undefined, {
        table: 'users',
        operation: 'select',
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.database).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(1);
    });
  });

  describe('handleAuthError', () => {
    it('認証エラーを処理する', async () => {
      const authError = new Error('Token expired');

      await errorHandler.handleAuthError(authError, {
        userId: 'test-user',
        action: 'api-call',
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.authentication).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(1);
    });
  });

  describe('handleValidationError', () => {
    it('バリデーションエラーを処理する', async () => {
      const validationError = new Error('Invalid email format');

      await errorHandler.handleValidationError(validationError, 'email', {
        formName: 'login',
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.validation).toBe(1);
      expect(stats.errorsBySeverity.low).toBe(1);
    });
  });

  describe('handleSyncError', () => {
    it('同期エラーを処理する', async () => {
      const syncError = new Error('Sync conflict detected');

      await errorHandler.handleSyncError(syncError, 'task', {
        taskId: 'test-task',
        conflictType: 'timestamp',
      });

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.sync).toBe(1);
      expect(stats.errorsBySeverity.medium).toBe(1);
    });
  });

  describe('エラー統計', () => {
    it('エラー統計を正しく集計する', async () => {
      // 複数のエラーを発生させる
      await errorHandler.handleError(new Error('network error'), {
        type: 'network',
        showToUser: false,
      });
      await errorHandler.handleError(new Error('auth error'), {
        type: 'authentication',
        showToUser: false,
      });
      await errorHandler.handleError(new Error('validation error'), {
        type: 'validation',
        showToUser: false,
      });

      const stats = errorHandler.getErrorStatistics();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType.network).toBe(1);
      expect(stats.errorsByType.authentication).toBe(1);
      expect(stats.errorsByType.validation).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
    });

    it('エラーキューをクリアできる', async () => {
      await errorHandler.handleError(new Error('test error'), {
        showToUser: false,
      });

      let stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearErrorQueue();

      stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
    });

    it('エラーを解決済みとしてマークできる', async () => {
      await errorHandler.handleError(new Error('test error'), {
        showToUser: false,
      });

      const stats = errorHandler.getErrorStatistics();
      const errorId = stats.recentErrors[0].id;

      errorHandler.markErrorAsResolved(errorId);

      const updatedStats = errorHandler.getErrorStatistics();
      expect(updatedStats.recentErrors[0].resolved).toBe(true);
    });
  });

  describe('エラー分類', () => {
    it('ネットワークエラーを正しく分類する', async () => {
      const errors = [
        new Error('network timeout'),
        new Error('fetch failed'),
        new Error('connection refused'),
      ];

      for (const error of errors) {
        await errorHandler.handleError(error, { showToUser: false });
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.network).toBe(2); // 'network' と 'fetch' を含むもの
    });

    it('データベースエラーを正しく分類する', async () => {
      const errors = [
        new Error('database connection failed'),
        new Error('supabase error'),
        new Error('query timeout'),
      ];

      for (const error of errors) {
        await errorHandler.handleError(error, { showToUser: false });
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.database).toBe(2); // 'database' と 'supabase' を含むもの
    });

    it('認証エラーを正しく分類する', async () => {
      const errors = [
        new Error('unauthorized access'),
        new Error('auth token expired'),
        new Error('invalid credentials'),
      ];

      for (const error of errors) {
        await errorHandler.handleError(error, { showToUser: false });
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.errorsByType.authentication).toBe(2); // 'unauthorized' と 'auth' を含むもの
    });
  });
});
