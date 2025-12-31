import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GoalProgress } from '../goal-progress';
import { DatabaseService } from '../../../services/database-service';
import type { Goal } from '../../../types';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    getGoals: vi.fn(),
    deleteGoal: vi.fn(),
  },
}));

// GoalSettingDialogのモック
vi.mock('../goal-setting-dialog', () => ({
  GoalSettingDialog: ({ isOpen, onClose, onGoalCreated, editingGoal }: any) =>
    isOpen ? (
      <div data-testid="goal-setting-dialog">
        <span>Goal Setting Dialog</span>
        <span>Editing: {editingGoal ? 'true' : 'false'}</span>
        <button onClick={onClose}>閉じる</button>
        <button onClick={() => onGoalCreated({ id: 'new-goal' })}>
          目標作成
        </button>
      </div>
    ) : null,
}));

const mockGoals: Goal[] = [
  {
    id: '1',
    user_id: 'test-user',
    title: '週間目標',
    description: '週間のセッション目標',
    type: 'weekly' as const,
    metric: 'sessions' as const,
    target_value: 25,
    current_value: 15,
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-07'),
    tags: null,
    is_active: true,
    achieved_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: '2',
    user_id: 'test-user',
    title: '月間目標',
    description: '月間のセッション目標',
    type: 'monthly' as const,
    metric: 'sessions' as const,
    target_value: 100,
    current_value: 45,
    period_start: new Date('2024-01-01'),
    period_end: new Date('2024-01-31'),
    tags: null,
    is_active: true,
    achieved_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

describe('GoalProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('目標進捗データを正しく表示する', async () => {
    vi.mocked(DatabaseService.getGoals).mockResolvedValue(mockGoals);

    render(<GoalProgress />);

    // ローディング状態の確認
    expect(screen.getByText('目標進捗')).toBeInTheDocument();

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByText('週間目標')).toBeInTheDocument();
    });

    // 週間目標の表示確認
    expect(screen.getByText('進捗: 15 / 25')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();

    // 月間目標の表示確認
    expect(screen.getByText('月間目標')).toBeInTheDocument();
    expect(screen.getByText('進捗: 45 / 100')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('目標達成時に適切なメッセージを表示する', async () => {
    const achievedGoals: Goal[] = [
      {
        ...mockGoals[0],
        current_value: 25,
        achieved_at: new Date('2024-01-05'),
      },
      {
        ...mockGoals[1],
        current_value: 100,
        achieved_at: new Date('2024-01-20'),
      },
    ];

    vi.mocked(DatabaseService.getGoals).mockResolvedValue(achievedGoals);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getAllByText('🎉 目標達成！素晴らしい成果です！')
      ).toHaveLength(2);
    });
  });

  it('進捗率に応じて適切なメッセージを表示する', async () => {
    const progressGoals: Goal[] = [
      {
        ...mockGoals[0],
        current_value: 20, // 80%
      },
      {
        ...mockGoals[1],
        current_value: 60, // 60%
      },
    ];

    vi.mocked(DatabaseService.getGoals).mockResolvedValue(progressGoals);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getByText('💪 もう少しで目標達成です！')
      ).toBeInTheDocument();
    });
  });

  it('低進捗時に適切なメッセージを表示する', async () => {
    const lowProgressGoals: Goal[] = [
      {
        ...mockGoals[0],
        current_value: 5, // 20%
      },
      {
        ...mockGoals[1],
        current_value: 10, // 10%
      },
    ];

    vi.mocked(DatabaseService.getGoals).mockResolvedValue(lowProgressGoals);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(screen.getAllByText('🚀 頑張りましょう！')).toHaveLength(2);
    });
  });

  it('ローディング状態を正しく表示する', () => {
    vi.mocked(DatabaseService.getGoals).mockImplementation(
      () => new Promise(() => {}) // 永続的にpending状態
    );

    render(<GoalProgress />);

    // ローディング状態の確認（animate-pulseクラスを持つ要素の存在確認）
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('エラー状態を正しく表示する', async () => {
    vi.mocked(DatabaseService.getGoals).mockRejectedValue(
      new Error('データ取得エラー')
    );

    render(<GoalProgress />);

    await waitFor(() => {
      expect(
        screen.getByText('目標データの取得に失敗しました')
      ).toBeInTheDocument();
    });
  });

  it('目標設定のヒントを表示する', async () => {
    vi.mocked(DatabaseService.getGoals).mockResolvedValue([]);

    render(<GoalProgress />);

    await waitFor(() => {
      expect(screen.getByText('💡 目標設定のコツ')).toBeInTheDocument();
      expect(
        screen.getByText('達成可能で具体的な目標を設定しましょう')
      ).toBeInTheDocument();
    });
  });

  it('プログレスバーが正しい幅で表示される', async () => {
    vi.mocked(DatabaseService.getGoals).mockResolvedValue(mockGoals);

    render(<GoalProgress />);

    await waitFor(() => {
      const progressBars = document.querySelectorAll('[style*="width"]');
      const progressBarArray = Array.from(progressBars);

      // 週間目標のプログレスバー（60%）
      expect(
        progressBarArray.some(
          (bar: Element) => (bar as HTMLElement).style.width === '60%'
        )
      ).toBe(true);
      // 月間目標のプログレスバー（45%）
      expect(
        progressBarArray.some(
          (bar: Element) => (bar as HTMLElement).style.width === '45%'
        )
      ).toBe(true);
    });
  });
});
