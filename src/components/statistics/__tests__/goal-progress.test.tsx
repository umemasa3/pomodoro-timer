import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GoalProgress } from '../goal-progress';
import { DatabaseService } from '../../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    getGoalProgress: vi.fn(),
  },
}));

const mockGoalData = {
  weeklyGoal: {
    targetHours: 25,
    actualHours: 15,
    progressPercentage: 60,
    remainingHours: 10,
  },
  monthlyGoal: {
    targetHours: 100,
    actualHours: 45,
    progressPercentage: 45,
    remainingHours: 55,
  },
};

describe('GoalProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('目標進捗データを正しく表示する', async () => {
    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(mockGoalData);

    render(<GoalProgress />);

    // ローディング状態の確認
    expect(screen.getByText('目標進捗')).toBeInTheDocument();

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('週間目標')).toBeInTheDocument();
    });

    // 週間目標の表示確認
    expect(screen.getByText('15h / 25h')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('10h')).toBeInTheDocument();

    // 月間目標の表示確認
    expect(screen.getByText('月間目標')).toBeInTheDocument();
    expect(screen.getByText('45h / 100h')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('55h')).toBeInTheDocument();
  });

  it('目標達成時に適切なメッセージを表示する', async () => {
    const achievedGoalData = {
      weeklyGoal: {
        targetHours: 25,
        actualHours: 25,
        progressPercentage: 100,
        remainingHours: 0,
      },
      monthlyGoal: {
        targetHours: 100,
        actualHours: 100,
        progressPercentage: 100,
        remainingHours: 0,
      },
    };

    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(
      achievedGoalData
    );

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getAllByText('🎉 目標達成！素晴らしい成果です！')
      ).toHaveLength(2);
    });
  });

  it('進捗率に応じて適切なメッセージを表示する', async () => {
    const progressData = {
      weeklyGoal: {
        targetHours: 25,
        actualHours: 20,
        progressPercentage: 80,
        remainingHours: 5,
      },
      monthlyGoal: {
        targetHours: 100,
        actualHours: 60,
        progressPercentage: 60,
        remainingHours: 40,
      },
    };

    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(progressData);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getByText('💪 もう少しで目標達成です！')
      ).toBeInTheDocument();
      expect(screen.getByText('📈 順調に進んでいます')).toBeInTheDocument();
    });
  });

  it('低進捗時に適切なメッセージを表示する', async () => {
    const lowProgressData = {
      weeklyGoal: {
        targetHours: 25,
        actualHours: 5,
        progressPercentage: 20,
        remainingHours: 20,
      },
      monthlyGoal: {
        targetHours: 100,
        actualHours: 10,
        progressPercentage: 10,
        remainingHours: 90,
      },
    };

    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(
      lowProgressData
    );

    render(<GoalProgress />);

    await waitFor(() => {
      expect(screen.getAllByText('🚀 頑張りましょう！')).toHaveLength(2);
    });
  });

  it('ローディング状態を正しく表示する', () => {
    vi.mocked(DatabaseService.getGoalProgress).mockImplementation(
      () => new Promise(() => {}) // 永続的にpending状態
    );

    render(<GoalProgress />);

    expect(screen.getByText('目標進捗')).toBeInTheDocument();
    // ローディング状態の確認（animate-pulseクラスを持つ要素の存在確認）
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('エラー状態を正しく表示する', async () => {
    vi.mocked(DatabaseService.getGoalProgress).mockRejectedValue(
      new Error('データ取得エラー')
    );

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getByText('目標進捗データの取得に失敗しました')
      ).toBeInTheDocument();
    });
  });

  it('目標設定のヒントを表示する', async () => {
    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(mockGoalData);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(screen.getByText('💡 目標設定のコツ')).toBeInTheDocument();
      expect(
        screen.getByText('• 週間目標: 平日1日5時間 × 5日 = 25時間が目安')
      ).toBeInTheDocument();
      expect(
        screen.getByText('• 月間目標: 週間目標 × 4週 = 100時間が目安')
      ).toBeInTheDocument();
      expect(
        screen.getByText('• 無理のない範囲で継続することが重要です')
      ).toBeInTheDocument();
    });
  });

  it('プログレスバーが正しい幅で表示される', async () => {
    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(mockGoalData);

    render(<GoalProgress />);

    await waitFor(() => {
      const progressBars = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('rounded-full') && el.style.width);

      // 週間目標のプログレスバー（60%）
      expect(progressBars.some(bar => bar.style.width === '60%')).toBe(true);
      // 月間目標のプログレスバー（45%）
      expect(progressBars.some(bar => bar.style.width === '45%')).toBe(true);
    });
  });

  it('100%を超える進捗率でもプログレスバーは100%で制限される', async () => {
    const overAchievedData = {
      weeklyGoal: {
        targetHours: 25,
        actualHours: 30,
        progressPercentage: 120,
        remainingHours: 0,
      },
      monthlyGoal: {
        targetHours: 100,
        actualHours: 110,
        progressPercentage: 110,
        remainingHours: 0,
      },
    };

    vi.mocked(DatabaseService.getGoalProgress).mockResolvedValue(
      overAchievedData
    );

    render(<GoalProgress />);

    await waitFor(() => {
      const progressBars = screen
        .getAllByRole('generic')
        .filter(el => el.className.includes('rounded-full') && el.style.width);

      // プログレスバーは100%で制限される
      progressBars.forEach(bar => {
        const width = parseInt(bar.style.width);
        expect(width).toBeLessThanOrEqual(100);
      });
    });
  });
});
