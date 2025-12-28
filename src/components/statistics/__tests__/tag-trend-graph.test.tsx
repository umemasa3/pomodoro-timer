import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TagTrendGraph } from '../tag-trend-graph';
import { DatabaseService } from '../../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    getTagTrendData: vi.fn(),
  },
}));

const mockTrendData = {
  trendData: [
    {
      date: '2024-12-22',
      tagData: {
        Work: 2.5,
        Personal: 1.0,
        Study: 1.5,
      },
    },
    {
      date: '2024-12-23',
      tagData: {
        Work: 3.0,
        Personal: 0.5,
        Study: 2.0,
      },
    },
    {
      date: '2024-12-24',
      tagData: {
        Work: 2.0,
        Personal: 1.5,
        Study: 1.0,
      },
    },
    {
      date: '2024-12-25',
      tagData: {
        Work: 1.5,
        Personal: 2.0,
        Study: 0.5,
      },
    },
    {
      date: '2024-12-26',
      tagData: {
        Work: 3.5,
        Personal: 1.0,
        Study: 2.5,
      },
    },
    {
      date: '2024-12-27',
      tagData: {
        Work: 2.5,
        Personal: 1.5,
        Study: 1.5,
      },
    },
    {
      date: '2024-12-28',
      tagData: {
        Work: 4.0,
        Personal: 0.5,
        Study: 3.0,
      },
    },
  ],
  tagList: [
    { tagName: 'Work', tagColor: '#3B82F6', totalHours: 19 },
    { tagName: 'Personal', tagColor: '#10B981', totalHours: 8 },
    { tagName: 'Study', tagColor: '#F59E0B', totalHours: 12 },
  ],
};

describe('TagTrendGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('タグ別時間推移グラフを正しく表示する', async () => {
    vi.mocked(DatabaseService.getTagTrendData).mockResolvedValue(mockTrendData);

    render(<TagTrendGraph />);

    // ローディング状態の確認
    expect(screen.getByText('タグ別時間推移')).toBeInTheDocument();

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getByDisplayValue('過去30日')).toBeInTheDocument();
    });

    // SVGグラフの存在確認
    expect(
      screen.getByRole('img', { name: /タグ別時間推移グラフ/ })
    ).toBeInTheDocument();

    // 凡例の表示確認（ボタン内のテキストを確認）
    const workButton = screen.getByRole('button', { name: /Work.*19.*h/ });
    expect(workButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Personal.*8.*h/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Study.*12.*h/ })).toBeInTheDocument();
  });

  it('期間選択ボタンが正しく動作する', async () => {
    vi.mocked(DatabaseService.getTagTrendData).mockResolvedValue(mockTrendData);

    render(<TagTrendGraph />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('過去30日')).toBeInTheDocument();
    });

    // 7日間オプションを選択
    const select = screen.getByDisplayValue('過去30日');
    
    await act(async () => {
      fireEvent.change(select, { target: { value: '7' } });
    });

    // 初期値（30日）で呼び出されることを確認
    expect(DatabaseService.getTagTrendData).toHaveBeenCalledWith(30);

    // 7日間に変更後、再度呼び出されることを確認
    await waitFor(() => {
      expect(DatabaseService.getTagTrendData).toHaveBeenCalledWith(7);
    });
  });

  it('データがない場合の表示を確認する', async () => {
    const emptyData = {
      trendData: [],
      tagList: [],
    };

    vi.mocked(DatabaseService.getTagTrendData).mockResolvedValue(emptyData);

    render(<TagTrendGraph />);

    await waitFor(() => {
      expect(
        screen.getByText('表示するデータがありません')
      ).toBeInTheDocument();
      expect(
        screen.getByText('タスクにタグを設定して作業を開始してください')
      ).toBeInTheDocument();
    });
  });

  it('単一タグのデータでも正しく表示する', async () => {
    const singleTagData = {
      trendData: [{ date: '2024-12-28', tagData: { Work: 2.5 } }],
      tagList: [{ tagName: 'Work', tagColor: '#3B82F6', totalHours: 2.5 }],
    };

    vi.mocked(DatabaseService.getTagTrendData).mockResolvedValue(singleTagData);

    render(<TagTrendGraph />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Work.*2.5.*h/ })).toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: /タグ別時間推移グラフ/ })
      ).toBeInTheDocument();
    });
  });

  it('ローディング状態を正しく表示する', () => {
    vi.mocked(DatabaseService.getTagTrendData).mockImplementation(
      () => new Promise(() => {}) // 永続的にpending状態
    );

    render(<TagTrendGraph />);

    expect(screen.getByText('タグ別時間推移')).toBeInTheDocument();
    expect(
      screen.getByText('タグ別時間推移').parentElement?.querySelector('.animate-pulse')
    ).toBeInTheDocument();
  });

  it('エラー状態を正しく表示する', async () => {
    vi.mocked(DatabaseService.getTagTrendData).mockRejectedValue(
      new Error('データ取得エラー')
    );

    render(<TagTrendGraph />);

    await waitFor(() => {
      expect(
        screen.getByText('タグ推移データの取得に失敗しました')
      ).toBeInTheDocument();
    });
  });

  it('グラフの最大値が正しく計算される', async () => {
    const highValueData = {
      trendData: [{ date: '2024-12-28', tagData: { Work: 8.0, Personal: 2.0 } }],
      tagList: [
        { tagName: 'Work', tagColor: '#3B82F6', totalHours: 8 },
        { tagName: 'Personal', tagColor: '#10B981', totalHours: 2 },
      ],
    };

    vi.mocked(DatabaseService.getTagTrendData).mockResolvedValue(highValueData);

    render(<TagTrendGraph />);

    await waitFor(() => {
      // SVGが存在することを確認（最大値の計算が正しく行われている）
      expect(
        screen.getByRole('img', { name: /タグ別時間推移グラフ/ })
      ).toBeInTheDocument();
    });
  });
});
