import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface ComparisonData {
  weeklyComparison: {
    currentWeek: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    previousWeek: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    changes: {
      workHoursChange: number;
      sessionCountChange: number;
      completedTasksChange: number;
    };
  };
  monthlyComparison: {
    currentMonth: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    previousMonth: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    changes: {
      workHoursChange: number;
      sessionCountChange: number;
      completedTasksChange: number;
    };
  };
}

/**
 * 比較分析コンポーネント
 * 要件3.19: 前週・前月との比較データ表示
 */
export const ComparisonAnalysis: React.FC = () => {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getComparisonData();
        setComparisonData(data);
        setError(null);
      } catch (err) {
        console.error('比較データの取得に失敗:', err);
        setError('比較データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          比較分析
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          比較分析
        </h3>
        <div className="text-red-600 dark:text-red-400">
          {error || 'データを取得できませんでした'}
        </div>
      </div>
    );
  }

  const ChangeIndicator: React.FC<{ change: number }> = ({ change }) => {
    if (change > 0) {
      return (
        <span className="inline-flex items-center text-green-600 dark:text-green-400 text-sm font-medium">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          +{change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="inline-flex items-center text-red-600 dark:text-red-400 text-sm font-medium">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {change}%
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center text-gray-500 dark:text-gray-400 text-sm font-medium">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          変化なし
        </span>
      );
    }
  };

  const ComparisonCard: React.FC<{
    title: string;
    current: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    previous: {
      workHours: number;
      sessionCount: number;
      completedTasks: number;
    };
    changes: {
      workHoursChange: number;
      sessionCountChange: number;
      completedTasksChange: number;
    };
    bgColor: string;
  }> = ({ title, current, previous, changes, bgColor }) => (
    <div className={`${bgColor} rounded-lg p-4`}>
      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
        {title}
      </h4>

      <div className="space-y-4">
        {/* 作業時間 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              作業時間
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {current.workHours}h
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                (前期: {previous.workHours}h)
              </span>
            </div>
          </div>
          <ChangeIndicator change={changes.workHoursChange} />
        </div>

        {/* セッション数 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              セッション数
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {current.sessionCount}回
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                (前期: {previous.sessionCount}回)
              </span>
            </div>
          </div>
          <ChangeIndicator change={changes.sessionCountChange} />
        </div>

        {/* 完了タスク数 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              完了タスク数
            </div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {current.completedTasks}個
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                (前期: {previous.completedTasks}個)
              </span>
            </div>
          </div>
          <ChangeIndicator change={changes.completedTasksChange} />
        </div>
      </div>
    </div>
  );

  // 全体的な傾向を分析
  const getOverallTrend = () => {
    const weeklyPositive =
      (comparisonData.weeklyComparison.changes.workHoursChange > 0 ? 1 : 0) +
      (comparisonData.weeklyComparison.changes.sessionCountChange > 0 ? 1 : 0) +
      (comparisonData.weeklyComparison.changes.completedTasksChange > 0
        ? 1
        : 0);

    const monthlyPositive =
      (comparisonData.monthlyComparison.changes.workHoursChange > 0 ? 1 : 0) +
      (comparisonData.monthlyComparison.changes.sessionCountChange > 0
        ? 1
        : 0) +
      (comparisonData.monthlyComparison.changes.completedTasksChange > 0
        ? 1
        : 0);

    if (weeklyPositive >= 2 && monthlyPositive >= 2) {
      return {
        icon: '📈',
        message: '素晴らしい成長傾向です！',
        color: 'text-green-600 dark:text-green-400',
      };
    } else if (weeklyPositive >= 2 || monthlyPositive >= 2) {
      return {
        icon: '📊',
        message: '順調に進歩しています',
        color: 'text-blue-600 dark:text-blue-400',
      };
    } else {
      return {
        icon: '💪',
        message: '次の期間での改善を目指しましょう',
        color: 'text-yellow-600 dark:text-yellow-400',
      };
    }
  };

  const trend = getOverallTrend();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          比較分析
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          前期間との比較
        </div>
      </div>

      <div className="space-y-6">
        {/* 週間比較 */}
        <ComparisonCard
          title="週間比較"
          current={comparisonData.weeklyComparison.currentWeek}
          previous={comparisonData.weeklyComparison.previousWeek}
          changes={comparisonData.weeklyComparison.changes}
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />

        {/* 月間比較 */}
        <ComparisonCard
          title="月間比較"
          current={comparisonData.monthlyComparison.currentMonth}
          previous={comparisonData.monthlyComparison.previousMonth}
          changes={comparisonData.monthlyComparison.changes}
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* 全体的な傾向 */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className={`flex items-center ${trend.color}`}>
          <span className="text-lg mr-2">{trend.icon}</span>
          <span className="font-medium">{trend.message}</span>
        </div>
      </div>
    </div>
  );
};
