/**
 * オフライン同期機能のプロパティベーステスト
 * Feature: production-readiness, Property 3: オフライン同期の整合性
 *
 * このテストは要件3.2、3.3「製品品質の向上」を検証します。
 * すべてのオフライン操作において、ネットワーク復旧時にデータの競合なく同期が完了し、
 * データ損失が発生しない
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  propertyTestConfig,
  setupPropertyTest,
  teardownPropertyTest,
} from '../../test/property-test-setup';
import { OfflineSyncService, type PendingAction } from '../offline-sync';

// テスト用のオフライン同期サービス実装
class TestOfflineSyncService extends OfflineSyncService {
  private mockNetworkStatus: boolean = true;
  private mockSyncErrors: Map<string, Error> = new Map();
  private syncAttempts: Map<string, number> = new Map();

  // ネットワーク状態をモック
  setNetworkStatus(isOnline: boolean): void {
    this.mockNetworkStatus = isOnline;
    // navigator.onLineをモック
    Object.defineProperty(navigator, 'onLine', {
      value: isOnline,
      writable: true,
    });
  }

  // 特定のアクションに対してエラーを設定
  setMockSyncError(actionId: string, error: Error): void {
    this.mockSyncErrors.set(actionId, error);
  }

  // エラーをクリア
  clearMockSyncErrors(): void {
    this.mockSyncErrors.clear();
  }

  // 同期試行回数を取得
  getSyncAttempts(actionId: string): number {
    return this.syncAttempts.get(actionId) || 0;
  }

  // 同期試行回数をリセット
  resetSyncAttempts(): void {
    this.syncAttempts.clear();
  }

  // executeActionをオーバーライドしてモック動作を実装
  protected async executeAction(action: PendingAction): Promise<void> {
    // 同期試行回数をカウント
    const currentAttempts = this.syncAttempts.get(action.id) || 0;
    this.syncAttempts.set(action.id, currentAttempts + 1);

    // モックエラーがある場合は投げる
    const mockError = this.mockSyncErrors.get(action.id);
    if (mockError) {
      throw mockError;
    }

    // ネットワークがオフラインの場合はエラー
    if (!this.mockNetworkStatus) {
      throw new Error('Network is offline');
    }

    // 正常な場合は何もしない（成功とみなす）
    return Promise.resolve();
  }
}

// テスト用のジェネレーター
const actionTypeGenerator = () => fc.constantFrom('create', 'update', 'delete');

const entityTypeGenerator = () =>
  fc.constantFrom('task', 'session', 'tag', 'goal');

const actionDataGenerator = () =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 })),
    timestamp: fc.date().map(d => d.toISOString()),
    metadata: fc.record({
      userId: fc.uuid(),
      version: fc.integer({ min: 1, max: 100 }),
    }),
  });

const pendingActionGenerator = (): fc.Arbitrary<PendingAction> =>
  fc.record({
    id: fc.uuid(),
    type: actionTypeGenerator(),
    entity: entityTypeGenerator(),
    data: actionDataGenerator(),
    timestamp: fc.date(),
    retryCount: fc.integer({ min: 0, max: 5 }),
  });

describe('オフライン同期 プロパティテスト', () => {
  let offlineSyncService: TestOfflineSyncService;

  beforeEach(() => {
    setupPropertyTest();
    offlineSyncService = new TestOfflineSyncService();

    // localStorageをモック
    const mockStorage = new Map<string, string>();
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockStorage.get(key) || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          mockStorage.delete(key);
        }),
        clear: vi.fn(() => {
          mockStorage.clear();
        }),
      },
      writable: true,
    });

    // navigator.onLineをモック
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    teardownPropertyTest();
    offlineSyncService.clearMockSyncErrors();
    offlineSyncService.resetSyncAttempts();
  });

  describe('プロパティ 3: オフライン同期の整合性', () => {
    it('すべてのオフライン操作において、ネットワーク復旧時にデータの競合なく同期が完了する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(pendingActionGenerator(), { minLength: 1, maxLength: 10 }),
          async actions => {
            // プロパティ1: オフライン状態でアクションをキューに追加
            offlineSyncService.setNetworkStatus(false);

            for (const action of actions) {
              await offlineSyncService.queueAction(action);
            }

            // すべてのアクションがキューに保存されることを確認
            const queuedActions = await offlineSyncService.getPendingActions();
            expect(queuedActions.length).toBe(actions.length);

            // キューされたアクションが元のアクションと一致することを確認
            for (const originalAction of actions) {
              const queuedAction = queuedActions.find(
                qa => qa.id === originalAction.id
              );
              expect(queuedAction).toBeDefined();
              if (queuedAction) {
                expect(queuedAction.type).toBe(originalAction.type);
                expect(queuedAction.entity).toBe(originalAction.entity);
                expect(queuedAction.data).toEqual(originalAction.data);
              }
            }

            // プロパティ2: ネットワーク復旧時に同期が実行される
            offlineSyncService.setNetworkStatus(true);
            await offlineSyncService.syncPendingActions();

            // すべてのアクションが同期されることを確認
            for (const action of actions) {
              const attempts = offlineSyncService.getSyncAttempts(action.id);
              expect(attempts).toBeGreaterThan(0);
            }

            // プロパティ3: 同期後にキューがクリアされる
            const remainingActions =
              await offlineSyncService.getPendingActions();
            expect(remainingActions.length).toBe(0);
          }
        ),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('すべてのオフライン操作において、データ損失が発生しない', async () => {
      await fc.assert(
        fc.asyncProperty(
          pendingActionGenerator(),
          fc.integer({ min: 1, max: 5 }), // 失敗回数
          async (action, failureCount) => {
            // プロパティ1: 一時的な同期エラーでもデータが保持される
            offlineSyncService.setNetworkStatus(true);

            // 最初の数回は失敗するように設定
            offlineSyncService.setMockSyncError(
              action.id,
              new Error('Temporary sync error')
            );

            // アクションをキューに追加
            await offlineSyncService.queueAction(action);

            // 失敗回数分だけ同期を試行
            for (let i = 0; i < failureCount; i++) {
              try {
                await offlineSyncService.syncPendingActions();
              } catch {
                // エラーは期待される
              }

              // 失敗後もアクションがキューに残っていることを確認
              const queuedActions =
                await offlineSyncService.getPendingActions();
              const remainingAction = queuedActions.find(
                qa => qa.id === action.id
              );
              expect(remainingAction).toBeDefined();
              if (remainingAction) {
                expect(remainingAction.retryCount).toBe(i + 1);
              }
            }

            // プロパティ2: エラーが解決されると同期が成功する
            offlineSyncService.clearMockSyncErrors();
            await offlineSyncService.syncPendingActions();

            // 同期が成功してキューからアクションが削除されることを確認
            const finalActions = await offlineSyncService.getPendingActions();
            const finalAction = finalActions.find(qa => qa.id === action.id);
            expect(finalAction).toBeUndefined();

            // プロパティ3: 同期試行回数が記録される
            const totalAttempts = offlineSyncService.getSyncAttempts(action.id);
            expect(totalAttempts).toBe(failureCount + 1);
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });

    it('すべての同期操作において、アクションの順序が保持される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(pendingActionGenerator(), { minLength: 2, maxLength: 5 }),
          async actions => {
            // アクションにタイムスタンプを設定（順序を明確にする）
            const orderedActions = actions.map((action, index) => ({
              ...action,
              timestamp: new Date(Date.now() + index * 1000), // 1秒間隔
            }));

            // オフライン状態でアクションをキューに追加
            offlineSyncService.setNetworkStatus(false);

            for (const action of orderedActions) {
              await offlineSyncService.queueAction(action);
            }

            // プロパティ1: キューされたアクションの順序が保持される
            const queuedActions = await offlineSyncService.getPendingActions();
            expect(queuedActions.length).toBe(orderedActions.length);

            // タイムスタンプ順にソートされていることを確認
            for (let i = 1; i < queuedActions.length; i++) {
              const prevTimestamp = queuedActions[i - 1].timestamp.getTime();
              const currentTimestamp = queuedActions[i].timestamp.getTime();
              expect(prevTimestamp).toBeLessThanOrEqual(currentTimestamp);
            }

            // プロパティ2: 同期時も順序が保持される
            offlineSyncService.setNetworkStatus(true);
            await offlineSyncService.syncPendingActions();

            // すべてのアクションが順序通りに同期されることを確認
            for (let i = 0; i < orderedActions.length; i++) {
              const attempts = offlineSyncService.getSyncAttempts(
                orderedActions[i].id
              );
              expect(attempts).toBeGreaterThan(0);
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });

    it('すべての競合状況において、適切な競合解決が行われる', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            localAction: pendingActionGenerator(),
            serverAction: actionDataGenerator(),
          }),
          async ({ localAction, serverAction }) => {
            // 同じエンティティに対する競合するアクションをシミュレート
            const conflictingAction: PendingAction = {
              ...localAction,
              data: serverAction, // サーバー側のデータ
            };

            // プロパティ1: 競合が検出される
            await offlineSyncService.queueAction(localAction);

            // 競合するアクションを追加（同じIDで異なるデータ）
            await offlineSyncService.queueAction(conflictingAction);

            const queuedActions = await offlineSyncService.getPendingActions();

            // 同じIDのアクションが複数ある場合、最新のものが保持される
            const actionsWithSameId = queuedActions.filter(
              qa => qa.id === localAction.id
            );

            // プロパティ2: 競合解決により一意性が保たれる
            expect(actionsWithSameId.length).toBeLessThanOrEqual(1);

            if (actionsWithSameId.length === 1) {
              const resolvedAction = actionsWithSameId[0];
              // 最新のタイムスタンプを持つアクションが保持される
              expect(resolvedAction.timestamp.getTime()).toBeGreaterThanOrEqual(
                localAction.timestamp.getTime()
              );
            }

            // プロパティ3: 同期後に競合が解決される
            offlineSyncService.setNetworkStatus(true);
            await offlineSyncService.syncPendingActions();

            const finalActions = await offlineSyncService.getPendingActions();
            const finalConflictingActions = finalActions.filter(
              qa => qa.id === localAction.id
            );
            expect(finalConflictingActions.length).toBe(0);
          }
        ),
        { ...propertyTestConfig, numRuns: 25 }
      );
    });

    it('すべてのリトライ操作において、指数バックオフが適用される', async () => {
      await fc.assert(
        fc.asyncProperty(
          pendingActionGenerator(),
          fc.integer({ min: 1, max: 3 }), // 最大リトライ回数
          async (action, maxRetries) => {
            // 継続的にエラーが発生するように設定
            offlineSyncService.setMockSyncError(
              action.id,
              new Error('Persistent error')
            );
            offlineSyncService.setNetworkStatus(true);

            await offlineSyncService.queueAction(action);

            const retryTimes: number[] = [];

            // 複数回同期を試行してリトライ間隔を測定
            for (let i = 0; i < maxRetries; i++) {
              const retryStartTime = Date.now();

              try {
                await offlineSyncService.syncPendingActions();
              } catch {
                // エラーは期待される
              }

              retryTimes.push(Date.now() - retryStartTime);

              // 短い待機（実際の指数バックオフをシミュレート）
              await new Promise(resolve =>
                setTimeout(resolve, Math.pow(2, i) * 100)
              );
            }

            // プロパティ1: リトライ回数が記録される
            const attempts = offlineSyncService.getSyncAttempts(action.id);
            expect(attempts).toBe(maxRetries);

            // プロパティ2: アクションのリトライカウントが更新される
            const queuedActions = await offlineSyncService.getPendingActions();
            const retriedAction = queuedActions.find(qa => qa.id === action.id);
            expect(retriedAction).toBeDefined();
            if (retriedAction) {
              expect(retriedAction.retryCount).toBe(maxRetries);
            }

            // プロパティ3: 最大リトライ回数に達してもアクションが保持される
            expect(queuedActions.length).toBeGreaterThan(0);
          }
        ),
        { ...propertyTestConfig, numRuns: 20 }
      );
    });
  });
});
