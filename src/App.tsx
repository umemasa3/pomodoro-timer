import { AuthGuard } from './components/auth';
import { AuthPage } from './pages/auth-page';
import { TimerComponent } from './components/timer';
import { useAuthStore } from './stores/auth-store';
import './index.css';

function App() {
  const { isAuthenticated, user, signOut, isLoading } = useAuthStore();

  // 認証されていない場合は認証ページを表示
  if (!isAuthenticated && !isLoading) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  return (
    <AuthGuard fallback={<AuthPage onAuthSuccess={() => {}} />}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                ポモドーロタイマー
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                効率的な時間管理で生産性を向上させましょう
              </p>
            </div>

            {/* ユーザーメニュー */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  こんにちは、{user?.display_name || user?.email}さん
                </p>
              </div>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ログアウト
              </button>
            </div>
          </header>

          <main className="max-w-4xl mx-auto">
            {/* タイマーコンポーネント */}
            <TimerComponent />

            {/* 開発用：データベース接続テスト */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                認証システム統合完了
              </h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>ユーザーID: {user?.id}</p>
                <p>メールアドレス: {user?.email}</p>
                <p>タイムゾーン: {user?.timezone}</p>
                <p>
                  登録日時:{' '}
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleString('ja-JP')
                    : 'N/A'}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default App;
