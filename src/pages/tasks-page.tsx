import React from 'react';

/**
 * タスク管理ページ
 * 要件7.1-7.5: タスクのCRUD操作とリスト表示
 */
export const TasksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pomodoro-50 via-white to-break-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">タスク管理</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            タスク管理機能は開発中です
          </p>
          <div className="card-glass p-8 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400">
              この機能は後のタスクで実装予定です。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
