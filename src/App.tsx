import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ポモドーロタイマー
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            効率的な時間管理で生産性を向上させましょう
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <div className="timer-circle mx-auto mb-8 flex items-center justify-center">
              <div className="text-white">
                <div className="text-6xl font-bold">25:00</div>
                <div className="text-xl">ポモドーロ</div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button className="btn-primary">開始</button>
              <button className="btn-secondary">一時停止</button>
              <button className="btn-secondary">リセット</button>
            </div>

            <div className="mt-8 text-gray-600 dark:text-gray-300">
              <p>完了セッション: 0</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
