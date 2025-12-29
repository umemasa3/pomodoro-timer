import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface GoalProgressData {
  weeklyGoal: {
    targetHours: number;
    actualHours: number;
    progressPercentage: number;
    remainingHours: number;
  };
  monthlyGoal: {
    targetHours: number;
    actualHours: number;
    progressPercentage: number;
    remainingHours: number;
  };
}

/**
 * 目標進捗表示コンポーネント
 * 要件3.18: 週間・月間目標に対する進捗率表示
 */
export const GoalProgress: React.FC = () => {
  const [goalData, setGoalData] = useState<GoalProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoalProgress = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getGoalProgress();
        setGoalData(data);
        setError(null);
      } catch (err) {
        console.error('目標進捗データの取得に失敗:', err);
        setError('目標進捗データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGoalProgress();
  }, []);

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

  if (error || !goalData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          目標進捗
        </h3>
        <div className="text-red-600 dark:text-red-400">
          {error || 'データを取得できませんでした'}
        </div>
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

  const GoalCard: React.FC<{
    title: string;
    goal: {
      targetHours: number;
      actualHours: number;
      progressPercentage: number;
      remainingHours: number;
    };
    color: string;
    bgColor: string;
    'data-testid'?: string;
  }> = ({ title, goal, color, bgColor, 'data-testid': testId }) => (
    <div className={`${bgColor} rounded-lg p-4`} data-testid={testId}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {goal.actualHours}h / {goal.targetHours}h
        </span>
      </div>

      <ProgressBar percentage={goal.progressPercentage} color={color} />

      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600 dark:text-gray-400">進捗率</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {goal.progressPercentage}%
          </div>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">残り時間</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {goal.remainingHours}h
          </div>
        </div>
      </div>

      {/* 達成状況のメッセージ */}
      <div className="mt-3 text-xs">
        {goal.progressPercentage >= 100 ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            🎉 目標達成！素晴らしい成果です！
          </span>
        ) : goal.progressPercentage >= 80 ? (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            💪 もう少しで目標達成です！
          </span>
        ) : goal.progressPercentage >= 50 ? (
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
            📈 順調に進んでいます
          </span>
        ) : (
          <span className="text-gray-600 dark:text-gray-400">
            🚀 頑張りましょう！
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-lg font-semibold text-gray-900 dark:text-white"
          data-testid="goal-progress-title"
        >
          目標進捗
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          作業時間目標の達成状況
        </div>
      </div>

      <div className="space-y-6">
        {/* 週間目標 */}
        <GoalCard
          title="週間目標"
          goal={goalData.weeklyGoal}
          color="bg-blue-500"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          data-testid="weekly-goal-display"
        />

        {/* 月間目標 */}
        <GoalCard
          title="月間目標"
          goal={goalData.monthlyGoal}
          color="bg-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
          data-testid="monthly-goal-display"
        />
      </div>

      {/* 目標設定のヒント */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          💡 目標設定のコツ
        </h5>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• 週間目標: 平日1日5時間 × 5日 = 25時間が目安</li>
          <li>• 月間目標: 週間目標 × 4週 = 100時間が目安</li>
          <li>• 無理のない範囲で継続することが重要です</li>
        </ul>
      </div>
    </div>
  );
};
