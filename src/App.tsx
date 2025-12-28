import { useState, useEffect } from 'react';
import { AuthGuard } from './components/auth';
import { AuthPage } from './pages/auth-page';
import { StatisticsPage } from './pages/statistics-page';
import { TasksPage } from './pages/tasks-page';
import { TimerComponent } from './components/timer';
import { SyncStatusIndicator } from './components/sync-status-indicator';
import { useAuthStore } from './stores/auth-store';
import { useTimerStore } from './stores/timer-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  ListBulletIcon,
  ChartBarIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import './index.css';

type PageType = 'timer' | 'tasks' | 'statistics';

function App() {
  const { isAuthenticated, user, signOut, isLoading, initializeAuth } =
    useAuthStore();
  const { initializeRealtimeSync, cleanupRealtimeSync } = useTimerStore();
  const [currentPage, setCurrentPage] = useState<PageType>('timer');

  // アプリ起動時に認証状態を初期化
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 認証完了後にリアルタイム同期を初期化
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('リアルタイム同期を初期化中...');
      initializeRealtimeSync();

      // クリーンアップ関数
      return () => {
        console.log('リアルタイム同期をクリーンアップ中...');
        cleanupRealtimeSync();
      };
    }
  }, [isAuthenticated, user, initializeRealtimeSync, cleanupRealtimeSync]);

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pomodoro-50 via-white to-break-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 border-4 border-pomodoro-200 border-t-pomodoro-500 rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <motion.p
            className="text-gray-600 dark:text-gray-400 text-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            認証状態を確認中...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // 認証されていない場合は認証ページを表示
  if (!isAuthenticated && !isLoading) {
    return <AuthPage onAuthSuccess={() => {}} />;
  }

  // ナビゲーションアイテム
  const navigationItems = [
    {
      id: 'timer' as PageType,
      label: 'タイマー',
      icon: ClockIcon,
      description: 'ポモドーロセッション',
    },
    {
      id: 'tasks' as PageType,
      label: 'タスク管理',
      icon: ListBulletIcon,
      description: 'タスクの管理',
    },
    {
      id: 'statistics' as PageType,
      label: '統計・分析',
      icon: ChartBarIcon,
      description: '進捗の確認',
    },
  ];

  const renderCurrentPage = () => {
    const pageVariants = {
      initial: { opacity: 0, x: 20 },
      in: { opacity: 1, x: 0 },
      out: { opacity: 0, x: -20 },
    };

    const pageTransition = {
      type: 'tween' as const,
      ease: 'anticipate' as const,
      duration: 0.4,
    };

    switch (currentPage) {
      case 'tasks':
        return (
          <motion.div
            key="tasks"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <TasksPage />
          </motion.div>
        );
      case 'statistics':
        return (
          <motion.div
            key="statistics"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <StatisticsPage />
          </motion.div>
        );
      case 'timer':
      default:
        return (
          <motion.div
            key="timer"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="min-h-screen"
          >
            <div className="container mx-auto px-4 py-12">
              <main className="max-w-4xl mx-auto">
                {/* ウェルカムメッセージ */}
                <motion.div
                  className="text-center mb-12"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="text-4xl font-bold gradient-text mb-4">
                    ポモドーロタイマー
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    集中力を高めて、生産性を向上させましょう
                  </p>
                </motion.div>

                {/* タイマーコンポーネント */}
                <TimerComponent />

                {/* 開発用：認証システム統合完了表示 */}
                <motion.div
                  className="mt-12 card-glass p-6 rounded-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <SparklesIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                      認証システム統合完了
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">ユーザーID:</span>{' '}
                        {user?.id}
                      </p>
                      <p>
                        <span className="font-medium">メールアドレス:</span>{' '}
                        {user?.email}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">タイムゾーン:</span>{' '}
                        {user?.timezone}
                      </p>
                      <p>
                        <span className="font-medium">登録日時:</span>{' '}
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleString('ja-JP')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </main>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <AuthGuard fallback={<AuthPage onAuthSuccess={() => {}} />}>
      <div className="min-h-screen bg-gradient-to-br from-pomodoro-50 via-white to-break-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* 同期状態インジケーター */}
        <SyncStatusIndicator />

        {/* ナビゲーションヘッダー */}
        <motion.header
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-20">
              {/* ロゴとタイトル */}
              <motion.div
                className="flex items-center space-x-4"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-2 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 rounded-xl shadow-lg">
                  <ClockIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">
                    ポモドーロタイマー
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    生産性向上アプリ
                  </p>
                </div>
              </motion.div>

              {/* ナビゲーションメニュー */}
              <nav className="flex items-center space-x-2">
                {navigationItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`
                        relative px-4 py-3 rounded-xl font-medium transition-all duration-300
                        flex items-center space-x-2 group
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 text-white shadow-lg shadow-pomodoro-500/25'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }
                      `}
                      whileHover={{ scale: 1.05, y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 17,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="hidden md:block">{item.label}</span>

                      {/* ツールチップ */}
                      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none md:hidden">
                        {item.description}
                      </div>
                    </motion.button>
                  );
                })}
              </nav>

              {/* ユーザーメニュー */}
              <div className="flex items-center space-x-4">
                <div className="hidden md:block text-right">
                  <div className="flex items-center space-x-2">
                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user?.display_name || user?.email?.split('@')[0]}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    こんにちは！
                  </p>
                </div>
                <motion.button
                  onClick={signOut}
                  className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  <span className="hidden sm:block">ログアウト</span>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* メインコンテンツ */}
        <AnimatePresence mode="wait">{renderCurrentPage()}</AnimatePresence>

        {/* 装飾的な背景要素 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-pomodoro-200/10 dark:bg-pomodoro-800/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-break-200/10 dark:bg-break-800/5 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
        </div>
      </div>
    </AuthGuard>
  );
}

export default App;
