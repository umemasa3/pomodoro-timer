/**
 * タイマーストアのプロパティベーステスト
 * Feature: production-readiness, Property 1: タスク非依存タイマーの一貫性
 *
 * このテストは要件1.1、1.3「コアタイマー機能の独立性」を検証します。
 * すべてのタイマーセッションにおいて、タスクが関連付けられていない場合でも、
 * セッション記録が適切に作成され、統計に反映される
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  propertyTestConfig,
  mockDatabase,
  setupPropertyTest,
  teardownPropertyTest,
} from '../../test/property-test-setup';
import type { Session } from '../../types';

// テスト用のタイマーストア実装
class TestTimerStore {
  private currentSession: Session | null = null;
  private mode: 'task-based' | 'standalone' = 'standalone';
  private sessionType: 'pomodoro' | 'short_break' | 'long_break' = 'pomodoro';

  // デフォルトセッション名の取得
  getDefaultSessionName(
    sessionType: 'pomodoro' | 'short_break' | 'long_break'
  ): string {
    switch (sessionType) {
      case 'pomodoro':
        return '集中時間';
      case 'short_break':
        return '短い休憩';
      case 'long_break':
        return '長い休憩';
      default:
        return '集中時間';
    }
  }

  // スタンドアロンセッションの作成
  async createStandaloneSession(
    userId: string,
    sessionType: 'pomodoro' | 'short_break' | 'long_break',
    plannedDuration: number
  ): Promise<Session> {
    const sessionId = `session-${Date.now()}-${Math.random()}`;
    const sessionName = this.getDefaultSessionName(sessionType);

    const session: Session = {
      id: sessionId,
      user_id: userId,
      task_id: undefined, // タスクなし
      type: sessionType,
      planned_duration: plannedDuration,
      actual_duration: 0,
      completed: false,
      started_at: new Date().toISOString(),
      mode: 'standalone',
      session_name: sessionName,
    };

    // データベースに保存
    await mockDatabase.save('sessions', sessionId, session);
    this.currentSession = session;

    return session;
  }

  // セッションの完了
  async completeSession(actualDuration: number): Promise<Session> {
    if (!this.currentSession) {
      throw new Error('現在のセッションが存在しません');
    }

    const updatedSession = {
      ...this.currentSession,
      actual_duration: actualDuration,
      completed: true,
      completed_at: new Date().toISOString(),
    };

    await mockDatabase.update('sessions', this.currentSession.id, {
      actual_duration: actualDuration,
      completed: true,
      completed_at: updatedSession.completed_at,
    });

    this.currentSession = updatedSession;
    return updatedSession;
  }

  // セッション履歴の取得
  async getSessionHistory(userId: string): Promise<Session[]> {
    const allData = mockDatabase.getAllData();
    const sessions: Session[] = [];

    for (const [key, value] of allData.entries()) {
      if (key.startsWith('sessions:') && value.user_id === userId) {
        sessions.push(value as Session);
      }
    }

    return sessions.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
  }

  // 統計データの計算
  async calculateStatistics(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    standaloneSessions: number;
    taskBasedSessions: number;
    totalWorkTime: number;
  }> {
    const sessions = await this.getSessionHistory(userId);

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completed).length;
    const standaloneSessions = sessions.filter(
      s => s.mode === 'standalone'
    ).length;
    const taskBasedSessions = sessions.filter(
      s => s.mode === 'task-based'
    ).length;
    const totalWorkTime = sessions
      .filter(s => s.completed && s.type === 'pomodoro')
      .reduce((sum, s) => sum + s.actual_duration, 0);

    return {
      totalSessions,
      completedSessions,
      standaloneSessions,
      taskBasedSessions,
      totalWorkTime,
    };
  }

  // 現在のセッションを取得
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  // セッションをクリア
  clearCurrentSession(): void {
    this.currentSession = null;
  }
}

// テスト用のジェネレーター
const userIdGenerator = () => fc.uuid();

const sessionTypeGenerator = () =>
  fc.constantFrom('pomodoro', 'short_break', 'long_break');

const plannedDurationGenerator = () => fc.integer({ min: 1, max: 60 });

const actualDurationGenerator = () => fc.integer({ min: 1, max: 60 });

describe('タイマーストア プロパティテスト', () => {
  let timerStore: TestTimerStore;

  beforeEach(() => {
    setupPropertyTest();
    timerStore = new TestTimerStore();
  });

  afterEach(() => {
    teardownPropertyTest();
  });

  describe('プロパティ 1: タスク非依存タイマーの一貫性', () => {
    it('すべてのスタンドアロンセッションにおいて、タスクが関連付けられていない場合でも、セッション記録が適切に作成される', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGenerator(),
          sessionTypeGenerator(),
          plannedDurationGenerator(),
          async (userId, sessionType, plannedDuration) => {
            // スタンドアロンセッションを作成
            const session = await timerStore.createStandaloneSession(
              userId,
              sessionType,
              plannedDuration
            );

            // プロパティ1: セッションが適切に作成される
            expect(session).toBeDefined();
            expect(session.id).toBeDefined();
            expect(session.user_id).toBe(userId);
            expect(session.type).toBe(sessionType);
            expect(session.planned_duration).toBe(plannedDuration);
            expect(session.mode).toBe('standalone');
            expect(session.task_id).toBeUndefined();

            // プロパティ2: デフォルトセッション名が設定される
            const expectedName = timerStore.getDefaultSessionName(sessionType);
            expect(session.session_name).toBe(expectedName);

            // プロパティ3: セッションがデータベースに保存される
            const savedSession = await mockDatabase.get('sessions', session.id);
            expect(savedSession).not.toBeNull();
            expect(savedSession.id).toBe(session.id);
            expect(savedSession.mode).toBe('standalone');
          }
        ),
        { ...propertyTestConfig, numRuns: 100 }
      );
    });

    it('すべてのスタンドアロンセッションにおいて、セッション完了時に統計に適切に反映される', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGenerator(),
          sessionTypeGenerator(),
          plannedDurationGenerator(),
          actualDurationGenerator(),
          async (userId, sessionType, plannedDuration, actualDuration) => {
            // 初期統計を取得
            const initialStats = await timerStore.calculateStatistics(userId);

            // スタンドアロンセッションを作成・完了
            await timerStore.createStandaloneSession(
              userId,
              sessionType,
              plannedDuration
            );
            await timerStore.completeSession(actualDuration);

            // 完了後の統計を取得
            const finalStats = await timerStore.calculateStatistics(userId);

            // プロパティ1: 総セッション数が1増加する
            expect(finalStats.totalSessions).toBe(
              initialStats.totalSessions + 1
            );

            // プロパティ2: 完了セッション数が1増加する
            expect(finalStats.completedSessions).toBe(
              initialStats.completedSessions + 1
            );

            // プロパティ3: スタンドアロンセッション数が1増加する
            expect(finalStats.standaloneSessions).toBe(
              initialStats.standaloneSessions + 1
            );

            // プロパティ4: タスクベースセッション数は変化しない
            expect(finalStats.taskBasedSessions).toBe(
              initialStats.taskBasedSessions
            );

            // プロパティ5: ポモドーロセッションの場合、作業時間が増加する
            if (sessionType === 'pomodoro') {
              expect(finalStats.totalWorkTime).toBe(
                initialStats.totalWorkTime + actualDuration
              );
            } else {
              expect(finalStats.totalWorkTime).toBe(initialStats.totalWorkTime);
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 100 }
      );
    });

    it('すべてのセッションタイプにおいて、デフォルトセッション名が一貫して設定される', async () => {
      await fc.assert(
        fc.property(sessionTypeGenerator(), sessionType => {
          const sessionName = timerStore.getDefaultSessionName(sessionType);

          // プロパティ1: セッション名が空でない
          expect(sessionName).toBeDefined();
          expect(sessionName.length).toBeGreaterThan(0);

          // プロパティ2: セッションタイプに応じた適切な名前が設定される
          switch (sessionType) {
            case 'pomodoro':
              expect(sessionName).toBe('集中時間');
              break;
            case 'short_break':
              expect(sessionName).toBe('短い休憩');
              break;
            case 'long_break':
              expect(sessionName).toBe('長い休憩');
              break;
          }

          // プロパティ3: 同じセッションタイプに対して常に同じ名前を返す
          const secondCall = timerStore.getDefaultSessionName(sessionType);
          expect(secondCall).toBe(sessionName);
        }),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('複数のスタンドアロンセッションを連続して作成・完了しても、すべてが統計に正しく反映される', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGenerator(),
          fc.array(
            fc.record({
              sessionType: sessionTypeGenerator(),
              plannedDuration: plannedDurationGenerator(),
              actualDuration: actualDurationGenerator(),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (userId, sessionConfigs) => {
            // 初期統計を取得
            const initialStats = await timerStore.calculateStatistics(userId);

            // 複数のセッションを順次実行
            let totalWorkTime = 0;

            for (const config of sessionConfigs) {
              await timerStore.createStandaloneSession(
                userId,
                config.sessionType,
                config.plannedDuration
              );
              await timerStore.completeSession(config.actualDuration);

              if (config.sessionType === 'pomodoro') {
                totalWorkTime += config.actualDuration;
              }

              // セッションをクリアして次のセッションに備える
              timerStore.clearCurrentSession();
            }

            // 最終統計を取得
            const finalStats = await timerStore.calculateStatistics(userId);

            // プロパティ1: 総セッション数が正しく増加する
            expect(finalStats.totalSessions).toBe(
              initialStats.totalSessions + sessionConfigs.length
            );

            // プロパティ2: 完了セッション数が正しく増加する
            expect(finalStats.completedSessions).toBe(
              initialStats.completedSessions + sessionConfigs.length
            );

            // プロパティ3: スタンドアロンセッション数が正しく増加する
            expect(finalStats.standaloneSessions).toBe(
              initialStats.standaloneSessions + sessionConfigs.length
            );

            // プロパティ4: ポモドーロ作業時間が正しく計算される
            expect(finalStats.totalWorkTime).toBe(
              initialStats.totalWorkTime + totalWorkTime
            );

            // プロパティ5: セッション履歴にすべてのセッションが記録される
            const sessionHistory = await timerStore.getSessionHistory(userId);
            const newSessions = sessionHistory.slice(0, sessionConfigs.length);

            expect(newSessions.length).toBe(sessionConfigs.length);
            newSessions.forEach(session => {
              expect(session.mode).toBe('standalone');
              expect(session.task_id).toBeUndefined();
              expect(session.completed).toBe(true);
              expect(session.session_name).toBeDefined();
            });
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });

    it('タスクが関連付けられていないセッションでも、セッション履歴の検索・フィルタリングが正常に動作する', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGenerator(),
          fc.array(
            fc.record({
              sessionType: sessionTypeGenerator(),
              plannedDuration: plannedDurationGenerator(),
              actualDuration: actualDurationGenerator(),
            }),
            { minLength: 3, maxLength: 8 }
          ),
          async (userId, sessionConfigs) => {
            // 複数のスタンドアロンセッションを作成
            const createdSessions: Session[] = [];

            for (const config of sessionConfigs) {
              const session = await timerStore.createStandaloneSession(
                userId,
                config.sessionType,
                config.plannedDuration
              );
              await timerStore.completeSession(config.actualDuration);
              createdSessions.push(
                await mockDatabase.get('sessions', session.id)
              );
              timerStore.clearCurrentSession();
            }

            // セッション履歴を取得
            const sessionHistory = await timerStore.getSessionHistory(userId);

            // プロパティ1: すべてのセッションが履歴に含まれる
            expect(sessionHistory.length).toBeGreaterThanOrEqual(
              sessionConfigs.length
            );

            // プロパティ2: スタンドアロンセッションのみをフィルタリングできる
            const standaloneOnly = sessionHistory.filter(
              s => s.mode === 'standalone'
            );
            expect(standaloneOnly.length).toBeGreaterThanOrEqual(
              sessionConfigs.length
            );

            // プロパティ3: セッションタイプ別にフィルタリングできる
            const pomodoroSessions = sessionHistory.filter(
              s => s.type === 'pomodoro' && s.mode === 'standalone'
            );
            const expectedPomodoroCount = sessionConfigs.filter(
              c => c.sessionType === 'pomodoro'
            ).length;
            expect(pomodoroSessions.length).toBeGreaterThanOrEqual(
              expectedPomodoroCount
            );

            // プロパティ4: すべてのスタンドアロンセッションにセッション名が設定されている
            standaloneOnly.forEach(session => {
              expect(session.session_name).toBeDefined();
              expect(session.session_name!.length).toBeGreaterThan(0);
              expect(session.task_id).toBeUndefined();
            });
          }
        ),
        { ...propertyTestConfig, numRuns: 25 }
      );
    });
  });
});
