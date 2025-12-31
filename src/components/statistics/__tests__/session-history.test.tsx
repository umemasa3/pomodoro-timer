import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { SessionHistory } from '../session-history';
import { DatabaseService } from '../../../services/database-service';
import type { Session } from '../../../types';

// DatabaseServiceをモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    getSessions: vi.fn(),
  },
}));

const mockSessions: Session[] = [
  {
    id: '1',
    user_id: 'user1',
    task_id: 'task1',
    type: 'pomodoro',
    planned_duration: 1500,
    actual_duration: 1500,
    completed: true,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    mode: 'task-based',
  },
  {
    id: '2',
    user_id: 'user1',
    type: 'pomodoro',
    planned_duration: 1500,
    actual_duration: 1200,
    completed: true,
    started_at: new Date(Date.now() - 86400000).toISOString(), // 1日前
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    mode: 'standalone',
    session_name: '集中時間',
  },
  {
    id: '3',
    user_id: 'user1',
    type: 'short_break',
    planned_duration: 300,
    actual_duration: 300,
    completed: true,
    started_at: new Date(Date.now() - 3600000).toISOString(), // 1時間前
    completed_at: new Date(Date.now() - 3600000).toISOString(),
    mode: 'standalone',
    session_name: '短い休憩',
  },
];

describe('SessionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('セッション履歴を正常に表示する', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue(mockSessions);

    render(<SessionHistory />);

    // ローディング状態を確認
    expect(screen.getByText('セッション履歴')).toBeInTheDocument();

    // データが読み込まれるまで待機
    await waitFor(() => {
      expect(screen.getAllByTestId('session-history-item')).toHaveLength(3);
    });

    // セッション情報が表示されることを確認
    expect(screen.getAllByText('ポモドーロ')).toHaveLength(3); // セッション2つ + 統計サマリー1つ
    expect(screen.getAllByText('短い休憩')).toHaveLength(3); // セッション1つ + 統計サマリー1つ + 追加表示
  });

  it('スタンドアロンセッションのモード表示を確認する', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue(mockSessions);

    render(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getAllByTestId('session-history-item')).toHaveLength(3);
    });

    // スタンドアロンモードのバッジが表示されることを確認
    const standaloneBadges = screen.getAllByText('スタンドアロン');
    expect(standaloneBadges).toHaveLength(2); // 2つのスタンドアロンセッション
  });

  it('セッション名が正しく表示される', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue(mockSessions);

    render(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getAllByTestId('session-history-item')).toHaveLength(3);
    });

    // セッション名の表示を確認
    const sessionNames = screen.getAllByTestId('session-task-name');
    expect(sessionNames).toHaveLength(3);

    // スタンドアロンセッションの名前が表示されることを確認
    expect(screen.getByText('集中時間')).toBeInTheDocument();
    expect(screen.getAllByText('短い休憩')).toHaveLength(3); // セッション名1つ + セッションタイプ1つ + 追加表示
    expect(screen.getByText('タスク関連セッション')).toBeInTheDocument();
  });

  it('セッションがない場合の表示を確認する', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue([]);

    render(<SessionHistory />);

    await waitFor(() => {
      expect(
        screen.getByText('まだセッション履歴がありません')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('最初のポモドーロセッションを開始してみましょう！')
    ).toBeInTheDocument();
  });

  it('エラー状態を正しく表示する', async () => {
    const errorMessage = 'データベース接続エラー';
    (DatabaseService.getSessions as any).mockRejectedValue(
      new Error(errorMessage)
    );

    render(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('統計サマリーが正しく表示される', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue(mockSessions);

    render(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getAllByTestId('session-history-item')).toHaveLength(3);
    });

    // 統計サマリーの数値を確認
    expect(screen.getByText('2')).toBeInTheDocument(); // ポモドーロセッション数
    expect(screen.getByText('1')).toBeInTheDocument(); // 短い休憩セッション数
    expect(screen.getByText('0')).toBeInTheDocument(); // 長い休憩セッション数
  });

  it('時間フォーマットが正しく表示される', async () => {
    (DatabaseService.getSessions as any).mockResolvedValue(mockSessions);

    render(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getAllByTestId('session-history-item')).toHaveLength(3);
    });

    // 時間の表示を確認
    expect(screen.getByText('25分')).toBeInTheDocument(); // 1500秒 = 25分
    expect(screen.getByText('20分')).toBeInTheDocument(); // 1200秒 = 20分
    expect(screen.getByText('5分')).toBeInTheDocument(); // 300秒 = 5分
  });
});
