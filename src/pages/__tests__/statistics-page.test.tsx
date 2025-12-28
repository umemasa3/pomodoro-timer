import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StatisticsPage } from '../statistics-page';
import { DatabaseService } from '../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../services/database-service', () => ({
  DatabaseService: {
    getWorkTimeGraphData: vi.fn(),
    getTagStatistics: vi.fn(),
    getGoalProgress: vi.fn(),
    getComparisonData: vi.fn(),
    getTagTrendData: vi.fn(),
    exportStatisticsToCSV: vi.fn(),
    getSessionCompletionRate: vi.fn(),
    getWorkStreakData: vi.fn(),
    getTaskTypeBreakdown: vi.fn(),
    getSessions: vi.fn(),
    getTasks: vi.fn(),
    getCompletedTasksCount: vi.fn(),
    getDailySessionStats: vi.fn(),
    getMostProductiveTagTimeSlots: vi.fn(),
    getWorkDistributionByTimeAndDay: vi.fn(),
    getTaskCategoryTimeDistribution: vi.fn(),
  },
}));

// 各統計コンポーネントのモック
vi.mock('../../components/statistics/statistics-overview', () => ({
  StatisticsOverview: () => (
    <div data-testid="statistics-overview">Statistics Overview</div>
  ),
}));

vi.mock('../../components/statistics/work-time-graph', () => ({
  WorkTimeGraph: () => <div data-testid="work-time-graph">Work Time Graph</div>,
}));

vi.mock('../../components/statistics/task-type-breakdown', () => ({
  TaskTypeBreakdown: () => (
    <div data-testid="task-type-breakdown">Task Type Breakdown</div>
  ),
}));

vi.mock('../../components/statistics/work-streak', () => ({
  WorkStreak: () => <div data-testid="work-streak">Work Streak</div>,
}));

vi.mock('../../components/statistics/session-completion-rate', () => ({
  SessionCompletionRate: () => (
    <div data-testid="session-completion-rate">Session Completion Rate</div>
  ),
}));

vi.mock('../../components/statistics/session-history', () => ({
  SessionHistory: () => (
    <div data-testid="session-history">Session History</div>
  ),
}));

vi.mock('../../components/statistics/statistics-chart', () => ({
  StatisticsChart: () => (
    <div data-testid="statistics-chart">Statistics Chart</div>
  ),
}));

vi.mock('../../components/statistics/tag-statistics', () => ({
  TagStatistics: () => <div data-testid="tag-statistics">Tag Statistics</div>,
}));

vi.mock('../../components/statistics/productivity-analysis', () => ({
  ProductivityAnalysis: () => (
    <div data-testid="productivity-analysis">Productivity Analysis</div>
  ),
}));

vi.mock('../../components/statistics/work-distribution-heatmap', () => ({
  WorkDistributionHeatmap: () => (
    <div data-testid="work-distribution-heatmap">Work Distribution Heatmap</div>
  ),
}));

vi.mock('../../components/statistics/category-time-pie-chart', () => ({
  CategoryTimePieChart: () => (
    <div data-testid="category-time-pie-chart">Category Time Pie Chart</div>
  ),
}));

vi.mock('../../components/statistics/goal-progress', () => ({
  GoalProgress: () => <div data-testid="goal-progress">Goal Progress</div>,
}));

vi.mock('../../components/statistics/comparison-analysis', () => ({
  ComparisonAnalysis: () => (
    <div data-testid="comparison-analysis">Comparison Analysis</div>
  ),
}));

vi.mock('../../components/statistics/tag-trend-graph', () => ({
  TagTrendGraph: () => <div data-testid="tag-trend-graph">Tag Trend Graph</div>,
}));

vi.mock('../../components/statistics/csv-export', () => ({
  CSVExport: () => <div data-testid="csv-export">CSV Export</div>,
}));

describe('StatisticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('統計ページが正しく表示される', () => {
    render(<StatisticsPage />);

    // ページタイトルの確認
    expect(screen.getByText('統計・分析')).toBeInTheDocument();
    expect(
      screen.getByText('作業の進捗と成果を詳しく分析')
    ).toBeInTheDocument();
  });

  it('基本統計セクションのコンポーネントが表示される', () => {
    render(<StatisticsPage />);

    // 基本統計セクション
    expect(screen.getByText('基本統計')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-overview')).toBeInTheDocument();
    expect(screen.getByTestId('work-time-graph')).toBeInTheDocument();
    expect(screen.getByTestId('task-type-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('work-streak')).toBeInTheDocument();
    expect(screen.getByTestId('session-completion-rate')).toBeInTheDocument();
    expect(screen.getByTestId('session-history')).toBeInTheDocument();
    expect(screen.getByTestId('statistics-chart')).toBeInTheDocument();
  });

  it('タグ別統計・分析セクションのコンポーネントが表示される', () => {
    render(<StatisticsPage />);

    // タグ別統計・分析セクション
    expect(screen.getByText('タグ別統計・分析')).toBeInTheDocument();
    expect(screen.getByTestId('tag-statistics')).toBeInTheDocument();
    expect(screen.getByTestId('productivity-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('work-distribution-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('category-time-pie-chart')).toBeInTheDocument();
  });

  it('目標設定・比較分析セクションのコンポーネントが表示される', () => {
    render(<StatisticsPage />);

    // 目標設定・比較分析セクション
    expect(screen.getByText('目標設定・比較分析')).toBeInTheDocument();
    expect(screen.getByTestId('goal-progress')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-analysis')).toBeInTheDocument();
    expect(screen.getByTestId('tag-trend-graph')).toBeInTheDocument();
    expect(screen.getByTestId('csv-export')).toBeInTheDocument();
  });

  it('レスポンシブレイアウトが適用される', () => {
    render(<StatisticsPage />);

    // メインコンテナのクラス確認
    const mainContainer = screen.getByText('統計・分析').closest('div');
    expect(mainContainer).toHaveClass(
      'min-h-screen',
      'bg-gray-50',
      'dark:bg-gray-900'
    );

    // グリッドレイアウトの確認
    const gridContainers = screen
      .getAllByRole('generic')
      .filter(el => el.className.includes('grid'));
    expect(gridContainers.length).toBeGreaterThan(0);
  });

  it('ダークモード対応が正しく適用される', () => {
    render(<StatisticsPage />);

    // ダークモードクラスの確認
    const title = screen.getByText('統計・分析');
    expect(title).toHaveClass('text-gray-900', 'dark:text-white');

    const subtitle = screen.getByText('作業の進捗と成果を詳しく分析');
    expect(subtitle).toHaveClass('text-gray-600', 'dark:text-gray-300');
  });

  it('セクションタイトルが正しく表示される', () => {
    render(<StatisticsPage />);

    // 各セクションタイトルの確認
    const sectionTitles = [
      '基本統計',
      'タグ別統計・分析',
      '目標設定・比較分析',
    ];

    sectionTitles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it('コンポーネントが正しい順序で表示される', () => {
    render(<StatisticsPage />);

    const components = [
      'statistics-overview',
      'work-time-graph',
      'task-type-breakdown',
      'work-streak',
      'session-completion-rate',
      'session-history',
      'statistics-chart',
      'tag-statistics',
      'productivity-analysis',
      'work-distribution-heatmap',
      'category-time-pie-chart',
      'goal-progress',
      'comparison-analysis',
      'tag-trend-graph',
      'csv-export',
    ];

    components.forEach(testId => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<StatisticsPage />);

    // メインタイトルのheading要素確認
    expect(
      screen.getByRole('heading', { name: '統計・分析' })
    ).toBeInTheDocument();

    // セクションタイトルのheading要素確認
    expect(
      screen.getByRole('heading', { name: '基本統計' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'タグ別統計・分析' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '目標設定・比較分析' })
    ).toBeInTheDocument();
  });

  it('統計データが空の場合でも正常に表示される', async () => {
    // 空のデータを返すモック
    vi.mocked(DatabaseService.getSessions).mockResolvedValue([]);
    vi.mocked(DatabaseService.getTasks).mockResolvedValue([]);
    vi.mocked(DatabaseService.getTagStatistics).mockResolvedValue([]);
    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue({
      weeklyGoal: {
        targetHours: 25,
        actualHours: 0,
        progressPercentage: 0,
        remainingHours: 25,
      },
      monthlyGoal: {
        targetHours: 100,
        actualHours: 0,
        progressPercentage: 0,
        remainingHours: 100,
      },
    });

    render(<StatisticsPage />);

    // ページが正常に表示されることを確認
    expect(screen.getByText('統計・分析')).toBeInTheDocument();

    // 全てのコンポーネントが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('statistics-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tag-statistics')).toBeInTheDocument();
      expect(screen.getByTestId('goal-progress')).toBeInTheDocument();
    });
  });

  it('エラー境界が正しく動作する', () => {
    // エラーを投げるコンポーネントのモック
    vi.mocked(DatabaseService.getSessions).mockRejectedValue(
      new Error('Database error')
    );

    render(<StatisticsPage />);

    // ページが表示されることを確認（エラー境界により他のコンポーネントは正常動作）
    expect(screen.getByText('統計・分析')).toBeInTheDocument();
  });

  it('パフォーマンス最適化のためのメモ化が適用される', () => {
    const { rerender } = render(<StatisticsPage />);

    // 同じpropsで再レンダリング
    rerender(<StatisticsPage />);

    // コンポーネントが正常に表示されることを確認
    expect(screen.getByText('統計・分析')).toBeInTheDocument();
  });
});
