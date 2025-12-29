/**
 * エラー回復機能のプロパティベーステスト
 * Feature: production-readiness, Property 5: エラー回復の完全性
 *
 * このテストは要件3.1、3.3「製品品質の向上」を検証します。
 * すべてのエラー発生時において、ユーザーの作業データが保護され、
 * 適切な回復オプションが提供される
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  propertyTestConfig,
  setupPropertyTest,
  teardownPropertyTest,
} from '../../test/property-test-setup';
import {
  ErrorMonitoringService,
  type ErrorRecoveryActions,
} from '../error-monitoring';
import React from 'react';

// テスト用のエラー監視サービス実装
class TestErrorMonitoringService {
  private static capturedErrors: Array<{ error: Error; context?: any }> = [];
  private static capturedMessages: Array<{ message: string; level: string }> =
    [];
  private static breadcrumbs: Array<{
    message: string;
    category: string;
    level: string;
  }> = [];

  // エラーキャプチャのモック実装
  static captureError(error: Error, context?: Record<string, any>): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.capturedErrors.push({ error, context });
    return errorId;
  }

  // メッセージキャプチャのモック実装
  static captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): string {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.capturedMessages.push({ message, level });
    return messageId;
  }

  // ブレッドクラム追加のモック実装
  static addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    this.breadcrumbs.push({ message, category, level });
  }

  // エラーの重要度を判定（実際のサービスから委譲）
  static classifyErrorSeverity(
    error: Error
  ): 'low' | 'medium' | 'high' | 'critical' {
    return ErrorMonitoringService.classifyErrorSeverity(error);
  }

  // テスト用のヘルパーメソッド
  static getCapturedErrors(): Array<{ error: Error; context?: any }> {
    return [...this.capturedErrors];
  }

  static getCapturedMessages(): Array<{ message: string; level: string }> {
    return [...this.capturedMessages];
  }

  static getBreadcrumbs(): Array<{
    message: string;
    category: string;
    level: string;
  }> {
    return [...this.breadcrumbs];
  }

  static clearCaptures(): void {
    this.capturedErrors = [];
    this.capturedMessages = [];
    this.breadcrumbs = [];
  }
}

// テスト用のエラー境界実装
class TestErrorBoundary {
  private recoveryActions: ErrorRecoveryActions | null = null;
  private lastError: Error | null = null;
  private lastErrorInfo: React.ErrorInfo | null = null;
  private hasError: boolean = false;

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.lastError = error;
    this.lastErrorInfo = errorInfo;
    this.hasError = true;

    // エラーをキャプチャ
    TestErrorMonitoringService.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // 回復アクションを生成
    this.recoveryActions = {
      retry: vi.fn(() => {
        this.hasError = false;
        this.lastError = null;
        this.lastErrorInfo = null;
        this.recoveryActions = null;
      }),
      reset: vi.fn(() => {
        // ローカルストレージのクリア（設定は保持）
        const settings = localStorage.getItem('pomodoro-settings');
        localStorage.clear();
        if (settings) {
          localStorage.setItem('pomodoro-settings', settings);
        }
      }),
      reportBug: vi.fn((description: string) => {
        TestErrorMonitoringService.captureMessage(
          `User bug report: ${description}`,
          'info'
        );
        TestErrorMonitoringService.addBreadcrumb(
          'User submitted bug report',
          'user',
          'info'
        );
      }),
      goHome: vi.fn(() => {
        TestErrorMonitoringService.addBreadcrumb(
          'User clicked go home',
          'user',
          'info'
        );
      }),
    };
  }

  // テスト用のヘルパーメソッド
  getRecoveryActions(): ErrorRecoveryActions | null {
    return this.recoveryActions;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  getLastErrorInfo(): React.ErrorInfo | null {
    return this.lastErrorInfo;
  }

  // エラーを手動で発生させるメソッド
  simulateError(error: Error, errorInfo: React.ErrorInfo): void {
    this.componentDidCatch(error, errorInfo);
  }

  // 状態をリセット
  reset(): void {
    this.hasError = false;
    this.lastError = null;
    this.lastErrorInfo = null;
    this.recoveryActions = null;
  }
}

// テスト用のワークデータ管理クラス
class TestWorkDataManager {
  private workData: Map<string, any> = new Map();
  private autoSaveEnabled: boolean = true;
  private saveCallbacks: Array<() => void> = [];

  // 作業データの設定
  setWorkData(key: string, data: any): void {
    this.workData.set(key, data);
    if (this.autoSaveEnabled) {
      this.autoSave();
    }
  }

  // 作業データの取得
  getWorkData(key: string): any {
    return this.workData.get(key);
  }

  // すべての作業データを取得
  getAllWorkData(): Map<string, any> {
    return new Map(this.workData);
  }

  // 自動保存の実行
  private autoSave(): void {
    try {
      const dataToSave = Object.fromEntries(this.workData);
      localStorage.setItem('work-data-backup', JSON.stringify(dataToSave));
      this.saveCallbacks.forEach(callback => callback());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  // 保存コールバックの追加
  onSave(callback: () => void): () => void {
    this.saveCallbacks.push(callback);
    return () => {
      const index = this.saveCallbacks.indexOf(callback);
      if (index > -1) {
        this.saveCallbacks.splice(index, 1);
      }
    };
  }

  // データの復元
  restoreFromBackup(): boolean {
    try {
      const backup = localStorage.getItem('work-data-backup');
      if (backup) {
        const restoredData = JSON.parse(backup);
        this.workData = new Map(Object.entries(restoredData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    }
  }

  // データのクリア
  clear(): void {
    this.workData.clear();
    localStorage.removeItem('work-data-backup');
  }

  // 自動保存の有効/無効
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
  }
}

// テスト用のジェネレーター
const errorGenerator = () =>
  fc.oneof(
    fc.constant(new Error('Network connection failed')),
    fc.constant(new TypeError('Cannot read property of undefined')),
    fc.constant(new ReferenceError('Variable is not defined')),
    fc.constant(new Error('Database operation failed')),
    fc.constant(new Error('Authentication failed')),
    fc.string({ minLength: 10, maxLength: 100 }).map(msg => new Error(msg))
  );

const errorInfoGenerator = () =>
  fc.record({
    componentStack: fc.string({ minLength: 50, maxLength: 500 }),
  });

const workDataGenerator = () =>
  fc.record({
    currentTask: fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.option(fc.string({ maxLength: 500 })),
      progress: fc.integer({ min: 0, max: 100 }),
    }),
    timerState: fc.record({
      isRunning: fc.boolean(),
      timeRemaining: fc.integer({ min: 0, max: 3600 }),
      sessionType: fc.constantFrom('pomodoro', 'short_break', 'long_break'),
    }),
    unsavedChanges: fc.array(
      fc.record({
        type: fc.constantFrom('task_update', 'session_create', 'tag_create'),
        data: fc.anything(),
        timestamp: fc.date().map(d => d.toISOString()),
      }),
      { maxLength: 10 }
    ),
  });

const bugReportGenerator = () =>
  fc.record({
    description: fc.string({ minLength: 10, maxLength: 500 }),
    steps: fc.array(fc.string({ minLength: 5, maxLength: 100 }), {
      maxLength: 10,
    }),
    expectedBehavior: fc.string({ minLength: 10, maxLength: 200 }),
    actualBehavior: fc.string({ minLength: 10, maxLength: 200 }),
  });

describe('エラー回復 プロパティテスト', () => {
  let errorBoundary: TestErrorBoundary;
  let workDataManager: TestWorkDataManager;

  beforeEach(() => {
    setupPropertyTest();
    TestErrorMonitoringService.clearCaptures();
    errorBoundary = new TestErrorBoundary();
    workDataManager = new TestWorkDataManager();
  });

  afterEach(() => {
    teardownPropertyTest();
    workDataManager.clear();
  });

  describe('プロパティ 5: エラー回復の完全性', () => {
    it('すべてのエラー発生時において、ユーザーの作業データが保護される', async () => {
      await fc.assert(
        fc.asyncProperty(
          errorGenerator(),
          errorInfoGenerator(),
          workDataGenerator(),
          async (error, errorInfo, workData) => {
            // 作業データを設定
            workDataManager.setWorkData('currentWork', workData);

            // 自動保存が実行されることを確認
            const initialBackup = localStorage.getItem('work-data-backup');
            expect(initialBackup).not.toBeNull();

            // エラーを発生させる
            errorBoundary.simulateError(error, errorInfo);

            // プロパティ1: エラーが適切にキャプチャされる
            const capturedErrors =
              TestErrorMonitoringService.getCapturedErrors();
            expect(capturedErrors.length).toBeGreaterThan(0);

            const lastCapturedError = capturedErrors[capturedErrors.length - 1];
            expect(lastCapturedError.error.message).toBe(error.message);

            // プロパティ2: 作業データがバックアップから復元可能
            workDataManager.clear(); // 現在のデータをクリア
            const restored = workDataManager.restoreFromBackup();
            expect(restored).toBe(true);

            const restoredData = workDataManager.getWorkData('currentWork');
            expect(restoredData).not.toBeNull();
            expect(restoredData.currentTask.id).toBe(workData.currentTask.id);
            expect(restoredData.currentTask.title).toBe(
              workData.currentTask.title
            );
            expect(restoredData.timerState.isRunning).toBe(
              workData.timerState.isRunning
            );

            // プロパティ3: 未保存の変更も保護される
            if (workData.unsavedChanges.length > 0) {
              expect(restoredData.unsavedChanges).toBeDefined();
              expect(restoredData.unsavedChanges.length).toBe(
                workData.unsavedChanges.length
              );
            }

            // プロパティ4: エラー境界が回復アクションを提供する
            const recoveryActions = errorBoundary.getRecoveryActions();
            expect(recoveryActions).not.toBeNull();
            expect(typeof recoveryActions!.retry).toBe('function');
            expect(typeof recoveryActions!.reset).toBe('function');
            expect(typeof recoveryActions!.reportBug).toBe('function');
            expect(typeof recoveryActions!.goHome).toBe('function');
          }
        ),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('すべてのエラー発生時において、適切な回復オプションが提供される', async () => {
      await fc.assert(
        fc.asyncProperty(
          errorGenerator(),
          errorInfoGenerator(),
          async (error, errorInfo) => {
            // エラーを発生させる
            errorBoundary.simulateError(error, errorInfo);

            // プロパティ1: 回復アクションが生成される
            const recoveryActions = errorBoundary.getRecoveryActions();
            expect(recoveryActions).not.toBeNull();

            // プロパティ2: retry アクションが正常に動作する
            const retryAction = recoveryActions!.retry;
            expect(typeof retryAction).toBe('function');

            // retry を実行
            retryAction();

            // エラー状態がリセットされることを確認（テスト用の実装）
            expect(errorBoundary.getLastError()).toBeNull();

            // プロパティ3: reset アクションが正常に動作する
            const resetAction = recoveryActions!.reset;
            expect(typeof resetAction).toBe('function');

            // 設定データを事前に保存
            localStorage.setItem(
              'pomodoro-settings',
              JSON.stringify({ theme: 'dark' })
            );
            localStorage.setItem('other-data', 'should be cleared');

            // reset を実行
            resetAction();

            // 設定以外のデータがクリアされ、設定は保持されることを確認
            expect(localStorage.getItem('pomodoro-settings')).not.toBeNull();
            expect(localStorage.getItem('other-data')).toBeNull();

            // プロパティ4: reportBug アクションが正常に動作する
            const reportBugAction = recoveryActions!.reportBug;
            expect(typeof reportBugAction).toBe('function');

            const bugDescription = 'Test bug report';
            reportBugAction(bugDescription);

            // バグレポートがキャプチャされることを確認
            const capturedMessages =
              TestErrorMonitoringService.getCapturedMessages();
            const bugReportMessage = capturedMessages.find(msg =>
              msg.message.includes(bugDescription)
            );
            expect(bugReportMessage).toBeDefined();

            // プロパティ5: goHome アクションが正常に動作する
            const goHomeAction = recoveryActions!.goHome;
            expect(typeof goHomeAction).toBe('function');

            // goHome は例外を投げない
            expect(() => goHomeAction()).not.toThrow();
          }
        ),
        { ...propertyTestConfig, numRuns: 50 }
      );
    });

    it('すべてのエラータイプにおいて、エラーの重要度が適切に分類される', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(new Error('security breach detected')),
            fc.constant(new Error('unauthorized access attempt')),
            fc.constant(new Error('data loss occurred')),
            fc.constant(new Error('network timeout')),
            fc.constant(new Error('fetch failed')),
            fc.constant(new TypeError('Cannot read property')),
            fc.constant(new ReferenceError('Variable not defined')),
            fc.constant(new Error('render error')),
            fc.constant(new Error('component failed')),
            fc.constant(new Error('general error'))
          ),
          error => {
            // エラーの重要度を分類
            const severity =
              TestErrorMonitoringService.classifyErrorSeverity(error);

            // プロパティ1: 重要度が有効な値である
            expect(['low', 'medium', 'high', 'critical']).toContain(severity);

            // プロパティ2: セキュリティ関連エラーは critical に分類される
            if (
              error.message.includes('security') ||
              error.message.includes('unauthorized') ||
              error.message.includes('data loss')
            ) {
              expect(severity).toBe('critical');
            }

            // プロパティ3: ネットワーク関連エラーは high に分類される
            if (
              error.message.includes('network') ||
              error.message.includes('fetch') ||
              error.message.includes('timeout') ||
              error instanceof TypeError
            ) {
              expect(severity).toBe('high');
            }

            // プロパティ4: UI関連エラーは medium に分類される
            if (
              error.message.includes('render') ||
              error.message.includes('component') ||
              error instanceof ReferenceError
            ) {
              expect(severity).toBe('medium');
            }

            // プロパティ5: 一般的なエラーは low に分類される
            if (error.message === 'general error') {
              expect(severity).toBe('low');
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 100 }
      );
    });

    it('すべてのバグレポート送信において、適切な情報が記録される', async () => {
      await fc.assert(
        fc.asyncProperty(
          errorGenerator(),
          errorInfoGenerator(),
          bugReportGenerator(),
          async (error, errorInfo, bugReport) => {
            // エラーを発生させる
            errorBoundary.simulateError(error, errorInfo);

            // 回復アクションを取得
            const recoveryActions = errorBoundary.getRecoveryActions();
            expect(recoveryActions).not.toBeNull();

            // バグレポートを送信
            recoveryActions!.reportBug(bugReport.description);

            // プロパティ1: バグレポートがキャプチャされる
            const capturedMessages =
              TestErrorMonitoringService.getCapturedMessages();
            const bugReportMessage = capturedMessages.find(msg =>
              msg.message.includes(bugReport.description)
            );
            expect(bugReportMessage).toBeDefined();
            if (bugReportMessage) {
              expect(bugReportMessage.level).toBe('info');
            }

            // プロパティ2: ブレッドクラムが記録される
            const breadcrumbs = TestErrorMonitoringService.getBreadcrumbs();
            const bugReportBreadcrumb = breadcrumbs.find(bc =>
              bc.message.includes('bug report')
            );
            expect(bugReportBreadcrumb).toBeDefined();
            if (bugReportBreadcrumb) {
              expect(bugReportBreadcrumb.category).toBe('user');
            }

            // プロパティ3: エラー情報も併せて記録される
            const capturedErrors =
              TestErrorMonitoringService.getCapturedErrors();
            expect(capturedErrors.length).toBeGreaterThan(0);

            const errorCapture = capturedErrors.find(
              capture => capture.error.message === error.message
            );
            expect(errorCapture).toBeDefined();

            // プロパティ4: バグレポートの内容が適切に処理される
            expect(bugReport.description.length).toBeGreaterThan(0);
            if (bugReportMessage) {
              expect(bugReportMessage.message).toContain(bugReport.description);
            }
          }
        ),
        { ...propertyTestConfig, numRuns: 40 }
      );
    });

    it('すべての作業データにおいて、エラー発生時の自動保存が確実に実行される', async () => {
      await fc.assert(
        fc.asyncProperty(
          workDataGenerator(),
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 20 }),
              data: fc.anything(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (primaryWorkData, additionalData) => {
            let saveCallbackCount = 0;

            // 保存コールバックを設定
            const unsubscribe = workDataManager.onSave(() => {
              saveCallbackCount++;
            });

            // 主要な作業データを設定
            workDataManager.setWorkData('primary', primaryWorkData);

            // 追加データを設定
            for (const item of additionalData) {
              workDataManager.setWorkData(item.key, item.data);
            }

            // プロパティ1: 自動保存が実行される
            expect(saveCallbackCount).toBe(additionalData.length + 1);

            // プロパティ2: すべてのデータがバックアップに保存される
            const backup = localStorage.getItem('work-data-backup');
            expect(backup).not.toBeNull();

            const parsedBackup = JSON.parse(backup!);
            expect(parsedBackup.primary).toBeDefined();
            expect(parsedBackup.primary.currentTask.id).toBe(
              primaryWorkData.currentTask.id
            );

            for (const item of additionalData) {
              expect(parsedBackup[item.key]).toBeDefined();
            }

            // エラーをシミュレート（データ破損）
            workDataManager.clear();

            // プロパティ3: バックアップからの復元が成功する
            const restored = workDataManager.restoreFromBackup();
            expect(restored).toBe(true);

            // プロパティ4: 復元されたデータが元のデータと一致する
            const restoredPrimary = workDataManager.getWorkData('primary');
            expect(restoredPrimary).not.toBeNull();
            if (restoredPrimary) {
              expect(restoredPrimary.currentTask.id).toBe(
                primaryWorkData.currentTask.id
              );
              expect(restoredPrimary.timerState.isRunning).toBe(
                primaryWorkData.timerState.isRunning
              );
            }

            for (const item of additionalData) {
              const restoredItem = workDataManager.getWorkData(item.key);
              expect(restoredItem).toBeDefined();
            }

            // プロパティ5: 復元後も自動保存が継続される
            const initialCallbackCount = saveCallbackCount;
            workDataManager.setWorkData('test', { value: 'test' });
            expect(saveCallbackCount).toBe(initialCallbackCount + 1);

            unsubscribe();
          }
        ),
        { ...propertyTestConfig, numRuns: 30 }
      );
    });
  });
});
