import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../../services/database-service';
import type { Goal, Tag, CreateGoalRequest } from '../../types';

interface GoalSettingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: (goal: Goal) => void;
  editingGoal?: Goal | null;
}

/**
 * 目標設定ダイアログコンポーネント
 * 要件2.3: 目標設定システムの実装
 */
export const GoalSettingDialog: React.FC<GoalSettingDialogProps> = ({
  isOpen,
  onClose,
  onGoalCreated,
  editingGoal,
}) => {
  const [formData, setFormData] = useState<CreateGoalRequest>({
    title: '',
    description: '',
    type: 'weekly',
    metric: 'sessions',
    target_value: 10,
    tags: [],
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集モードの場合、フォームデータを初期化
  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title,
        description: editingGoal.description || '',
        type: editingGoal.type,
        metric: editingGoal.metric,
        target_value: editingGoal.target_value,
        tags: editingGoal.tags || [],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'weekly',
        metric: 'sessions',
        target_value: 10,
        tags: [],
      });
    }
  }, [editingGoal]);

  // タグ一覧を取得
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await DatabaseService.getTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error('タグ取得エラー:', err);
      }
    };

    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingGoal) {
        // 編集モード
        const updatedGoal = await DatabaseService.updateGoal(editingGoal.id, {
          title: formData.title,
          description: formData.description,
          target_value: formData.target_value,
          tags: formData.tags,
        });
        onGoalCreated(updatedGoal);
      } else {
        // 新規作成モード
        const newGoal = await DatabaseService.createGoal(formData);
        onGoalCreated(newGoal);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '目標の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...(prev.tags || []), tagId],
    }));
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'sessions':
        return 'セッション';
      case 'minutes':
        return '分';
      case 'tasks':
        return 'タスク';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return '日間';
      case 'weekly':
        return '週間';
      case 'monthly':
        return '月間';
      default:
        return '';
    }
  };

  const getSuggestedTargets = () => {
    const { type, metric } = formData;

    switch (metric) {
      case 'sessions':
        return type === 'daily'
          ? [2, 4, 6, 8]
          : type === 'weekly'
            ? [10, 15, 20, 25]
            : [40, 60, 80, 100];
      case 'minutes':
        return type === 'daily'
          ? [50, 100, 150, 200]
          : type === 'weekly'
            ? [300, 600, 900, 1200]
            : [1200, 2400, 3600, 4800];
      case 'tasks':
        return type === 'daily'
          ? [1, 2, 3, 5]
          : type === 'weekly'
            ? [5, 10, 15, 20]
            : [20, 40, 60, 80];
      default:
        return [];
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                    data-testid="goal-dialog-title"
                  >
                    {editingGoal ? '目標を編集' : '新しい目標を設定'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    data-testid="goal-dialog-close"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* 目標タイトル */}
                  <div>
                    <label
                      htmlFor="goal-title"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      目標タイトル
                    </label>
                    <input
                      id="goal-title"
                      type="text"
                      value={formData.title}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="例: 週間集中セッション目標"
                      required
                      data-testid="goal-title-input"
                    />
                  </div>

                  {/* 目標説明 */}
                  <div>
                    <label
                      htmlFor="goal-description"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      説明（任意）
                    </label>
                    <textarea
                      id="goal-description"
                      value={formData.description}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      rows={2}
                      placeholder="目標の詳細や動機を記入してください"
                      data-testid="goal-description-input"
                    />
                  </div>

                  {/* 期間タイプ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      期間
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['daily', 'weekly', 'monthly'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({ ...prev, type }))
                          }
                          className={`px-3 py-2 text-sm font-medium rounded-md border ${
                            formData.type === type
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                          data-testid={`goal-type-${type}`}
                        >
                          {getTypeLabel(type)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* メトリクス */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      測定指標
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['sessions', 'minutes', 'tasks'] as const).map(
                        metric => (
                          <button
                            key={metric}
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({ ...prev, metric }))
                            }
                            className={`px-3 py-2 text-sm font-medium rounded-md border ${
                              formData.metric === metric
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                            data-testid={`goal-metric-${metric}`}
                          >
                            {getMetricLabel(metric)}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* 目標値 */}
                  <div>
                    <label
                      htmlFor="goal-target"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      目標値
                    </label>
                    <input
                      id="goal-target"
                      type="number"
                      min="1"
                      value={formData.target_value}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          target_value: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                      data-testid="goal-target-input"
                    />

                    {/* 推奨値 */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        推奨値:
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {getSuggestedTargets().map(value => (
                          <button
                            key={value}
                            type="button"
                            onClick={() =>
                              setFormData(prev => ({
                                ...prev,
                                target_value: value,
                              }))
                            }
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* タグ選択 */}
                  {availableTags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        対象タグ（任意）
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map(tag => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagToggle(tag.id)}
                            className={`px-3 py-1 text-sm rounded-full border ${
                              formData.tags?.includes(tag.id)
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                            style={{
                              borderColor: formData.tags?.includes(tag.id)
                                ? tag.color
                                : undefined,
                            }}
                            data-testid={`goal-tag-${tag.name}`}
                          >
                            {tag.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        タグを選択すると、そのタグが付いたタスクのみが目標の対象になります
                      </p>
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      data-testid="goal-dialog-cancel"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !formData.title.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="goal-dialog-save"
                    >
                      {loading ? '保存中...' : editingGoal ? '更新' : '作成'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
