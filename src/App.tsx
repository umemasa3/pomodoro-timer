import { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from './stores/auth-store';
import { TimerComponent } from './components/timer';
import { TasksPage } from './pages/tasks-page';
import { StatisticsPage } from './pages/statistics-page';
import {
  ClockIcon,
  ListBulletIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import './index.css';

type PageType = 'timer' | 'tasks' | 'statistics';

function App() {
  console.log('🔧 App component rendering...');

  const { isAuthenticated, user, signOut, isLoading, initializeAuth } =
    useAuthStore();
  const [currentPage, setCurrentPage] = useState<PageType>('timer');

  console.log('📊 Auth state:', {
    isAuthenticated,
    user: user?.email,
    isLoading,
  });

  // アプリ起動時に認証状態を初期化
  useEffect(() => {
    console.log('🚀 Initializing auth...');
    initializeAuth();
  }, [initializeAuth]);

  // ローディング中の表示
  if (isLoading) {
    console.log('⏳ Showing loading state...');
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(to bottom right, #fef3c7, #ffffff, #dbeafe)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid #fbbf24',
              borderTop: '4px solid #f59e0b',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: '18px' }}>
            認証状態を確認中...
          </p>
        </div>
      </div>
    );
  }

  // 認証されていない場合
  if (!isAuthenticated && !isLoading) {
    console.log('🔐 User not authenticated, showing auth page...');
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(to bottom right, #fef3c7, #ffffff, #dbeafe)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              color: '#374151',
            }}
          >
            ポモドーロタイマー
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            デモモードで起動中...
          </p>
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '400px',
            }}
          >
            <p style={{ color: '#374151' }}>
              認証システムを初期化しています...
            </p>
          </div>
        </div>
      </div>
    );
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

  // 現在のページをレンダリング
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'tasks':
        return <TasksPage />;
      case 'statistics':
        return <StatisticsPage />;
      case 'timer':
      default:
        return (
          <div
            style={{
              minHeight: '100vh',
              background:
                'linear-gradient(to bottom right, #fef3c7, #ffffff, #dbeafe)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div style={{ padding: '3rem 1rem' }}>
              <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
                {/* ウェルカムメッセージ */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h1
                    style={{
                      fontSize: '2.5rem',
                      fontWeight: 'bold',
                      color: '#374151',
                      marginBottom: '1rem',
                    }}
                  >
                    ポモドーロタイマー
                  </h1>
                  <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
                    集中力を高めて、生産性を向上させましょう
                  </p>
                </div>

                {/* タイマーコンポーネント */}
                <TimerComponent />

                {/* 認証システム統合完了表示 */}
                <div
                  style={{
                    marginTop: '3rem',
                    background: 'rgba(255, 255, 255, 0.9)',
                    padding: '2rem',
                    borderRadius: '1.5rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.5rem',
                        background: '#dcfce7',
                        borderRadius: '0.5rem',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>✨</span>
                    </div>
                    <h2
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#065f46',
                        margin: 0,
                      }}
                    >
                      認証システム統合完了
                    </h2>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '1rem',
                      fontSize: '0.875rem',
                      color: '#047857',
                    }}
                  >
                    <div>
                      <p style={{ margin: '0 0 0.5rem 0' }}>
                        <strong>ユーザーID:</strong>{' '}
                        {user?.id || 'demo-user-id'}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>メールアドレス:</strong>{' '}
                        {user?.email || 'demo@example.com'}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.5rem 0' }}>
                        <strong>タイムゾーン:</strong>{' '}
                        {user?.timezone || 'Asia/Tokyo'}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>登録日時:</strong>{' '}
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleString('ja-JP')
                          : new Date().toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // メインアプリケーション
  console.log('✅ Rendering main application...');
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(to bottom right, #fef3c7, #ffffff, #dbeafe)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* ヘッダー */}
        <header
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '80px',
            }}
          >
            {/* ロゴとタイトル */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.5rem',
                  background: 'linear-gradient(to right, #f59e0b, #d97706)',
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              >
                <div style={{ width: '32px', height: '32px', color: 'white' }}>
                  ⏰
                </div>
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#374151',
                    margin: 0,
                  }}
                >
                  ポモドーロタイマー
                </h1>
                <p
                  style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}
                >
                  生産性向上アプリ
                </p>
              </div>
            </div>

            {/* ナビゲーションメニュー */}
            <nav
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              role="navigation"
              aria-label="メインナビゲーション"
            >
              {navigationItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      background: isActive
                        ? 'linear-gradient(to right, #f59e0b, #d97706)'
                        : 'transparent',
                      color: isActive ? 'white' : '#6b7280',
                      boxShadow: isActive
                        ? '0 4px 6px -1px rgba(245, 158, 11, 0.25)'
                        : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#374151';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                      }
                    }}
                    data-testid={`nav-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`${item.label}ページに移動 - ${item.description}`}
                    title={item.description}
                  >
                    <Icon
                      style={{ width: '20px', height: '20px' }}
                      aria-hidden="true"
                    />
                    <span
                      style={{
                        display: window.innerWidth > 768 ? 'block' : 'none',
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* ユーザーメニュー */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    margin: 0,
                  }}
                >
                  {user?.display_name ||
                    user?.email?.split('@')[0] ||
                    'デモユーザー'}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  こんにちは！
                </p>
              </div>
              <button
                onClick={signOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
                data-testid="logout-button"
                aria-label="アカウントからログアウト"
                title="ログアウト"
              >
                <ArrowRightOnRectangleIcon
                  style={{ width: '16px', height: '16px' }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    display: window.innerWidth > 640 ? 'block' : 'none',
                  }}
                >
                  ログアウト
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main>{renderCurrentPage()}</main>
      </div>
    </BrowserRouter>
  );
}

export default App;
