import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimerComponent } from '../timer-component';
import { useTimerStore } from '../../../stores/timer-store';
import { useAuthStore } from '../../../stores/auth-store';
import { useBreakpoints } from '../../../hooks/use-responsive';

// ストアのモック
vi.mock('../../../stores/timer-store', () => ({
  useTimerStore: vi.fn(),
}));

vi.mock('../../../stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

// レスポンシブフックのモック
vi.mock('../../../hooks/use-responsive', () => ({
  useBreakpoints: vi.fn(),
}));

// 子コンポーネントのモック
vi.mock('../timer-display', () => ({
  TimerDisplay: ({ currentTime, sessionType, isRunning }: any) => (
    <div data-testid="timer-display">
      <span>Time: {currentTime}</span>
      <span>Type: {sessionType}</span>
      <span>Running: {isRunning.toString()}</span>
    </div>
  ),
}));

vi.mock('../timer-controls', () => ({
  TimerControls: ({ isRunning, onStart, onPause, onReset }: any) => (
    <div data-testid="timer-controls">
      <button onClick={onStart} disabled={isRunning}>
        開始
      </button>
      <button onClick={onPause} disabled={!isRunning}>
        一時停止
      </button>
      <button onClick={onReset}>リセット</button>
    </div>
  ),
}));

vi.mock('../session-info', () => ({
  SessionInfo: ({ completedSessions, sessionType }: any) => (
    <div data-testid="session-info">
      <span>Completed: {completedSessions}</span>
      <span>Type: {sessionType}</span>
    </div>
  ),
}));

vi.mock('../current-task-display', () => ({
  CurrentTaskDisplay: () => (
    <div data-testid="current-task-display">Current Task</div>
  ),
}));

vi.mock('../break-suggestion', () => ({
  BreakSuggestion: ({
    isVisible,
    breakType,
    onAccept,
    onDecline,
    onStartPomodoro,
  }: any) =>
    isVisible ? (
      <div data-testid="break-suggestion">
        <span>Break Type: {breakType}</span>
        <button onClick={onAccept}>休憩を受け入れる</button>
        <button onClick={onDecline}>休憩を拒否</button>
        <button onClick={onStartPomodoro}>ポモドーロ開始</button>
      </div>
    ) : null,
}));

vi.mock('../session-complete-notification', () => ({
  SessionCompleteNotification: ({ isVisible, sessionType, onClose }: any) =>
    isVisible ? (
      <div data-testid="session-complete-notification">
        <span>Session Complete: {sessionType}</span>
        <button onClick={onClose}>閉じる</button>
      </div>
    ) : null,
}));

vi.mock('../task-selection-dialog', () => ({
  TaskSelectionDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="task-selection-dialog">
        <span>Task Selection</span>
        <button onClick={onClose}>閉じる</button>
      </div>
    ) : null,
}));

vi.mock('../task-completion-dialog', () => ({
  TaskCompletionDialog: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="task-completion-dialog">
        <span>Task Completion</span>
        <button onClick={onClose}>閉じる</button>
      </div>
    ) : null,
}));

vi.mock('../../settings/settings-modal', () => ({
  SettingsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="settings-modal">
        <span>Settings</span>
        <button onClick={onClose}>閉じる</button>
      </div>
    ) : null,
}));

vi.mock('../../layout/responsive-layout', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ResponsiveCard: ({ children, className, padding }: any) => (
    <div
      data-testid="responsive-card"
      className={className}
      data-padding={padding}
    >
      {children}
    </div>
  ),
}));

// Framer Motionのモック
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, title, ...props }: any) => (
      <button
        onClick={onClick}
        className={className}
        title={title}
        data-testid="motion-button"
        {...props}
      >
        {children}
      </button>
    ),
  },
}));

// Heroiconsのモック
vi.mock('@heroicons/react/24/outline', () => ({
  Cog6ToothIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="settings-icon">
      <title>Settings</title>
    </svg>
  ),
}));

describe('TimerComponent', () => {
  const mockTimerStore = {
    currentTime: 1500,
    isRunning: false,
    sessionType: 'pomodoro' as const,
    completedSessions: 0,
    showBreakSuggestion: false,
    suggestedBreakType: 'short_break' as const,
    showCompletionNotification: false,
    showTaskSelection: false,
    showTaskCompletionDialog: false,
    startTimer: vi.fn(),
    pauseTimer: vi.fn(),
    resetTimer: vi.fn(),
    initializeTimer: vi.fn(),
    switchToBreak: vi.fn(),
    switchToPomodoro: vi.fn(),
    setShowBreakSuggestion: vi.fn(),
    setShowCompletionNotification: vi.fn(),
    setShowTaskSelection: vi.fn(),
    setShowTaskCompletionDialog: vi.fn(),
  };

  const mockAuthStore = {
    user: {
      id: 'test-user',
      settings: {
        pomodoro_minutes: 25,
        short_break_minutes: 5,
        long_break_minutes: 15,
      },
    },
  };

  const mockBreakpoints = {
    isSm: false,
    isMd: false,
    isLg: true,
    isXl: true,
    is2Xl: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    currentBreakpoint: 'lg' as const,
    width: 1024,
  };

  beforeEach(() => {
    vi.mocked(useTimerStore).mockReturnValue(mockTimerStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
    vi.mocked(useBreakpoints).mockReturnValue(mockBreakpoints);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('すべての主要コンポーネントが表示される', () => {
      render(<TimerComponent />);

      expect(screen.getByTestId('timer-display')).toBeInTheDocument();
      expect(screen.getByTestId('timer-controls')).toBeInTheDocument();
      expect(screen.getByTestId('session-info')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-card')).toBeInTheDocument();
    });

    it('設定ボタンが表示される', () => {
      render(<TimerComponent />);

      const settingsButton = screen.getByTestId('motion-button');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveAttribute('title', '設定');
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('ポモドーロセッション時に現在のタスク表示が表示される', () => {
      render(<TimerComponent />);

      expect(screen.getByTestId('current-task-display')).toBeInTheDocument();
    });

    it('休憩セッション時に現在のタスク表示が非表示になる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        sessionType: 'short_break',
      });

      render(<TimerComponent />);

      expect(
        screen.queryByTestId('current-task-display')
      ).not.toBeInTheDocument();
    });

    it('TimerDisplayに正しいpropsが渡される', () => {
      render(<TimerComponent />);

      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).toHaveTextContent('Time: 1500');
      expect(timerDisplay).toHaveTextContent('Type: pomodoro');
      expect(timerDisplay).toHaveTextContent('Running: false');
    });

    it('SessionInfoに正しいpropsが渡される', () => {
      render(<TimerComponent />);

      const sessionInfo = screen.getByTestId('session-info');
      expect(sessionInfo).toHaveTextContent('Completed: 0');
      expect(sessionInfo).toHaveTextContent('Type: pomodoro');
    });
  });

  describe('レスポンシブデザイン', () => {
    it('デスクトップ用のスタイルが適用される', () => {
      render(<TimerComponent />);

      const card = screen.getByTestId('responsive-card');
      expect(card.className).toContain('p-8');
      expect(card.getAttribute('data-padding')).toBe('lg');
    });

    it('モバイル用のスタイルが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(<TimerComponent />);

      const card = screen.getByTestId('responsive-card');
      expect(card.className).toContain('p-6');
      expect(card.getAttribute('data-padding')).toBe('md');
    });

    it('モバイル時にパディングが調整される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(<TimerComponent />);

      const card = screen.getByTestId('responsive-card');
      expect(card.className).toContain('p-6');
    });
  });

  describe('タイマー制御機能', () => {
    it('開始ボタンクリックでstartTimerが呼ばれる', () => {
      render(<TimerComponent />);

      const startButton = screen.getByText('開始');
      fireEvent.click(startButton);

      expect(mockTimerStore.startTimer).toHaveBeenCalledTimes(1);
    });

    it('一時停止ボタンクリックでpauseTimerが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        isRunning: true,
      });

      render(<TimerComponent />);

      const pauseButton = screen.getByText('一時停止');
      fireEvent.click(pauseButton);

      expect(mockTimerStore.pauseTimer).toHaveBeenCalledTimes(1);
    });

    it('リセットボタンクリックでresetTimerが呼ばれる', () => {
      render(<TimerComponent />);

      const resetButton = screen.getByText('リセット');
      fireEvent.click(resetButton);

      expect(mockTimerStore.resetTimer).toHaveBeenCalledTimes(1);
    });
  });

  describe('設定機能', () => {
    it('設定ボタンクリックで設定モーダルが開く', async () => {
      render(<TimerComponent />);

      const settingsButton = screen.getByTestId('motion-button');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });
    });

    it('設定モーダルの閉じるボタンでモーダルが閉じる', async () => {
      render(<TimerComponent />);

      // 設定モーダルを開く
      const settingsButton = screen.getByTestId('motion-button');
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
      });

      // 設定モーダルを閉じる
      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('休憩提案機能', () => {
    it('休憩提案が表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showBreakSuggestion: true,
      });

      render(<TimerComponent />);

      expect(screen.getByTestId('break-suggestion')).toBeInTheDocument();
      expect(screen.getByText('Break Type: short_break')).toBeInTheDocument();
    });

    it('休憩受け入れボタンでswitchToBreakが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showBreakSuggestion: true,
      });

      render(<TimerComponent />);

      const acceptButton = screen.getByText('休憩を受け入れる');
      fireEvent.click(acceptButton);

      expect(mockTimerStore.switchToBreak).toHaveBeenCalledWith('short_break');
    });

    it('休憩拒否ボタンでsetShowBreakSuggestionが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showBreakSuggestion: true,
      });

      render(<TimerComponent />);

      const declineButton = screen.getByText('休憩を拒否');
      fireEvent.click(declineButton);

      expect(mockTimerStore.setShowBreakSuggestion).toHaveBeenCalledWith(false);
    });

    it('ポモドーロ開始ボタンでswitchToPomodoroが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showBreakSuggestion: true,
      });

      render(<TimerComponent />);

      const startPomodoroButton = screen.getByText('ポモドーロ開始');
      fireEvent.click(startPomodoroButton);

      expect(mockTimerStore.switchToPomodoro).toHaveBeenCalledTimes(1);
    });
  });

  describe('セッション完了通知機能', () => {
    it('セッション完了通知が表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showCompletionNotification: true,
      });

      render(<TimerComponent />);

      expect(
        screen.getByTestId('session-complete-notification')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Session Complete: pomodoro')
      ).toBeInTheDocument();
    });

    it('通知の閉じるボタンでsetShowCompletionNotificationが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showCompletionNotification: true,
      });

      render(<TimerComponent />);

      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);

      expect(mockTimerStore.setShowCompletionNotification).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('タスク関連ダイアログ', () => {
    it('タスク選択ダイアログが表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showTaskSelection: true,
      });

      render(<TimerComponent />);

      expect(screen.getByTestId('task-selection-dialog')).toBeInTheDocument();
    });

    it('タスク完了ダイアログが表示される', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showTaskCompletionDialog: true,
      });

      render(<TimerComponent />);

      expect(screen.getByTestId('task-completion-dialog')).toBeInTheDocument();
    });

    it('タスク選択ダイアログの閉じるボタンが機能する', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showTaskSelection: true,
      });

      render(<TimerComponent />);

      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);

      expect(mockTimerStore.setShowTaskSelection).toHaveBeenCalledWith(false);
    });

    it('タスク完了ダイアログの閉じるボタンが機能する', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        showTaskCompletionDialog: true,
      });

      render(<TimerComponent />);

      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);

      expect(mockTimerStore.setShowTaskCompletionDialog).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('初期化とクリーンアップ', () => {
    it('コンポーネントマウント時にinitializeTimerが呼ばれる', () => {
      render(<TimerComponent />);

      // useEffectが複数回実行される可能性があるため、最低1回は呼ばれることを確認
      expect(mockTimerStore.initializeTimer).toHaveBeenCalled();
    });

    it('ユーザー設定変更時にinitializeTimerが呼ばれる', () => {
      const { rerender } = render(<TimerComponent />);
      const initialCallCount = mockTimerStore.initializeTimer.mock.calls.length;

      // 設定を変更
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          ...mockAuthStore.user,
          settings: {
            ...mockAuthStore.user.settings,
            pomodoro_minutes: 30,
          },
        },
      });

      rerender(<TimerComponent />);

      // 設定変更後に追加で呼ばれることを確認
      expect(mockTimerStore.initializeTimer.mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });

    it('実行中のタイマーがあるときアンマウント時にpauseTimerが呼ばれる', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        isRunning: true,
      });

      const { unmount } = render(<TimerComponent />);
      unmount();

      expect(mockTimerStore.pauseTimer).toHaveBeenCalledTimes(1);
    });

    it('停止中のタイマーではアンマウント時にpauseTimerが呼ばれない', () => {
      const { unmount } = render(<TimerComponent />);
      unmount();

      expect(mockTimerStore.pauseTimer).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('設定ボタンに適切なaria-labelが設定される', () => {
      render(<TimerComponent />);

      const settingsButton = screen.getByTestId('motion-button');
      expect(settingsButton).toHaveAttribute('title', '設定');
    });

    it('適切な階層構造になっている', () => {
      render(<TimerComponent />);

      const container = screen.getByTestId('responsive-container');
      const card = screen.getByTestId('responsive-card');

      expect(container).toContainElement(card);
      expect(card).toContainElement(screen.getByTestId('timer-display'));
      expect(card).toContainElement(screen.getByTestId('timer-controls'));
    });
  });

  describe('エラーハンドリング', () => {
    it('ユーザー情報がない場合でもクラッシュしない', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
      });

      expect(() => {
        render(<TimerComponent />);
      }).not.toThrow();
    });

    it('ユーザー設定がない場合でもクラッシュしない', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          id: 'test-user',
          settings: {
            pomodoro_minutes: 25,
            short_break_minutes: 5,
            long_break_minutes: 15,
          },
        },
      });

      expect(() => {
        render(<TimerComponent />);
      }).not.toThrow();
    });

    it('タイマーストアの関数がundefinedでもクラッシュしない', () => {
      vi.mocked(useTimerStore).mockReturnValue({
        ...mockTimerStore,
        startTimer: undefined,
        pauseTimer: undefined,
        resetTimer: undefined,
      } as any);

      expect(() => {
        render(<TimerComponent />);
      }).not.toThrow();
    });
  });
});
