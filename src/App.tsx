import { useState, useEffect } from 'react';
import { AuthGuard } from './components/auth';
import { AuthPage } from './pages/auth-page';
import { StatisticsPage } from './pages/statistics-page';
import { TimerComponent } from './components/timer';
import { useAuthStore } from './stores/auth-store';
import './index.css';

type PageType = 'timer' | 'statistics';

function App() {
  const { isAuthenticated, user, signOut, isLoading, initializeAuth } =
    useAuthStore();
  const [currentPage, setCurrentPage] = useState<PageType>('timer');

  // アプリ起動時に認証状態を初期化
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            認証状態を確認中...
          </p>
        </div>
      </div>
    );
  }

  // 認証されていない場合は認証ページを表示
  if (!isAuthenticated && !isLoading) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'statistics':
        return <StatisticsPage />;
      case 'timer':
      default:
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-8">
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
        );
    }
  };

  return (
    <AuthGuard fallback={<AuthPage onAuthSuccess={() => {}} />}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* ナビゲーションヘッダー */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* ロゴとタイトル */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ポモドーロタイマー
                </h1>
              </div>

              {/* ナビゲーションメニュー */}
              <nav className="flex items-center space-x-6">
                <button
                  onClick={() => setCurrentPage('timer')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'timer'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  タイマー
                </button>
                <button
                  onClick={() => setCurrentPage('statistics')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === 'statistics'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  統計・分析
                </button>
              </nav>

              {/* ユーザーメニュー */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    こんにちは、{user?.display_name || user?.email}さん
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-md transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        {renderCurrentPage()}
      </div>
    </AuthGuard>
  );
}

export default App;
