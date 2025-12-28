import React from 'react';
import { TaskList } from '../components/tasks';

/**
 * タスク管理ページ
 * 要件7.1-7.5: タスクのCRUD操作とリスト表示
 */
export const TasksPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <TaskList />
        </div>
      </div>
    </div>
  );
};
