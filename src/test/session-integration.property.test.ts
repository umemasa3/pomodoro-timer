import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { useTimerStore } from '../stores/timer-store';
import { useAuthStore } from '../stores/auth-store';
import { DatabaseService } from '../services/database-service';
import type { Session, Task, User } from '../types';

// Supabaseのモック
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    })),
  },
}));

// NotificationServiceのモック
vi.mock('../services/notification-service', () => ({
  NotificationService: {
    getInstance: vi.fn(() => ({
      showSessionCompleteNotification: vi.fn(),
    })),
  },
}));

// DatabaseServiceの型定義
interface MockDatabaseService {
  updateSession: ReturnType<typeof vi.fn>;
  updateTask: ReturnType<typeof vi.fn>;
  createSession: ReturnType<typeof vi.fn>;
}

describe('セッション連携機能 - プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Zustandストアをリセット
    useTimerStore.setState({
      currentTime: 25 * 60,
      isRunning: false,
      sessionType: 'pomodoro',
      completedSessions: 0,
      intervalId: null,
      currentTask: null,
      currentSession: null,
      showTaskSelection: false,
      showTaskCompletionDialog: false,
      showBreakSuggestion: false,
      suggestedBreakType: 'short',
      showCompletionNotification: false,
    });

    // 認証ストアにテストユーザーを設定
    useAuthStore.setState({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        display_name: 'テストユーザー',
        timezone: 'Asia/Tokyo',
        settings: {
          pomodoro_minutes: 25,
          short_break_minutes: 5,
          long_break_minutes: 15,
          sessions_until_long_break: 4,
          sound_enabled: true,
          sound_type: 'bell',
          theme: 'light',
          notifications: {
            desktop: true,
            sound: true,
            vibration: false,
          },
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as User,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  /**
   * プロパティ 2: セッション完了カウンターの増分
   * 任意のポモドーロセッション完了時において、システムは完了セッション数を正確に1増加させる
   * 検証対象: 要件 3.1
   */
  it('プロパティ 2: セッション完了カウンターの増分', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 初期の完了セッション数（0以上の整数）
        fc.integer({ min: 0, max: 100 }),
        // セッション情報
        fc.record({
          id: fc.uuid(), // UUIDを使用
          user_id: fc.constant('test-user-id'),
          task_id: fc.option(fc.uuid(), { nil: undefined }),
          type: fc.constant('pomodoro'), // ポモドーロセッションのみ
          planned_duration: fc.constant(25),
          actual_duration: fc.constant(25),
          completed: fc.constant(false),
          started_at: fc.constant('2024-01-01T00:00:00.000Z'),
        }),
        // タスク情報（オプション）
        fc.option(
          fc.record({
            id: fc.uuid(), // UUIDを使用
            user_id: fc.constant('test-user-id'),
            title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            description: fc.option(fc.string(), { nil: undefined }),
            estimated_pomodoros: fc.integer({ min: 1, max: 10 }),
            completed_pomodoros: fc.integer({ min: 0, max: 5 }),
            status: fc.constantFrom('pending', 'in_progress', 'paused'),
            priority: fc.constantFrom('low', 'medium', 'high'),
            created_at: fc.constant('2024-01-01T00:00:00.000Z'),
            updated_at: fc.constant('2024-01-01T00:00:00.000Z'),
          }),
          { nil: null }
        ),
        async (
          initialCompletedSessions: number,
          session: Session,
          task: Task | null
        ) => {
          // 初期状態を設定
          useTimerStore.setState({
            completedSessions: initialCompletedSessions,
            sessionType: 'pomodoro',
            currentTime: 0, // タイマー完了状態
            isRunning: true,
            currentSession: session,
            currentTask: task,
          });

          // DatabaseServiceのモックを設定
          const mockUpdateSession = vi.fn().mockResolvedValue(undefined);
          const mockUpdateTask = vi.fn().mockResolvedValue(undefined);
          const mockCreateSession = vi.fn().mockResolvedValue(session);

          vi.spyOn(DatabaseService, 'getInstance').mockReturnValue({
            updateSession: mockUpdateSession,
            updateTask: mockUpdateTask,
            createSession: mockCreateSession,
          } as MockDatabaseService as DatabaseService);

          // セッション完了を実行
          await useTimerStore.getState().completeSession();

          // 完了セッション数が正確に1増加していることを確認
          const finalCompletedSessions =
            useTimerStore.getState().completedSessions;
          expect(finalCompletedSessions).toBe(initialCompletedSessions + 1);

          // セッション記録が更新されていることを確認（セッションとユーザーが存在する場合のみ）
          const { user } = useAuthStore.getState();
          if (session.id && user) {
            expect(mockUpdateSession).toHaveBeenCalledWith(
              session.id,
              expect.objectContaining({
                actual_duration: 25,
                completed: true,
                completed_at: expect.any(String),
              })
            );
          }

          // 注意: タスクの完了ポモドーロ数の更新は completeTaskInSession で行われるため、
          // completeSession では更新されない
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 3: 休憩セッション完了時のカウンター不変性
   * 任意の休憩セッション（短い休憩・長い休憩）完了時において、
   * システムは完了セッション数を変更しない
   * 検証対象: 要件 3.1（ポモドーロセッションのみカウント）
   */
  it('プロパティ 3: 休憩セッション完了時のカウンター不変性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 初期の完了セッション数
        fc.integer({ min: 0, max: 100 }),
        // 休憩セッションタイプ
        fc.constantFrom('short_break', 'long_break'),
        async (
          initialCompletedSessions: number,
          breakType: 'short_break' | 'long_break'
        ) => {
          // 初期状態を設定
          useTimerStore.setState({
            completedSessions: initialCompletedSessions,
            sessionType: breakType,
            currentTime: 0, // タイマー完了状態
            isRunning: true,
            currentSession: null,
            currentTask: null,
          });

          // セッション完了を実行
          await useTimerStore.getState().completeSession();

          // 完了セッション数が変更されていないことを確認
          const finalCompletedSessions =
            useTimerStore.getState().completedSessions;
          expect(finalCompletedSessions).toBe(initialCompletedSessions);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 4: セッション完了時の状態遷移の一貫性
   * 任意のポモドーロセッション完了時において、システムは適切な状態遷移を行う
   * （タイマー停止、通知表示、休憩提案）
   * 検証対象: 要件 3.1, 2.1, 4.1
   */
  it('プロパティ 4: セッション完了時の状態遷移の一貫性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 完了セッション数（長い休憩の判定に影響）
        fc.integer({ min: 1, max: 20 }),
        // セッション情報
        fc.record({
          id: fc.uuid(),
          user_id: fc.constant('test-user-id'),
          type: fc.constant('pomodoro'),
          planned_duration: fc.constant(25),
        }),
        async (completedSessions: number, session: Partial<Session>) => {
          // 初期状態を設定
          useTimerStore.setState({
            completedSessions: completedSessions - 1, // 完了後に指定値になるよう調整
            sessionType: 'pomodoro',
            currentTime: 0,
            isRunning: true,
            currentSession: session as Session,
            showBreakSuggestion: false,
            showCompletionNotification: false,
          });

          // DatabaseServiceのモックを設定
          vi.spyOn(DatabaseService, 'getInstance').mockReturnValue({
            updateSession: vi.fn().mockResolvedValue(undefined),
            updateTask: vi.fn().mockResolvedValue(undefined),
          } as MockDatabaseService as DatabaseService);

          // セッション完了を実行
          await useTimerStore.getState().completeSession();

          const state = useTimerStore.getState();

          // タイマーが停止していることを確認
          expect(state.isRunning).toBe(false);
          expect(state.intervalId).toBe(null);

          // 完了通知が表示されることを確認
          expect(state.showCompletionNotification).toBe(true);

          // 休憩提案が表示されることを確認
          expect(state.showBreakSuggestion).toBe(true);

          // 長い休憩の判定が正しいことを確認
          const sessionsUntilLongBreak = 4; // デフォルト設定
          if (completedSessions % sessionsUntilLongBreak === 0) {
            expect(state.suggestedBreakType).toBe('long');
          } else {
            expect(state.suggestedBreakType).toBe('short');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 5: タスク完了確認ダイアログの表示条件
   * 任意のポモドーロセッション完了時において、タスクが選択されている場合のみ
   * タスク完了確認ダイアログが表示される
   * 検証対象: 要件 10.1.1
   */
  it('プロパティ 5: タスク完了確認ダイアログの表示条件', async () => {
    await fc.assert(
      fc.asyncProperty(
        // タスクの有無
        fc.boolean(),
        // セッション情報
        fc.record({
          id: fc.uuid(),
          user_id: fc.constant('test-user-id'),
          type: fc.constant('pomodoro'),
          planned_duration: fc.constant(25),
        }),
        // タスク情報
        fc.record({
          id: fc.uuid(),
          user_id: fc.constant('test-user-id'),
          title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          status: fc.constantFrom('pending', 'in_progress', 'paused'),
          completed_pomodoros: fc.integer({ min: 0, max: 5 }),
        }),
        async (
          hasTask: boolean,
          session: Partial<Session>,
          task: Partial<Task>
        ) => {
          // 初期状態を設定
          useTimerStore.setState({
            sessionType: 'pomodoro',
            currentTime: 0,
            isRunning: true,
            currentSession: session as Session,
            currentTask: hasTask ? (task as Task) : null,
            showTaskCompletionDialog: false,
          });

          // DatabaseServiceのモックを設定
          vi.spyOn(DatabaseService, 'getInstance').mockReturnValue({
            updateSession: vi.fn().mockResolvedValue(undefined),
            updateTask: vi.fn().mockResolvedValue(undefined),
          } as MockDatabaseService as DatabaseService);

          // セッション完了を実行
          await useTimerStore.getState().completeSession();

          const state = useTimerStore.getState();

          // タスクが選択されている場合のみダイアログが表示される
          if (hasTask) {
            expect(state.showTaskCompletionDialog).toBe(true);
          } else {
            expect(state.showTaskCompletionDialog).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ 6: セッション記録の整合性
   * 任意のポモドーロセッション完了時において、セッション記録は
   * 正確な実際時間と完了状態で更新される
   * 検証対象: 要件 3.1, 10.1.6
   */
  it('プロパティ 6: セッション記録の整合性', async () => {
    await fc.assert(
      fc.asyncProperty(
        // セッション情報
        fc.record({
          id: fc.uuid(),
          user_id: fc.constant('test-user-id'),
          task_id: fc.option(fc.uuid(), { nil: undefined }),
          type: fc.constant('pomodoro'),
          planned_duration: fc.integer({ min: 15, max: 60 }), // 設定可能な範囲
          actual_duration: fc.constant(0), // 初期値
          completed: fc.constant(false), // 初期値
          started_at: fc.constant('2024-01-01T00:00:00.000Z'),
        }),
        async (session: Session) => {
          // ユーザー設定を更新（planned_durationと一致させる）
          useAuthStore.setState({
            user: {
              ...useAuthStore.getState().user!,
              settings: {
                ...useAuthStore.getState().user!.settings,
                pomodoro_minutes: session.planned_duration,
              },
            },
          });

          // 初期状態を設定
          useTimerStore.setState({
            sessionType: 'pomodoro',
            currentTime: 0,
            isRunning: true,
            currentSession: session,
          });

          // DatabaseServiceのモックを設定
          const mockUpdateSession = vi.fn().mockResolvedValue(undefined);
          vi.spyOn(DatabaseService, 'getInstance').mockReturnValue({
            updateSession: mockUpdateSession,
            updateTask: vi.fn().mockResolvedValue(undefined),
          } as MockDatabaseService as DatabaseService);

          // セッション完了を実行
          await useTimerStore.getState().completeSession();

          // セッション記録が正確に更新されていることを確認
          expect(mockUpdateSession).toHaveBeenCalledWith(
            session.id,
            expect.objectContaining({
              actual_duration: session.planned_duration, // 完了時は予定時間と同じ
              completed: true,
              completed_at: expect.stringMatching(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
              ), // ISO形式の日時
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
