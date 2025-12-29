import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ModeSelectionDialog } from '../mode-selection-dialog';
import { useTimerStore } from '../../../stores/timer-store';

// タイマーストアをモック
vi.mock('../../../stores/timer-store');

const mockUseTimerStore = vi.mocked(useTimerStore);

describe('ModeSelectionDialog', () => {
  const mockSetMode = vi.fn();
  const mockSetShowTaskSelection = vi.fn();
  const mockStartTimer = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseTimerStore.mockReturnValue({
      setMode: mockSetMode,
      setShowTaskSelection: mockSetShowTaskSelection,
      startTimer: mockStartTimer,
    } as any);
  });

  it('モード選択ダイアログが正しく表示される', () => {
    render(<ModeSelectionDialog isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('セッションモードを選択')).toBeInTheDocument();
    expect(screen.getByText('タスクと一緒に開始')).toBeInTheDocument();
    expect(screen.getByText('集中時間として開始')).toBeInTheDocument();
  });

  it('タスクベースモードを選択できる', async () => {
    render(<ModeSelectionDialog isOpen={true} onClose={mockOnClose} />);

    const taskBasedButton = screen.getByTestId('task-based-mode-button');
    fireEvent.click(taskBasedButton);

    await waitFor(() => {
      expect(mockSetMode).toHaveBeenCalledWith('task-based');
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockSetShowTaskSelection).toHaveBeenCalledWith(true);
    });
  });

  it('スタンドアロンモードを選択できる', async () => {
    render(<ModeSelectionDialog isOpen={true} onClose={mockOnClose} />);

    const standaloneButton = screen.getByTestId('standalone-mode-button');
    fireEvent.click(standaloneButton);

    await waitFor(() => {
      expect(mockSetMode).toHaveBeenCalledWith('standalone');
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockStartTimer).toHaveBeenCalled();
    });
  });

  it('閉じるボタンでダイアログを閉じることができる', () => {
    render(<ModeSelectionDialog isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByTestId('close-mode-selection');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('ダイアログが閉じている時は表示されない', () => {
    render(<ModeSelectionDialog isOpen={false} onClose={mockOnClose} />);

    expect(
      screen.queryByText('セッションモードを選択')
    ).not.toBeInTheDocument();
  });
});
