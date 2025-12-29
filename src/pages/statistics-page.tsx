import React from 'react';
import {
  StatisticsOverview,
  SessionHistory,
  StatisticsChart,
  WorkTimeGraph,
  TaskTypeBreakdown,
  WorkStreak,
  SessionCompletionRate,
  TagStatistics,
  ProductivityAnalysis,
  WorkDistributionHeatmap,
  CategoryTimePieChart,
  GoalProgress,
  ComparisonAnalysis,
  TagTrendGraph,
  CSVExport,
} from '../components/statistics';

/**
 * 統計ページコンポーネント
 * 要件3.1-3.21: 基本統計機能、詳細分析機能、タグ別統計・分析機能、目標設定・比較分析機能の統合表示
 */
export const StatisticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-gray-900 dark:text-white"
            data-testid="statistics-page-title"
          >
            統計・分析
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            あなたの作業実績と進捗を詳しく分析しましょう
          </p>
        </div>

        {/* 統計コンテンツ */}
        <div className="space-y-8">
          {/* 基本統計概要（要件3.1-3.5） */}
          <div className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2
                className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
                data-testid="basic-statistics-heading"
              >
                基本統計
              </h2>
              <StatisticsOverview />
            </div>
          </div>

          {/* 目標設定・比較分析セクション（要件3.18-3.21） */}
          <div className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2
                className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
                data-testid="goal-comparison-heading"
              >
                目標設定・比較分析
              </h2>

              {/* 目標進捗と比較分析を並列配置 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <GoalProgress />
                <ComparisonAnalysis />
              </div>

              {/* タグ別時間推移グラフを全幅で表示 */}
              <div className="mb-6">
                <TagTrendGraph />
              </div>

              {/* CSVエクスポート機能 */}
              <div className="mb-6">
                <CSVExport />
              </div>
            </div>
          </div>

          {/* 詳細分析セクション（要件3.6-3.11） */}
          <div className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2
                className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
                data-testid="detailed-analysis-heading"
              >
                詳細分析
              </h2>

              {/* 連続作業日数と完了率を上段に配置 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <WorkStreak />
                <SessionCompletionRate />
              </div>

              {/* 作業時間グラフを全幅で表示 */}
              <div className="mb-6">
                <WorkTimeGraph />
              </div>

              {/* タスク種類別内訳を全幅で表示 */}
              <div className="mb-6">
                <TaskTypeBreakdown />
              </div>
            </div>
          </div>

          {/* タグ別統計・分析セクション（要件3.12-3.17） */}
          <div className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2
                className="text-2xl font-bold text-gray-900 dark:text-white mb-6"
                data-testid="tag-statistics-heading"
              >
                タグ別統計・分析
              </h2>

              {/* タグ別統計概要 */}
              <div className="mb-6">
                <TagStatistics />
              </div>

              {/* 生産性分析と作業分布を並列配置 */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <ProductivityAnalysis />
                <CategoryTimePieChart />
              </div>

              {/* 作業分布ヒートマップを全幅で表示 */}
              <div className="mb-6">
                <WorkDistributionHeatmap />
              </div>
            </div>
          </div>

          {/* 基本統計チャートとセッション履歴 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <StatisticsChart />
            <SessionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};
