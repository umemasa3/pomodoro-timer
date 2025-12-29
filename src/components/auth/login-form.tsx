import React, { useState } from 'react';
import { useAuthStore } from '../../stores/auth-store';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onSwitchToResetPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToSignUp,
  onSwitchToResetPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, isLoading, checkAccountLock } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    // アカウントロック状態をチェック
    if (checkAccountLock()) {
      setError(
        'アカウントがロックされています。しばらく待ってから再試行してください。'
      );
      setIsSubmitting(false);
      return;
    }

    // バリデーション
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      setIsSubmitting(false);
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn(email, password, rememberMe);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('ログインに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isLoading || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6"
        data-testid="login-form"
      >
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          ログイン
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm"
              data-testid="auth-error-message"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isFormDisabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="your@example.com"
              data-testid="email-input"
              required
            />
            {!email && error && (
              <div
                className="text-red-600 text-sm mt-1"
                data-testid="email-validation-error"
              >
                メールアドレスを入力してください
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isFormDisabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="パスワードを入力"
              data-testid="password-input"
              required
            />
            {!password && error && (
              <div
                className="text-red-600 text-sm mt-1"
                data-testid="password-validation-error"
              >
                パスワードを入力してください
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              disabled={isFormDisabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="remember-me-checkbox"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              ログイン状態を保持する（30日間）
            </label>
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            data-testid="login-button"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ログイン中...
              </div>
            ) : (
              'ログイン'
            )}
          </button>
        </form>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onSwitchToResetPassword}
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-center"
            data-testid="forgot-password-link"
          >
            パスワードを忘れた方はこちら
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            アカウントをお持ちでない方は{' '}
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
              data-testid="signup-link"
            >
              新規登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
