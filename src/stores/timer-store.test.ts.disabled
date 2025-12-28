import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimerStore } from './timer-store';
import { useAuthStore } from './auth-store';

// モック
vi.mock('./auth-store');

const mockAuthStore = {
  user: {
    settings: {
      pomodoro_minutes: 25,
      short_break_minutes: 5,
      long_break_minutes: 15,
      sessions_until_long_break: 4,
    },
  },
};

describe('TimerStore', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore.getState).mockReturnValue(mockAuthStore);
    // ストアをリセット
    useTimerStore.setState({
      currentTime: 25 * 60,
      isRunning: false,
      sessionType: 'pomodoro',
      completedSessions: 0,
      intervalId: null,
      showBreakSuggestion: false,
      suggestedBreakType: 'short',
      showCompletionNotification: false,
    });
  });

  it('初期状態が正しく設定される', () => {
    const state = useTimerStore.getState();

    expect(state.currentTime).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
    expect(state.sessionType).toBe('pomodoro');
    expect(state.completedSessions).toBe(0);
  });

  it('タイマーをリセットすると初期時間に戻る', () => {
    const { resetTimer } = useTimerStore.getState();

    // 時間を変更
    useTimerStore.setState({ currentTime: 1000 });

    // リセット実行
    resetTimer();

    const state = useTimerStore.getState();
    expect(state.currentTime).toBe(25 * 60);
    expect(state.isRunning).toBe(false);
  });

  it('セッションタイプを変更すると適切な時間が設定される', () => {
    const { updateSessionType } = useTimerStore.getState();

    // 短い休憩に変更
    updateSessionType('short_break');

    let state = useTimerStore.getState();
    expect(state.sessionType).toBe('short_break');
    expect(state.currentTime).toBe(5 * 60);

    // 長い休憩に変更
    updateSessionType('long_break');

    state = useTimerStore.getState();
    expect(state.sessionType).toBe('long_break');
    expect(state.currentTime).toBe(15 * 60);
  });

  it('ポモドーロに切り替えると適切な時間が設定される', () => {
    const { switchToPomodoro } = useTimerStore.getState();

    // 休憩状態から開始
    useTimerStore.setState({ sessionType: 'short_break', currentTime: 300 });

    // ポモドーロに切り替え
    switchToPomodoro();

    const state = useTimerStore.getState();
    expect(state.sessionType).toBe('pomodoro');
    expect(state.currentTime).toBe(25 * 60);
    expect(state.showBreakSuggestion).toBe(false);
  });

  it('休憩に切り替えると適切な時間が設定される', () => {
    const { switchToBreak } = useTimerStore.getState();

    // 短い休憩に切り替え
    switchToBreak('short');

    let state = useTimerStore.getState();
    expect(state.sessionType).toBe('short_break');
    expect(state.currentTime).toBe(5 * 60);
    expect(state.showBreakSuggestion).toBe(false);

    // 長い休憩に切り替え
    switchToBreak('long');

    state = useTimerStore.getState();
    expect(state.sessionType).toBe('long_break');
    expect(state.currentTime).toBe(15 * 60);
  });
});
