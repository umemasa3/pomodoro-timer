import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentTaskDisplay } from './current-task-display';
import { useTimerStore } from '../../stores/timer-store';
import type { Task } from '../../types';

// モック設定
vi.mock('../../stores/timer-store');

const mockTask: Task = {
  id: '1',
  user_id: 'user1',
  title: 'テストタスク',
  description: 'テストタスクの説明',
  estimated_pomodoros: 4,
  completed_pomodoros: 2,
  status: 'in_progress',
  priority: 'medium',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('CurrentTaskDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ポモドーロセッション中でタスクが選択されている場合に表示される', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      sessionType: 'pomodoro',
      isRunning: true,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.getByText('現在のタスク')).toBeInTheDocument();
    expect(screen.getByText('テストタスク')).toBeInTheDocument();
    expect(screen.getByText('テストタスクの説明')).toBeInTheDocument();
  });

  it('休憩セッション中は表示されない', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      sessionType: 'short_break',
      isRunning: false,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.queryByText('現在のタスク')).not.toBeInTheDocument();
  });

  it('タスクが選択されていない場合は表示されない', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: null,
      sessionType: 'pomodoro',
      isRunning: false,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.queryByText('現在のタスク')).not.toBeInTheDocument();
  });

  it('進捗情報が正しく表示される', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      sessionType: 'pomodoro',
      isRunning: false,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('セッション実行中のインジケーターが表示される', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      sessionType: 'pomodoro',
      isRunning: true,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.getByText('セッション実行中')).toBeInTheDocument();
  });

  it('セッション停止中はインジケーターが表示されない', () => {
    vi.mocked(useTimerStore).mockReturnValue({
      currentTask: mockTask,
      sessionType: 'pomodoro',
      isRunning: false,
    } as ReturnType<typeof useTimerStore>);

    render(<CurrentTaskDisplay />);

    expect(screen.queryByText('セッション実行中')).not.toBeInTheDocument();
  });
});
