import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../../services/database-service';
import type { Task, Tag } from '../../types';

interface TaskFormProps {
  isOpen: boolean;
  task?: Task | null;
  onClose: () => void;
  onSubmit: () => void;
}

/**
 * タスク作成・編集フォームコンポーネント
 * 要件7.1-7.5: タスクの作成、編集機能
 */
export const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  task,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_pomodoros: 1,
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in_progress' | 'paused' | 'completed',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadTags();
      if (task) {
        // 編集モード：既存タスクのデータを設定
        setFormData({
          title: task.title,
          description: task.description || '',
          estimated_pomodoros: task.estimated_pomodoros,
          priority: task.priority,
          status: task.status,
        });
        setSelectedTags(task.tags?.map(tag => tag.id) || []);
      } else {
        // 新規作成モード：フォームをリセット
        setFormData({
          title: '',
          description: '',
          estimated_pomodoros: 1,
          priority: 'medium',
          status: 'pending',
        });
        setSelectedTags([]);
      }
      setErrors({});
    }
  }, [isOpen, task]);

  const loadTags = async () => {
    try {
      const tags = await DatabaseService.getTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'タスク名は必須です';
    }

    if (formData.estimated_pomodoros < 1 || formData.estimated_pomodoros > 20) {
      newErrors.estimated_pomodoros =
        '見積もりポモドーロ数は1-20の範囲で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('タスク保存開始:', { formData, task });

      if (task) {
        // 既存タスクの更新
        console.log('タスク更新:', task.id, formData);
        await DatabaseService.updateTask(task.id, formData);

        // タグの更新
        console.log('タグ更新:', task.id, selectedTags);
        await DatabaseService.updateTaskTags(task.id, selectedTags);
      } else {
        // 新しいタスクの作成
        console.log('新規タスク作成:', formData);
        const newTask = await DatabaseService.createTask(formData);
        console.log('作成されたタスク:', newTask);

        // タグの関連付け
        if (selectedTags.length > 0) {
          console.log('タグ関連付け:', newTask.id, selectedTags);
          await DatabaseService.updateTaskTags(newTask.id, selectedTags);
        }
      }

      console.log('タスク保存完了');
      onSubmit();
    } catch (error) {
      console.error('タスク保存エラー:', error);
      alert(
        `タスクの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      console.log('新しいタグを作成中:', {
        name: newTagName.trim(),
        color: newTagColor,
      });

      const newTag = await DatabaseService.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        created_at: new Date().toISOString(),
      });

      console.log('タグ作成成功:', newTag);

      setAvailableTags([...availableTags, newTag]);
      setSelectedTags([...selectedTags, newTag.id]);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setShowNewTagForm(false);
    } catch (error) {
      console.error('タグ作成エラー:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'タグの作成に失敗しました';
      alert(errorMessage);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {task ? 'タスクを編集' : '新しいタスクを作成'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* タスク名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タスク名 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.title
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="タスク名を入力してください"
              data-testid="task-title-input"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="タスクの詳細説明（オプション）"
            />
          </div>

          {/* 見積もりポモドーロ数と優先度 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                見積もりポモドーロ数 *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.estimated_pomodoros}
                onChange={e =>
                  setFormData({
                    ...formData,
                    estimated_pomodoros: parseInt(e.target.value) || 1,
                  })
                }
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  errors.estimated_pomodoros
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.estimated_pomodoros && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.estimated_pomodoros}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                優先度
              </label>
              <select
                value={formData.priority}
                onChange={e =>
                  setFormData({ ...formData, priority: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>

          {/* ステータス（編集時のみ） */}
          {task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ステータス
              </label>
              <select
                value={formData.status}
                onChange={e =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="pending">未開始</option>
                <option value="in_progress">進行中</option>
                <option value="paused">一時停止</option>
                <option value="completed">完了</option>
              </select>
            </div>
          )}

          {/* タグ選択 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                タグ
              </label>
              <button
                type="button"
                onClick={() => setShowNewTagForm(!showNewTagForm)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <PlusIcon className="w-4 h-4" />
                <span>新しいタグ</span>
              </button>
            </div>

            {/* 新しいタグ作成フォーム */}
            {showNewTagForm && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    placeholder="タグ名"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    作成
                  </button>
                </div>
              </div>
            )}

            {/* 既存タグ選択 */}
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagToggle(tag.id)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'border-transparent text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id)
                      ? tag.color
                      : 'transparent',
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              data-testid="task-form-submit-button"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{task ? '更新' : '作成'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
