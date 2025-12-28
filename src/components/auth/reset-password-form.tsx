import React, { useState } from 'react';
import { useAuthStore } from '../../stores/auth-store';

interface ResetPasswordFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPassword, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    // バリデーション
    if (!email) {
      setError('メールアドレスを入力してください');
      setIsSubmitting(false);
      return;
    }

    if (!email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await resetPassword(email);

      if (result.success) {
        setSuccess(
          'パスワードリセット用のリンクをメールアドレスに送信しました。メールを確認してください。'
        );
        onSuccess?.();
      } else {
        setError(result.error || 'パスワードリセットに失敗しました');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('パスワードリセットに失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = isLoading || isSubmitting;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          パスワードリセット
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
          登録されたメールアドレスを入力してください。パスワードリセット用のリンクを送信します。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md text-sm">
              {success}
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
              required
            />
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                送信中...
              </div>
            ) : (
              'リセットリンクを送信'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
