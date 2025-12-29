import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../../services/database-service';
import { GoalSettingDialog } from './goal-setting-dialog';
import type { Goal } from '../../types';

/**
 * 目標進捗表示コンポーネント
 * 要件2.3: 目標設定システムの実装
 */
export const GoalProgress: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const activeGoals = await DatabaseService.getGoals({ is_active: true });
      setGoals(activeGoals);
      setError(null);
    } catch (err) {
      console.error('目標データの取得に失敗:', err);
      setError('目標データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalCreated = (goal: Goal) => {
    if (editingGoal) {
      // 編集の場合
      setGoals(prev => prev.map(g => (g.id === goal.id ? goal : g)));
    } else {
      // 新規作成の場合
      setGoals(prev => [...prev, goal]);
    }
    setEditingGoal(null);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowGoalDialog(true);
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('この目標を削除しますか？')) return;

    try {
      await DatabaseService.deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      console.error('目標削除エラー:', err);
      alert('目標の削除に失敗しました');
    }
  };

  const handleCloseDialog = () => {
    setShowGoalDialog(false);
    setEditingGoal(null);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          目標進捗
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          目標進捗
        </h3>
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  const ProgressBar: React.FC<{
    percentage: number;
    color: string;
  }> = ({ percentage, color }) => (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
      <div
        className={`h-3 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );

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

  const getProgressPercentage = (current: number, target: number) => {
    return target > 0 ? Math.round((current / target) * 100) : 0;
  };

  const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
    const progressPercentage = getProgressPercentage(
      goal.current_value,
      goal.target_value
    );
    const isAchieved = goal.achieved_at !== null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
              {goal.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getTypeLabel(goal.type)}目標 • {goal.target_value}{' '}
              {getMetricLabel(goal.metric)}
            </p>
            {goal.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex space-x-1 ml-2">
            <button
              onClick={() => handleEditGoal(goal)}
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              title="編集"
              data-testid={`edit-goal-${goal.id}`}
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteGoal(goal.id)}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              title="削除"
              data-testid={`delete-goal-${goal.id}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              進捗: {goal.current_value} / {goal.target_value}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {progressPercentage}%
            </span>
          </div>
          <ProgressBar
            percentage={progressPercentage}
            color={isAchieved ? 'bg-green-500' : 'bg-blue-500'}
          />
        </div>

        {/* 達成状況のメッセージ */}
        <div className="text-xs">
          {isAchieved ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              🎉 目標達成！素晴らしい成果です！
            </span>
          ) : progressPercentage >= 80 ? (
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              💪 もう少しで目標達成です！
            </span>
          ) : progressPercentage >= 50 ? (
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
              📈 順調に進んでいます
            </span>
          ) : (
            <span className="text-gray-600 dark:text-gray-400">
              🚀 頑張りましょう！
            </span>
          )}
        </div>

        {/* タグ表示 */}
        {goal.tags && goal.tags.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              対象タグ:
            </p>
            <div className="flex flex-wrap gap-1">
              {goal.tags.map((tagId, index) => (
                <span
                  key={tagId}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                >
                  タグ{index + 1}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-white"
            data-testid="goal-progress-title"
          >
            目標進捗
          </h3>
          <button
            onClick={() => setShowGoalDialog(true)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            data-testid="set-goals-button"
          >
            <PlusIcon className="h-4 w-4" />
            <span>目標を設定</span>
          </button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              目標を設定しましょう
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              日間、週間、月間の目標を設定して、進捗を追跡しましょう
            </p>
            <button
              onClick={() => setShowGoalDialog(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              最初の目標を設定
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}

        {/* 目標設定のヒント */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            💡 目標設定のコツ
          </h5>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 達成可能で具体的な目標を設定しましょう</li>
            <li>• 日間目標: 2-6セッション、週間目標: 10-25セッション</li>
            <li>• 特定のタグを指定して、プロジェクト別の目標も設定できます</li>
            <li>• 無理のない範囲で継続することが重要です</li>
          </ul>
        </div>
      </div>

      {/* 目標設定ダイアログ */}
      <GoalSettingDialog
        isOpen={showGoalDialog}
        onClose={handleCloseDialog}
        onGoalCreated={handleGoalCreated}
        editingGoal={editingGoal}
      />
    </>
  );
};
