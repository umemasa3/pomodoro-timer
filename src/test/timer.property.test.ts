import { describe, test, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { useTimerStore } from '../stores/timer-store';
import { useAuthStore } from '../stores/auth-store';
import {
  propertyTestConfig,
  userSettingsArbitrary,
  timeHelpers,
} from './property-test-setup';

/**
 * タイマー機能のプロパティベーステスト
 * Feature: pomodoro-timer, Timer Functionality Properties
 */

describe('タイマー機能のプロパティテスト', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useTimerStore.getState().resetTimer();
    useTimerStore.getState().initializeTimer();

    // モックタイマーをクリア
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  test('プロパティ 1: タイマー開始の一貫性', () => {
    // **Feature: pomodoro-timer, Property 1: タイマー開始の一貫性**
    // **検証対象: 要件 1.1**

    fc.assert(
      fc.property(userSettingsArbitrary, userSettings => {
        // ユーザー設定をモック
        const mockUser = {
          id: 'test-user-id',
          email: 'test@example.com',
          display_name: 'Test User',
          timezone: 'UTC',
          settings: userSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 認証ストアにモックユーザーを設定
        useAuthStore.setState({ user: mockUser });

        // タイマーを初期化
        const timerStore = useTimerStore.getState();
        timerStore.initializeTimer();

        // 初期状態を取得
        const initialState = useTimerStore.getState();

        // タイマーを開始
        timerStore.startTimer();

        // 開始後の状態を取得
        const afterStartState = useTimerStore.getState();

        // プロパティ検証：任意のタイマー状態において、開始操作を実行すると、
        // システムは設定された時間（デフォルト25分）でカウントダウンを開始する
        const expectedDuration = timeHelpers.minutesToSeconds(
          userSettings.pomodoro_minutes
        );

        return (
          // 初期時間が設定値と一致する
          initialState.currentTime === expectedDuration &&
          // 開始後にisRunningがtrueになる
          afterStartState.isRunning === true &&
          // セッションタイプがポモドーロである
          afterStartState.sessionType === 'pomodoro' &&
          // 時間が変更されていない（まだカウントダウンは始まっていない）
          afterStartState.currentTime === expectedDuration &&
          // インターバルIDが設定されている
          afterStartState.intervalId !== null
        );
      }),
      {
        ...propertyTestConfig,
        // タイマー関連のテストは時間がかかる可能性があるため、実行回数を調整
        numRuns: 50,
      }
    );
  });

  test('プロパティ 1-補足: タイマー開始時の状態遷移の一貫性', () => {
    // **Feature: pomodoro-timer, Property 1: タイマー開始の一貫性（補足）**
    // **検証対象: 要件 1.1**

    fc.assert(
      fc.property(
        userSettingsArbitrary,
        fc.constantFrom('pomodoro', 'short_break', 'long_break'),
        (userSettings, sessionType) => {
          // ユーザー設定をモック
          const mockUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            display_name: 'Test User',
            timezone: 'UTC',
            settings: userSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 認証ストアにモックユーザーを設定
          useAuthStore.setState({ user: mockUser });

          const timerStore = useTimerStore.getState();

          // セッションタイプを設定
          timerStore.updateSessionType(sessionType);

          // 初期状態を取得
          const initialState = useTimerStore.getState();

          // 期待される時間を計算
          let expectedDuration: number;
          if (sessionType === 'pomodoro') {
            expectedDuration = timeHelpers.minutesToSeconds(
              userSettings.pomodoro_minutes
            );
          } else if (sessionType === 'short_break') {
            expectedDuration = timeHelpers.minutesToSeconds(
              userSettings.short_break_minutes
            );
          } else {
            expectedDuration = timeHelpers.minutesToSeconds(
              userSettings.long_break_minutes
            );
          }

          // タイマーを開始
          timerStore.startTimer();

          // 開始後の状態を取得
          const afterStartState = useTimerStore.getState();

          // プロパティ検証：任意のセッションタイプにおいて、開始操作を実行すると、
          // システムは対応する設定時間でカウントダウンを開始する
          return (
            // 初期時間が設定値と一致する
            initialState.currentTime === expectedDuration &&
            // セッションタイプが正しく設定されている
            initialState.sessionType === sessionType &&
            // 開始後にisRunningがtrueになる
            afterStartState.isRunning === true &&
            // 時間が変更されていない（まだカウントダウンは始まっていない）
            afterStartState.currentTime === expectedDuration &&
            // セッションタイプが維持されている
            afterStartState.sessionType === sessionType &&
            // インターバルIDが設定されている
            afterStartState.intervalId !== null
          );
        }
      ),
      {
        ...propertyTestConfig,
        numRuns: 50,
      }
    );
  });

  test('プロパティ 1-エッジケース: 既に動作中のタイマーに対する開始操作', () => {
    // **Feature: pomodoro-timer, Property 1: タイマー開始の一貫性（エッジケース）**
    // **検証対象: 要件 1.1**

    fc.assert(
      fc.property(userSettingsArbitrary, userSettings => {
        // ユーザー設定をモック
        const mockUser = {
          id: 'test-user-id',
          email: 'test@example.com',
          display_name: 'Test User',
          timezone: 'UTC',
          settings: userSettings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // 認証ストアにモックユーザーを設定
        useAuthStore.setState({ user: mockUser });

        const timerStore = useTimerStore.getState();
        timerStore.initializeTimer();

        // 最初にタイマーを開始
        timerStore.startTimer();
        const firstStartState = useTimerStore.getState();

        // 既に動作中のタイマーに対して再度開始操作を実行
        timerStore.startTimer();
        const secondStartState = useTimerStore.getState();

        // プロパティ検証：既に動作中のタイマーに対する開始操作は状態を変更しない
        return (
          // 状態が変更されていない
          firstStartState.isRunning === secondStartState.isRunning &&
          firstStartState.currentTime === secondStartState.currentTime &&
          firstStartState.sessionType === secondStartState.sessionType &&
          // 両方とも動作中である
          firstStartState.isRunning === true &&
          secondStartState.isRunning === true
        );
      }),
      {
        ...propertyTestConfig,
        numRuns: 30,
      }
    );
  });

  test('プロパティ 1-境界値: 設定時間の境界値での動作確認', () => {
    // **Feature: pomodoro-timer, Property 1: タイマー開始の一貫性（境界値）**
    // **検証対象: 要件 1.1**

    fc.assert(
      fc.property(
        fc.record({
          pomodoro_minutes: fc.constantFrom(15, 60), // 境界値
          short_break_minutes: fc.constantFrom(3, 10), // 境界値
          long_break_minutes: fc.constantFrom(10, 30), // 境界値
          sessions_until_long_break: fc.constantFrom(2, 8), // 境界値
          sound_enabled: fc.boolean(),
          sound_type: fc.constantFrom('bell', 'chime', 'notification'),
          theme: fc.constantFrom('light', 'dark', 'auto'),
          notifications: fc.record({
            desktop: fc.boolean(),
            sound: fc.boolean(),
            vibration: fc.boolean(),
          }),
        }),
        userSettings => {
          // ユーザー設定をモック
          const mockUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            display_name: 'Test User',
            timezone: 'UTC',
            settings: userSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // 認証ストアにモックユーザーを設定
          useAuthStore.setState({ user: mockUser });

          const timerStore = useTimerStore.getState();
          timerStore.initializeTimer();

          // タイマーを開始
          timerStore.startTimer();

          const state = useTimerStore.getState();
          const expectedDuration = timeHelpers.minutesToSeconds(
            userSettings.pomodoro_minutes
          );

          // プロパティ検証：境界値の設定時間でも正常に動作する
          return (
            // 時間が正しく設定されている
            state.currentTime === expectedDuration &&
            // タイマーが動作中である
            state.isRunning === true &&
            // セッションタイプがポモドーロである
            state.sessionType === 'pomodoro' &&
            // 設定時間が有効な範囲内である
            timeHelpers.isValidTimeRange(
              15,
              60,
              userSettings.pomodoro_minutes
            ) &&
            timeHelpers.isValidTimeRange(
              3,
              10,
              userSettings.short_break_minutes
            ) &&
            timeHelpers.isValidTimeRange(
              10,
              30,
              userSettings.long_break_minutes
            )
          );
        }
      ),
      {
        ...propertyTestConfig,
        numRuns: 20,
      }
    );
  });
});
