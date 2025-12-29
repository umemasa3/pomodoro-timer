import { useCallback, useState } from 'react';
import { errorHandler, type ErrorType } from '../services/error-handler';
import { monitoringService } from '../services/monitoring-service';

interface UseErrorHandlerOptions {
  showToUser?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorType: ErrorType | null;
  isRetrying: boolean;
}

/**
 * エラーハンドリング用のカスタムフック
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: null,
    isRetrying: false,
  });

  const { showToUser = true, logToConsole = true } = options;

  /**
   * エラーを処理する
   */
  const handleError = useCallback(
    async (
      error: Error | unknown,
      type?: ErrorType,
      context?: Record<string, any>
    ) => {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));
      const errorType = type || 'unknown';

      // 状態を更新
      setErrorState({
        hasError: true,
        error: errorObj,
        errorType,
        isRetrying: false,
      });

      // エラーハンドラーに委譲
      await errorHandler.handleError(errorObj, {
        type: errorType,
        context,
        showToUser,
      });

      // ユーザーアクティビティを記録
      monitoringService.recordUserActivity({
        action: 'error_handled',
        metadata: {
          errorType,
          errorMessage: errorObj.message,
          context,
        },
      });

      if (logToConsole) {
        console.error(
          `[${errorType.toUpperCase()}] ${errorObj.message}`,
          errorObj
        );
      }
    },
    [showToUser, logToConsole]
  );

  /**
   * ネットワークエラーを処理
   */
  const handleNetworkError = useCallback(
    async (error: Error, operation?: () => Promise<any>) => {
      await handleError(error, 'network');

      if (operation) {
        setErrorState(prev => ({ ...prev, isRetrying: true }));

        try {
          const result = await errorHandler.handleNetworkError(
            error,
            operation
          );
          setErrorState({
            hasError: false,
            error: null,
            errorType: null,
            isRetrying: false,
          });
          return result;
        } catch (retryError) {
          setErrorState(prev => ({ ...prev, isRetrying: false }));
          throw retryError;
        }
      }
    },
    [handleError]
  );

  /**
   * データベースエラーを処理
   */
  const handleDatabaseError = useCallback(
    async (
      error: Error,
      operation?: () => Promise<any>,
      context?: Record<string, any>
    ) => {
      await handleError(error, 'database', context);

      if (operation) {
        setErrorState(prev => ({ ...prev, isRetrying: true }));

        try {
          const result = await errorHandler.handleDatabaseError(
            error,
            operation,
            context
          );
          setErrorState({
            hasError: false,
            error: null,
            errorType: null,
            isRetrying: false,
          });
          return result;
        } catch (retryError) {
          setErrorState(prev => ({ ...prev, isRetrying: false }));
          throw retryError;
        }
      }
    },
    [handleError]
  );

  /**
   * 認証エラーを処理
   */
  const handleAuthError = useCallback(
    async (error: Error, context?: Record<string, any>) => {
      await handleError(error, 'authentication', context);
      await errorHandler.handleAuthError(error, context);
    },
    [handleError]
  );

  /**
   * バリデーションエラーを処理
   */
  const handleValidationError = useCallback(
    async (error: Error, fieldName?: string, context?: Record<string, any>) => {
      await handleError(error, 'validation', { ...context, fieldName });
      await errorHandler.handleValidationError(error, fieldName, context);
    },
    [handleError]
  );

  /**
   * 同期エラーを処理
   */
  const handleSyncError = useCallback(
    async (
      error: Error,
      syncType: 'task' | 'session' | 'tag' | 'general',
      context?: Record<string, any>
    ) => {
      await handleError(error, 'sync', { ...context, syncType });
      await errorHandler.handleSyncError(error, syncType, context);
    },
    [handleError]
  );

  /**
   * エラー状態をクリア
   */
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorType: null,
      isRetrying: false,
    });
  }, []);

  /**
   * リトライ操作
   */
  const retry = useCallback(
    async (operation: () => Promise<any>) => {
      if (!errorState.hasError) return;

      setErrorState(prev => ({ ...prev, isRetrying: true }));

      try {
        const result = await operation();
        setErrorState({
          hasError: false,
          error: null,
          errorType: null,
          isRetrying: false,
        });
        return result;
      } catch (error) {
        setErrorState(prev => ({ ...prev, isRetrying: false }));
        await handleError(error);
        throw error;
      }
    },
    [errorState.hasError, handleError]
  );

  return {
    // 状態
    ...errorState,

    // エラーハンドリング関数
    handleError,
    handleNetworkError,
    handleDatabaseError,
    handleAuthError,
    handleValidationError,
    handleSyncError,

    // ユーティリティ関数
    clearError,
    retry,
  };
}

/**
 * 非同期操作用のエラーハンドリングフック
 */
export function useAsyncError() {
  const { handleError } = useErrorHandler();

  /**
   * 非同期操作をラップしてエラーハンドリングを追加
   */
  const wrapAsync = useCallback(
    <T>(
      asyncFn: () => Promise<T>,
      errorType?: ErrorType,
      context?: Record<string, any>
    ) => {
      return async (): Promise<T> => {
        try {
          return await asyncFn();
        } catch (error) {
          await handleError(error, errorType, context);
          throw error;
        }
      };
    },
    [handleError]
  );

  /**
   * 非同期操作を実行してエラーを自動処理
   */
  const executeAsync = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      errorType?: ErrorType,
      context?: Record<string, any>
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        await handleError(error, errorType, context);
        return null;
      }
    },
    [handleError]
  );

  return {
    wrapAsync,
    executeAsync,
    handleError,
  };
}

/**
 * フォーム用のエラーハンドリングフック
 */
export function useFormErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { handleValidationError } = useErrorHandler();

  /**
   * フィールドエラーを設定
   */
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  /**
   * フィールドエラーをクリア
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * 全てのフィールドエラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  /**
   * バリデーションエラーを処理
   */
  const handleFieldValidationError = useCallback(
    async (fieldName: string, error: Error | string) => {
      const errorMessage = error instanceof Error ? error.message : error;
      setFieldError(fieldName, errorMessage);

      if (error instanceof Error) {
        await handleValidationError(error, fieldName);
      }
    },
    [setFieldError, handleValidationError]
  );

  return {
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    handleFieldValidationError,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
}

/**
 * API呼び出し用のエラーハンドリングフック
 */
export function useApiErrorHandler() {
  const { handleNetworkError, handleDatabaseError, handleAuthError } =
    useErrorHandler();

  /**
   * API呼び出しをラップしてエラーハンドリングを追加
   */
  const wrapApiCall = useCallback(
    <T>(apiCall: () => Promise<T>, context?: Record<string, any>) => {
      return async (): Promise<T> => {
        try {
          const startTime = performance.now();
          const result = await apiCall();
          const endTime = performance.now();

          // API レスポンス時間を記録
          monitoringService.recordApiCall(
            context?.endpoint || 'unknown',
            endTime - startTime
          );

          return result;
        } catch (error) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));

          // エラーの種類に応じて適切なハンドラーを呼び出し
          if (
            errorObj.message.includes('auth') ||
            errorObj.message.includes('unauthorized')
          ) {
            await handleAuthError(errorObj, context);
          } else if (
            errorObj.message.includes('network') ||
            errorObj.message.includes('fetch')
          ) {
            await handleNetworkError(errorObj);
          } else {
            await handleDatabaseError(errorObj, undefined, context);
          }

          throw error;
        }
      };
    },
    [handleNetworkError, handleDatabaseError, handleAuthError]
  );

  return {
    wrapApiCall,
  };
}
