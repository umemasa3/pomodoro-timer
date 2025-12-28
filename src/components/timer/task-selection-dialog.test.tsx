import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskSelectionDialog } from './task-selection-dialog';
import { useTimerStore } from '../../stores/timer-store';
import { DatabaseService } from '../../services/database-service';
import type { Task } from '../../types';

// モック設定
vi.mock('../../stores/timer-store');
vi.mock('../../services/database-service');

const mockTasks: Task[] = [
  {
    id: '1',
    user_id: 'user1',
    title: 'テストタスク1',
    description: 'テストタスクの説明1',
    estimated_pomodoros: 3,
    completed_pomodoros: 1,
    status: 'in_progress',
    priority: 'medium',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'user1',
    title: 'テストタスク2',
    description: 'テストタスクの説明2',
    estimated_pomodoros: 2,
    completed_pomodoros: 0,
    status: 'pending',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('TaskSelectionDialog', () => {
  const mockSetCurrentTask = vi.fn();
  const mockStartTimer = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useTimerStoreのモック
    vi.mocked(useTimerStore).mockReturnValue({
      setCurrentTask: mockSetCurrentTask,
      startTimer: mockStartTimer,
      // その他の必要なプロパティは省略
    } as ReturnType<typeof useTimerStore>);

    // DatabaseServiceのモック
    const mockDatabaseService = {
      getTasks: vi.fn().mockResolvedValue(mockTasks),
    };
    vi.mocked(DatabaseService.getInstance).mockReturnValue(
      mockDatabaseService as ReturnType<typeof DatabaseService.getInstance>
    );
  });

  it('ダイアログが開いているときに表示される', () => {
    render(<TaskSelectionDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('タスクを選択してください')).toBeInTheDocument();
  });

  it('ダイアログが閉じているときに表示されない', () => {
    render(<TaskSelectionDialog isOpen={false} onClose={mockOnClose} />);

    expect(
      screen.queryByText('タスクを選択してください')
    ).not.toBeInTheDocument();
  });

  it('タスク一覧が表示される', async () => {
    render(<TaskSelectionDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('テストタスク1 (1/3 ポモドーロ)')
      ).toBeInTheDocument();
    });
  });

  it('選択したタスクで開始ボタンが機能する', async () => {
    render(<TaskSelectionDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('選択したタスクで開始')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('選択したタスクで開始'));

    expect(mockSetCurrentTask).toHaveBeenCalledWith(mockTasks[0]);
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockStartTimer).toHaveBeenCalled();
  });

  it('タスクなしで開始ボタンが機能する', async () => {
    render(<TaskSelectionDialog isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('タスクなしで開始')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('タスクなしで開始'));

    expect(mockSetCurrentTask).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockStartTimer).toHaveBeenCalled();
  });

  it('キャンセルボタンが機能する', async () => {
    render(<TaskSelectionDialog isOpen={true} onClose={mockOnClose} />);

    // ローディングが完了するまで待機
    await waitFor(() => {
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('キャンセル'));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockSetCurrentTask).not.toHaveBeenCalled();
    expect(mockStartTimer).not.toHaveBeenCalled();
  });
});
