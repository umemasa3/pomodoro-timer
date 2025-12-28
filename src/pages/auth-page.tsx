import React, { useState } from 'react';
import {
  LoginForm,
  SignUpForm,
  ResetPasswordForm,
  GuestGuard,
} from '../components/auth';

type AuthMode = 'login' | 'signup' | 'reset-password';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleAuthSuccess = () => {
    onAuthSuccess?.();
  };

  const renderAuthForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setMode('signup')}
            onSwitchToResetPassword={() => setMode('reset-password')}
          />
        );
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      case 'reset-password':
        return (
          <ResetPasswordForm
            onSuccess={() => setMode('login')}
            onSwitchToLogin={() => setMode('login')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <GuestGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* ヘッダー */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              ポモドーロタイマー
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              効率的な時間管理で生産性を向上させましょう
            </p>
          </div>

          {/* 認証フォーム */}
          {renderAuthForm()}

          {/* フッター */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <p>
              このアプリケーションを使用することで、
              <br />
              利用規約とプライバシーポリシーに同意したものとみなされます。
            </p>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
};
