import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimerComponent } from './timer-component';
import { useTimerStore } from '../../stores/timer-store';
import { useAuthStore } from '../../stores/auth-store';

// モックストア
vi.mock('../../stores/timer-store');
vi.mock('../../stores/auth-store');

const mockTimerStore = {
  currentTime: 1500, // 25分
  isRunning: false,
  sessionType: 'pomodoro' as const,
  completedSessions: 0,
  showBreakSuggestion: false,
  suggestedBreakType: 'short' as const,
  showCompletionNotification: false,
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resetTimer: vi.fn(),
  initializeTimer: vi.fn(),
  switchToBreak: vi.fn(),
  switchToPomodoro: vi.fn(),
  setShowBreakSuggestion: vi.fn(),
  setShowCompletionNotification: vi.fn(),
};

const mockAuthStore = {
  user: {
    id: 'test-user',
    email: 'test@example.com',
    settings: {
      pomodoro_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      sessions_until_long_break: 4,
      sound_enabled: true,
      sound_type: 'bell' as const,
      theme: 'auto' as const,
      notifications: {
        desktop: true,
        sound: true,
        vibration: false,
      },
    },
  },
};

describe('TimerComponent', () => {
  beforeEach(() => {
    vi.mocked(useTimerStore).mockReturnValue(mockTimerStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
  });

  it('タイマーが正しく表示される', () => {
    render(<TimerComponent />);

    // タイマー表示の確認
    expect(screen.getByText('25:00')).toBeInTheDocument();
    expect(screen.getByText('ポモドーロ')).toBeInTheDocument();
  });

  it('開始ボタンをクリックするとstartTimerが呼ばれる', () => {
    render(<TimerComponent />);

    const startButton = screen.getByText('開始');
    fireEvent.click(startButton);

    expect(mockTimerStore.startTimer).toHaveBeenCalled();
  });

  it('リセットボタンをクリックするとresetTimerが呼ばれる', () => {
    render(<TimerComponent />);

    const resetButton = screen.getByText('リセット');
    fireEvent.click(resetButton);

    expect(mockTimerStore.resetTimer).toHaveBeenCalled();
  });

  it('タイマー実行中は一時停止ボタンが表示される', () => {
    const runningStore = { ...mockTimerStore, isRunning: true };
    vi.mocked(useTimerStore).mockReturnValue(runningStore);

    render(<TimerComponent />);

    expect(screen.getByText('一時停止')).toBeInTheDocument();
  });

  it('完了セッション数が正しく表示される', () => {
    const storeWithSessions = { ...mockTimerStore, completedSessions: 3 };
    vi.mocked(useTimerStore).mockReturnValue(storeWithSessions);

    render(<TimerComponent />);

    expect(screen.getByText('完了セッション: 3')).toBeInTheDocument();
  });
});
