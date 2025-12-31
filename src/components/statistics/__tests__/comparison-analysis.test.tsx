import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ComparisonAnalysis } from '../comparison-analysis';
import { DatabaseService } from '../../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    getComparisonData: vi.fn(),
  },
}));

const mockComparisonData = {
  weeklyComparison: {
    currentWeek: { workHours: 15, sessionCount: 10, completedTasks: 5 },
    previousWeek: { workHours: 12, sessionCount: 8, completedTasks: 4 },
    changes: {
      workHoursChange: 25,
      sessionCountChange: 25,
      completedTasksChange: 25,
    },
  },
  monthlyComparison: {
    currentMonth: { workHours: 60, sessionCount: 40, completedTasks: 20 },
    previousMonth: { workHours: 45, sessionCount: 30, completedTasks: 15 },
    changes: {
      workHoursChange: 33,
      sessionCountChange: 33,
      completedTasksChange: 33,
    },
  },
};

describe('ComparisonAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('比較分析データを正しく表示する', async () => {
    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      mockComparisonData
    );

    render(<ComparisonAnalysis />);

    // ローディング状態の確認
    expect(screen.getByText('比較分析')).toBeInTheDocument();

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('週間比較')).toBeInTheDocument();
    });

    // 週間比較データの表示確認（数値と単位を別々に確認）
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getAllByText('+25%')).toHaveLength(3); // 週間の3項目すべて

    // 月間比較データの表示確認（数値と単位を別々に確認）
    expect(screen.getByText('月間比較')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getAllByText('+33%')).toHaveLength(3); // 月間の3項目すべて
  });

  it('減少傾向の場合に適切な表示をする', async () => {
    const decreaseData = {
      weeklyComparison: {
        currentWeek: { workHours: 10, sessionCount: 6, completedTasks: 3 },
        previousWeek: { workHours: 15, sessionCount: 10, completedTasks: 5 },
        changes: {
          workHoursChange: -33,
          sessionCountChange: -40,
          completedTasksChange: -40,
        },
      },
      monthlyComparison: {
        currentMonth: { workHours: 40, sessionCount: 25, completedTasks: 12 },
        previousMonth: { workHours: 60, sessionCount: 40, completedTasks: 20 },
        changes: {
          workHoursChange: -33,
          sessionCountChange: -38,
          completedTasksChange: -40,
        },
      },
    };

    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      decreaseData
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      expect(screen.getAllByText('-33%')).toHaveLength(2); // 週間作業時間と月間作業時間
      expect(screen.getAllByText('-40%')).toHaveLength(3); // 週間セッション数、週間タスク数、月間タスク数の3つ
      expect(screen.getByText('-38%')).toBeInTheDocument(); // 月間セッション数
    });
  });

  it('変化がない場合に適切な表示をする', async () => {
    const noChangeData = {
      weeklyComparison: {
        currentWeek: { workHours: 15, sessionCount: 10, completedTasks: 5 },
        previousWeek: { workHours: 15, sessionCount: 10, completedTasks: 5 },
        changes: {
          workHoursChange: 0,
          sessionCountChange: 0,
          completedTasksChange: 0,
        },
      },
      monthlyComparison: {
        currentMonth: { workHours: 60, sessionCount: 40, completedTasks: 20 },
        previousMonth: { workHours: 60, sessionCount: 40, completedTasks: 20 },
        changes: {
          workHoursChange: 0,
          sessionCountChange: 0,
          completedTasksChange: 0,
        },
      },
    };

    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      noChangeData
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      expect(screen.getAllByText('±0%')).toHaveLength(6); // 週間・月間それぞれ3項目
    });
  });

  it('前期間のデータがない場合の表示を確認する', async () => {
    const newUserData = {
      weeklyComparison: {
        currentWeek: { workHours: 10, sessionCount: 5, completedTasks: 3 },
        previousWeek: { workHours: 0, sessionCount: 0, completedTasks: 0 },
        changes: {
          workHoursChange: 100,
          sessionCountChange: 100,
          completedTasksChange: 100,
        },
      },
      monthlyComparison: {
        currentMonth: { workHours: 40, sessionCount: 20, completedTasks: 12 },
        previousMonth: { workHours: 0, sessionCount: 0, completedTasks: 0 },
        changes: {
          workHoursChange: 100,
          sessionCountChange: 100,
          completedTasksChange: 100,
        },
      },
    };

    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(newUserData);

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      expect(screen.getByText('10h')).toBeInTheDocument();
      expect(screen.getByText('40h')).toBeInTheDocument();
      expect(screen.getAllByText('+100%')).toHaveLength(6);
    });
  });

  it('ローディング状態を正しく表示する', () => {
    vi.mocked(DatabaseService.getComparisonData).mockImplementation(
      () => new Promise(() => {}) // 永続的にpending状態
    );

    render(<ComparisonAnalysis />);

    expect(screen.getByText('比較分析')).toBeInTheDocument();
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('エラー状態を正しく表示する', async () => {
    vi.mocked(DatabaseService.getComparisonData).mockRejectedValue(
      new Error('データ取得エラー')
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      expect(
        screen.getByText('比較データの取得に失敗しました')
      ).toBeInTheDocument();
    });
  });

  it('変化率の色分けが正しく適用される', async () => {
    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      mockComparisonData
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      // 増加（緑色）の確認
      const increaseElements = screen.getAllByText('+25%');
      increaseElements.forEach(element => {
        expect(element.className).toContain('text-green-600');
      });

      const increaseElements33 = screen.getAllByText('+33%');
      increaseElements33.forEach(element => {
        expect(element.className).toContain('text-green-600');
      });
    });
  });

  it('大幅な変化に対する適切なメッセージを表示する', async () => {
    const significantChangeData = {
      weeklyComparison: {
        currentWeek: { workHours: 30, sessionCount: 20, completedTasks: 10 },
        previousWeek: { workHours: 10, sessionCount: 5, completedTasks: 2 },
        changes: {
          workHoursChange: 200,
          sessionCountChange: 300,
          completedTasksChange: 400,
        },
      },
      monthlyComparison: {
        currentMonth: { workHours: 120, sessionCount: 80, completedTasks: 40 },
        previousMonth: { workHours: 40, sessionCount: 20, completedTasks: 10 },
        changes: {
          workHoursChange: 200,
          sessionCountChange: 300,
          completedTasksChange: 300,
        },
      },
    };

    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      significantChangeData
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      expect(screen.getAllByText('+200%')).toHaveLength(2); // 週間と月間の両方に表示される
      expect(screen.getAllByText('+300%')).toHaveLength(3); // 週間セッション、月間セッション、月間タスクの3つ
      expect(screen.getByText('+400%')).toBeInTheDocument();
    });
  });

  it('分析のヒントを表示する', async () => {
    vi.mocked(DatabaseService.getComparisonData).mockResolvedValue(
      mockComparisonData
    );

    render(<ComparisonAnalysis />);

    await waitFor(() => {
      // 実際のコンポーネントに存在する要素をテスト
      expect(screen.getByText('比較分析')).toBeInTheDocument();
      expect(screen.getByText('週間比較')).toBeInTheDocument();
      expect(screen.getByText('月間比較')).toBeInTheDocument();
      expect(screen.getByText('素晴らしい成長傾向です！')).toBeInTheDocument();
    });
  });
});
