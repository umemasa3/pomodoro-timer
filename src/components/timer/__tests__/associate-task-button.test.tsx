import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AssociateTaskButton } from '../associate-task-button';
import { useTimerStore } from '../../../stores/timer-store';

// タイマーストアをモック
vi.mock('../../../stores/timer-store');

const mockUseTimerStore = vi.mocked(useTimerStore);

describe('AssociateTaskButton', () => {
  const mockSetShowTaskSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTimerStore.mockReturnValue({
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);
  });

  it('スタンドアロンモードで実行中、タスクなしの場合にボタンが表示される', () => {
    mockUseTimerStore.mockReturnValue({
      sessionType: 'pomodoro',
      isRunning: true,
      currentTask: null,
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);

    render(<AssociateTaskButton />);

    expect(screen.getByTestId('associate-task-button')).toBeInTheDocument();
    expect(screen.getByText('タスクを関連付ける')).toBeInTheDocument();
  });

  it('休憩セッションの場合はボタンが表示されない', () => {
    mockUseTimerStore.mockReturnValue({
      sessionType: 'short_break',
      isRunning: true,
      currentTask: null,
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);

    render(<AssociateTaskButton />);

    expect(
      screen.queryByTestId('associate-task-button')
    ).not.toBeInTheDocument();
  });

  it('タスクが既に関連付けられている場合はボタンが表示されない', () => {
    mockUseTimerStore.mockReturnValue({
      sessionType: 'pomodoro',
      isRunning: true,
      currentTask: { id: '1', title: 'テストタスク' },
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);

    render(<AssociateTaskButton />);

    expect(
      screen.queryByTestId('associate-task-button')
    ).not.toBeInTheDocument();
  });

  it('タスクが既に関連付けられている場合はボタンが表示されない', () => {
    mockUseTimerStore.mockReturnValue({
      mode: 'standalone',
      isRunning: true,
      currentTask: { id: '1', title: 'テストタスク' },
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);

    render(<AssociateTaskButton />);

    expect(
      screen.queryByTestId('associate-task-button')
    ).not.toBeInTheDocument();
  });

  it('ボタンクリックでタスク選択ダイアログが開く', () => {
    mockUseTimerStore.mockReturnValue({
      sessionType: 'pomodoro',
      isRunning: true,
      currentTask: null,
      setShowTaskSelection: mockSetShowTaskSelection,
    } as any);

    render(<AssociateTaskButton />);

    const button = screen.getByTestId('associate-task-button');
    fireEvent.click(button);

    expect(mockSetShowTaskSelection).toHaveBeenCalledWith(true);
  });
});
