import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { DatabaseService } from '../../services/database-service';
import { TaskForm } from './task-form';
import type { Task, Tag } from '../../types';

interface TaskListProps {
  onTaskSelect?: (task: Task) => void;
  selectedTaskId?: string;
}

/**
 * タスク一覧表示・管理コンポーネント
 * 要件7.1-7.5: タスクのCRUD操作とリスト表示
 */
export const TaskList: React.FC<TaskListProps> = ({
  onTaskSelect,
  selectedTaskId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'completed'
  >('active');

  useEffect(() => {
    loadTasks();
    loadTags();
  }, [loadTasks]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const allTasks = await DatabaseService.getTasks({
        limit: 50,
        tagId: filterTag || undefined,
      });

      // ステータスでフィルタリング
      const filteredTasks = allTasks.filter((task: Task) => {
        if (filterStatus === 'active') return task.status !== 'completed';
        if (filterStatus === 'completed') return task.status === 'completed';
        return true; // 'all'の場合
      });

      setTasks(filteredTasks);
    } catch (error) {
      console.error('タスク取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [filterTag, filterStatus]);

  const loadTags = async () => {
    try {
      const allTags = await DatabaseService.getTags();
      setTags(allTags);
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      await DatabaseService.deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('タスク削除エラー:', error);
      alert('タスクの削除に失敗しました');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'active' : 'completed';
      await DatabaseService.updateTask(task.id, { status: newStatus });
      await loadTasks();
    } catch (error) {
      console.error('タスク更新エラー:', error);
      alert('タスクの更新に失敗しました');
    }
  };

  const handleFormSubmit = async () => {
    setShowForm(false);
    setEditingTask(null);
    await loadTasks();
  };

  const getProgressPercentage = (task: Task) => {
    if (task.estimated_pomodoros === 0) return 0;
    return Math.min(
      (task.completed_pomodoros / task.estimated_pomodoros) * 100,
      100
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          タスク管理
        </h2>
        <button
          onClick={handleCreateTask}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>新しいタスク</span>
        </button>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            ステータス:
          </label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="active">進行中</option>
            <option value="completed">完了済み</option>
            <option value="all">すべて</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            タグ:
          </label>
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">すべてのタグ</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* タスク一覧 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {filterStatus === 'active'
            ? '進行中のタスクがありません'
            : 'タスクがありません'}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 transition-all ${
                selectedTaskId === task.id
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 dark:border-gray-700 hover:shadow-sm'
              } ${onTaskSelect ? 'cursor-pointer' : ''}`}
              onClick={() => onTaskSelect?.(task)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* タスクタイトルとステータス */}
                  <div className="flex items-center space-x-3 mb-2">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleComplete(task)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      onClick={e => e.stopPropagation()}
                    />
                    <h3
                      className={`text-lg font-medium ${
                        task.status === 'completed'
                          ? 'line-through text-gray-500'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        task.status
                      )}`}
                    >
                      {task.status === 'completed'
                        ? '完了'
                        : task.status === 'in_progress'
                          ? '進行中'
                          : task.status === 'paused'
                            ? '一時停止'
                            : '未開始'}
                    </span>
                  </div>

                  {/* タスク説明 */}
                  {task.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {task.description}
                    </p>
                  )}

                  {/* 進捗情報 */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        進捗:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.completed_pomodoros}/{task.estimated_pomodoros}{' '}
                        ポモドーロ
                      </span>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(task)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(getProgressPercentage(task))}%
                    </span>
                  </div>

                  {/* タグ表示 */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <TagIcon className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleEditTask(task);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="編集"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="削除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* タスク作成・編集フォーム */}
      <TaskForm
        isOpen={showForm}
        task={editingTask}
        onClose={() => {
          setShowForm(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};
