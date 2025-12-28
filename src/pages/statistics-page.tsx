import React from 'react';
import {
  StatisticsOverview,
  SessionHistory,
  StatisticsChart,
} from '../components/statistics';

/**
 * 統計ページコンポーネント
 * 要件3.1-3.5: 基本統計機能の統合表示
 */
const StatisticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ページヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            統計・分析
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            あなたの作業実績と進捗を確認しましょう
          </p>
        </div>

        {/* 統計コンテンツ */}
        <div className="space-y-8">
          {/* 統計概要 */}
          <StatisticsOverview />

          {/* チャートとセッション履歴を並列表示 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <StatisticsChart />
            <SessionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
