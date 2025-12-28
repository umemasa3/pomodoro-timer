import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 認証が必要なコンポーネントを保護するガードコンポーネント
 * 認証されていない場合はfallbackコンポーネントを表示
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 認証状態の初期化中はローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            認証状態を確認中...
          </p>
        </div>
      </div>
    );
  }

  // 認証されていない場合はfallbackを表示
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                認証が必要です
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                この機能を使用するにはログインが必要です。
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 認証されている場合は子コンポーネントを表示
  return <>{children}</>;
};

/**
 * 認証されていない場合のみ表示するガードコンポーネント
 * ログイン済みユーザーがログイン画面にアクセスした場合などに使用
 */
export const GuestGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 認証状態の初期化中はローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            認証状態を確認中...
          </p>
        </div>
      </div>
    );
  }

  // 認証されている場合はfallbackを表示
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                既にログイン済みです
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                アプリケーションをご利用ください。
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 認証されていない場合は子コンポーネントを表示
  return <>{children}</>;
};
