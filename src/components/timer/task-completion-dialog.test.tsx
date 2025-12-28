import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCompletionDialog } from './task-completion-dialog';
import { useTimerStore } from '../../stores/timer-store';
import type { Task } from '../../types';

// モック設定
vi.mock('../../stores/timer-store');

const mockTask: Task = {
  id: '1',
  user_id: 'user1',
  title: 'テストタスク',
  description: 'テストタスクの説明',
  estimated_pomodoros: 3,
  completed_pomodoros: 1,
  status: 'in_progress',
  priority: 'medium',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('TaskCompletionDialog', () => {
  const mockCompleteTaskInSession = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useTimerStoreのモック
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      completeTaskInSession: mockCompleteTaskInSession,
    } as ReturnType<typeof useTimerStore>);
  });

  it('ダイアログが開いているときに表示される', () => {
    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    expect(
      screen.getByText('タスクの状態を確認してください')
    ).toBeInTheDocument();
    expect(screen.getByText('テストタスク')).toBeInTheDocument();
  });

  it('ダイアログが閉じているときに表示されない', () => {
    render(<TaskCompletionDialog isOpen={false} onClose={mockOnClose} />);

    expect(
      screen.queryByText('タスクの状態を確認してください')
    ).not.toBeInTheDocument();
  });

  it('完了ボタンが機能する', async () => {
    mockCompleteTaskInSession.mockResolvedValue(undefined);

    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('完了'));

    await waitFor(() => {
      expect(mockCompleteTaskInSession).toHaveBeenCalledWith('completed');
    });
  });

  it('継続ボタンが機能する', async () => {
    mockCompleteTaskInSession.mockResolvedValue(undefined);

    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('継続'));

    await waitFor(() => {
      expect(mockCompleteTaskInSession).toHaveBeenCalledWith('continued');
    });
  });

  it('一時停止ボタンが機能する', async () => {
    mockCompleteTaskInSession.mockResolvedValue(undefined);

    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByText('一時停止'));

    await waitFor(() => {
      expect(mockCompleteTaskInSession).toHaveBeenCalledWith('paused');
    });
  });

  it('進捗情報が正しく表示される', () => {
    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('進捗: 2/3 ポモドーロ')).toBeInTheDocument();
  });

  it('カウントダウンが表示される', () => {
    render(<TaskCompletionDialog isOpen={true} onClose={mockOnClose} />);

    expect(
      screen.getByText(/秒後に自動的に「継続」が選択されます/)
    ).toBeInTheDocument();
  });
});
