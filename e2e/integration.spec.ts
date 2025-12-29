import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { TaskHelper } from './helpers/task-helper';
import { TimerHelper } from './helpers/timer-helper';
import { StatisticsHelper } from './helpers/statistics-helper';
import { testUsers, generateTestData } from './fixtures/test-data';

/**
 * 統合テスト - 主要ユーザーフローのE2Eテスト
 * 複数の機能を組み合わせた実際の使用シナリオをテスト
 */
test.describe('統合テスト - 主要ユーザーフロー', () => {
  let authHelper: AuthHelper;
  let taskHelper: TaskHelper;
  let timerHelper: TimerHelper;
  let statisticsHelper: StatisticsHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    taskHelper = new TaskHelper(page);
    timerHelper = new TimerHelper(page);
    statisticsHelper = new StatisticsHelper(page);
  });

  test.describe('新規ユーザーのオンボーディングフロー', () => {
    test('新規ユーザーが登録から初回セッション完了まで実行できる', async ({
      page,
    }) => {
      // 新規ユーザーデータを生成
      const newUser = generateTestData.user();

      // 1. 新規ユーザー登録
      await authHelper.signup(
        newUser.email,
        newUser.password,
        newUser.displayName
      );

      // 2. ダッシュボードが表示されることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();

      // 3. 初回タスクを作成
      await page.goto('/tasks');
      await taskHelper.createTask('初回タスク', '最初のポモドーロタスク', 1, [
        '学習',
      ]);

      // 4. タイマー設定をカスタマイズ（短時間テスト用）
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1); // 1分設定

      // 5. タスクを選択してセッション開始
      await taskHelper.selectTaskForSession('初回タスク');
      await timerHelper.startTimer();

      // 6. セッション完了まで待機
      await timerHelper.waitForSessionComplete(90000);

      // 7. タスク完了確認
      await page.click('[data-testid="task-completed-button"]');

      // 8. 統計ページで結果確認
      await statisticsHelper.navigateToStatistics();

      // 9. 初回セッションが記録されていることを確認
      const todaySessions =
        await statisticsHelper.getStatValue('today-sessions');
      expect(parseInt(todaySessions)).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('日常的な作業フロー', () => {
    test('複数タスクでの1日の作業フローを実行できる', async ({ page }) => {
      // 事前準備：ログイン
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 1日の作業タスクを作成
      await page.goto('/tasks');
      await taskHelper.createTask('朝の会議準備', '資料確認と議題整理', 2, [
        '会議',
        '準備',
      ]);
      await taskHelper.createTask('コードレビュー', 'プルリクエストの確認', 1, [
        '開発',
        'レビュー',
      ]);
      await taskHelper.createTask('新機能実装', 'ユーザー認証機能の実装', 3, [
        '開発',
        '実装',
      ]);
      await taskHelper.createTask('ドキュメント更新', 'API仕様書の更新', 1, [
        'ドキュメント',
      ]);

      // 2. 短時間設定でテスト実行
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 2); // ポモドーロ1分、短い休憩1分、長い休憩2分

      // 3. 最初のタスク（朝の会議準備）を実行
      await taskHelper.selectTaskForSession('朝の会議準備');
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-continued-button"]'); // 継続

      // 4. 短い休憩
      await expect(
        page.locator('[data-testid="break-suggestion"]')
      ).toBeVisible();
      await page.click('[data-testid="start-short-break"]');
      await timerHelper.waitForSessionComplete(90000);

      // 5. 2回目のポモドーロ（同じタスク継続）
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]'); // 完了

      // 6. 次のタスク選択
      await page.click(
        '[data-testid="task-option"]:has-text("コードレビュー")'
      );
      await page.click('[data-testid="confirm-task-selection"]');

      // 7. 3回目のポモドーロ
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 8. 統計確認
      await statisticsHelper.navigateToStatistics();

      // 9. 3セッション完了していることを確認
      const todaySessions =
        await statisticsHelper.getStatValue('today-sessions');
      expect(parseInt(todaySessions)).toBeGreaterThanOrEqual(3);

      // 10. 完了タスクが記録されていることを確認
      await expect(
        page.locator('[data-testid="completed-tasks-count"]')
      ).toContainText('2');
    });

    test('長時間タスクの分割と実行フローが機能する', async ({ page }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 長時間タスクを作成
      await page.goto('/tasks');
      await taskHelper.createTask(
        '大規模リファクタリング',
        'レガシーコードの全面改修',
        8,
        ['開発', 'リファクタリング']
      );

      // 2. タスク分割提案の確認
      const taskItem = page.locator(
        '[data-testid="task-item"]:has-text("大規模リファクタリング")'
      );
      await expect(
        taskItem.locator('[data-testid="split-suggestion"]')
      ).toBeVisible();

      // 3. タスクを分割
      await taskItem.locator('[data-testid="split-task-button"]').click();
      await page.fill('[data-testid="subtask-count-input"]', '4');
      await page.click('[data-testid="confirm-split-button"]');

      // 4. サブタスクが作成されたことを確認
      await expect(
        page.locator(
          '[data-testid="task-item"]:has-text("大規模リファクタリング - 1/4")'
        )
      ).toBeVisible();
      await expect(
        page.locator(
          '[data-testid="task-item"]:has-text("大規模リファクタリング - 2/4")'
        )
      ).toBeVisible();

      // 5. 最初のサブタスクでセッション実行
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession('大規模リファクタリング - 1/4');
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 6. 次のサブタスクが自動提案されることを確認
      await expect(
        page.locator('[data-testid="next-task-suggestion"]')
      ).toContainText('大規模リファクタリング - 2/4');
    });
  });

  test.describe('マルチデバイス同期フロー', () => {
    test('複数ブラウザタブ間でデータ同期が機能する', async ({
      page,
      context,
    }) => {
      // 要件 13.1-13.5: マルチデバイス同期

      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 最初のタブでタスクを作成
      await page.goto('/tasks');
      await taskHelper.createTask(
        '同期テストタスク',
        '複数デバイス間での同期確認',
        1,
        ['テスト']
      );

      // 2. 新しいタブを開いて同じユーザーでログイン
      const secondTab = await context.newPage();
      const secondAuthHelper = new AuthHelper(secondTab);
      await secondAuthHelper.login(
        testUsers.basic.email,
        testUsers.basic.password
      );

      // 3. 2番目のタブでタスクが同期されていることを確認
      await secondTab.goto('/tasks');
      await expect(
        secondTab.locator(
          '[data-testid="task-item"]:has-text("同期テストタスク")'
        )
      ).toBeVisible();

      // 4. 2番目のタブでタスクを編集
      const secondTaskHelper = new TaskHelper(secondTab);
      await secondTaskHelper.editTask(
        '同期テストタスク',
        '同期テストタスク（編集済み）',
        '編集された説明'
      );

      // 5. 最初のタブで変更が反映されることを確認（リアルタイム同期）
      await page.waitForTimeout(2000); // 同期待機
      await expect(
        page.locator(
          '[data-testid="task-item"]:has-text("同期テストタスク（編集済み）")'
        )
      ).toBeVisible();

      // 6. 最初のタブでセッション実行
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession('同期テストタスク（編集済み）');
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 7. 2番目のタブで統計が更新されることを確認
      const secondStatisticsHelper = new StatisticsHelper(secondTab);
      await secondStatisticsHelper.navigateToStatistics();

      await secondTab.waitForTimeout(2000); // 同期待機
      const sessions =
        await secondStatisticsHelper.getStatValue('today-sessions');
      expect(parseInt(sessions)).toBeGreaterThanOrEqual(1);

      await secondTab.close();
    });
  });

  test.describe('オフライン・オンライン復旧フロー', () => {
    test('オフライン状態での作業とオンライン復旧が機能する', async ({
      page,
      context,
    }) => {
      // 要件 12.4-12.6: オフライン対応とネットワーク復旧時の同期

      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. オンライン状態でタスク作成
      await page.goto('/tasks');
      await taskHelper.createTask(
        'オフラインテストタスク',
        'オフライン機能のテスト',
        1,
        ['テスト']
      );

      // 2. ネットワークをオフラインに設定
      await context.setOffline(true);

      // 3. オフライン状態の表示確認
      await expect(
        page.locator('[data-testid="offline-indicator"]')
      ).toBeVisible();

      // 4. オフライン状態でもタイマーが動作することを確認
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession('オフラインテストタスク');
      await timerHelper.startTimer();

      // 5. オフライン状態でセッション完了
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 6. ローカルストレージにデータが保存されていることを確認
      const localData = await page.evaluate(() => {
        return localStorage.getItem('pomodoro-offline-data');
      });
      expect(localData).toBeTruthy();

      // 7. ネットワークを復旧
      await context.setOffline(false);

      // 8. オンライン復旧の表示確認
      await expect(page.locator('[data-testid="sync-status"]')).toContainText(
        '同期中'
      );

      // 9. 同期完了の確認
      await page.waitForTimeout(5000); // 同期処理待機
      await expect(page.locator('[data-testid="sync-status"]')).toContainText(
        '同期完了'
      );

      // 10. 統計ページでオフライン中のセッションが反映されていることを確認
      await statisticsHelper.navigateToStatistics();
      const sessions = await statisticsHelper.getStatValue('today-sessions');
      expect(parseInt(sessions)).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('エラー処理・復旧フロー', () => {
    test('ネットワークエラー時の適切なエラーハンドリングが機能する', async ({
      page,
    }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. ネットワークエラーをシミュレート
      await page.route('**/api/**', route => {
        route.abort('failed');
      });

      // 2. タスク作成を試行
      await page.goto('/tasks');
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'エラーテストタスク');
      await page.click('[data-testid="save-task-button"]');

      // 3. エラーメッセージが表示されることを確認
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'ネットワークエラー'
      );

      // 4. リトライボタンが表示されることを確認
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // 5. ネットワークを復旧
      await page.unroute('**/api/**');

      // 6. リトライを実行
      await page.click('[data-testid="retry-button"]');

      // 7. タスクが正常に作成されることを確認
      await expect(
        page.locator('[data-testid="task-item"]:has-text("エラーテストタスク")')
      ).toBeVisible();
    });

    test('セッション中断時の復旧が機能する', async ({ page }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. セッション開始
      await page.goto('/');
      await timerHelper.setCustomTime(5, 1, 1); // 5分設定
      await timerHelper.startTimer();

      // 2. セッション中にページをリロード（中断をシミュレート）
      await page.waitForTimeout(3000); // 3秒進める
      await page.reload();

      // 3. セッション復旧ダイアログが表示されることを確認
      await expect(
        page.locator('[data-testid="session-recovery-dialog"]')
      ).toBeVisible();

      // 4. セッション継続を選択
      await page.click('[data-testid="continue-session-button"]');

      // 5. タイマーが適切な時間で再開されることを確認
      const currentTime = await timerHelper.getCurrentTime();
      const [minutes, seconds] = currentTime.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;

      // 3秒程度進んでいることを確認（多少の誤差を許容）
      expect(totalSeconds).toBeLessThan(5 * 60); // 5分未満
      expect(totalSeconds).toBeGreaterThan(4 * 60); // 4分超
    });
  });

  test.describe('パフォーマンステスト', () => {
    test('大量データでもアプリケーションが正常に動作する', async ({ page }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 大量のタスクを作成（実際のテストでは事前にデータを準備）
      await page.goto('/tasks');

      // 複数のタスクを並列作成
      const taskPromises = [];
      for (let i = 0; i < 10; i++) {
        taskPromises.push(
          taskHelper.createTask(
            `パフォーマンステストタスク${i}`,
            `説明${i}`,
            1,
            [`タグ${i % 3}`]
          )
        );
      }

      // 2. タスク作成の完了を待機
      await Promise.all(taskPromises);

      // 3. タスクリストの表示パフォーマンスを確認
      const startTime = Date.now();
      await page.reload();
      await expect(
        page.locator('[data-testid="task-item"]').first()
      ).toBeVisible();
      const loadTime = Date.now() - startTime;

      // 3秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(3000);

      // 4. タスク数の確認
      const taskCount = await taskHelper.getTaskCount();
      expect(taskCount).toBeGreaterThanOrEqual(10);

      // 5. フィルタリング機能のパフォーマンス確認
      const filterStartTime = Date.now();
      await taskHelper.filterByTag('タグ0');
      const filterTime = Date.now() - filterStartTime;

      // 1秒以内にフィルタリングが完了することを確認
      expect(filterTime).toBeLessThan(1000);
    });

    test('長時間使用でもメモリリークが発生しない', async ({ page }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 初期メモリ使用量を記録
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 2. 複数回のセッション実行をシミュレート
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);

      for (let i = 0; i < 5; i++) {
        await timerHelper.startTimer();
        await timerHelper.waitForSessionComplete(90000);
        await timerHelper.resetTimer();
        await page.waitForTimeout(1000);
      }

      // 3. 最終メモリ使用量を確認
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // 4. メモリ増加が許容範囲内であることを確認（2倍以下）
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory / initialMemory;
        expect(memoryIncrease).toBeLessThan(2.0);
      }
    });
  });

  test.describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーションが機能する', async ({ page }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. タブキーでナビゲーション
      await page.goto('/');

      // 2. タイマー開始ボタンにフォーカス
      await page.keyboard.press('Tab');
      await expect(
        page.locator('[data-testid="timer-start-button"]')
      ).toBeFocused();

      // 3. Enterキーでタイマー開始
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '実行中'
      );

      // 4. タブキーで一時停止ボタンに移動
      await page.keyboard.press('Tab');
      await expect(
        page.locator('[data-testid="timer-pause-button"]')
      ).toBeFocused();

      // 5. Enterキーで一時停止
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '一時停止'
      );
    });

    test('スクリーンリーダー用のARIAラベルが適切に設定されている', async ({
      page,
    }) => {
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // 1. 主要要素のARIAラベル確認
      await page.goto('/');

      // タイマー表示
      await expect(
        page.locator('[data-testid="timer-display"]')
      ).toHaveAttribute('aria-label');

      // タイマーボタン
      await expect(
        page.locator('[data-testid="timer-start-button"]')
      ).toHaveAttribute('aria-label');

      // 2. タスクページでのARIAラベル確認
      await page.goto('/tasks');

      // タスクリスト
      await expect(page.locator('[data-testid="task-list"]')).toHaveAttribute(
        'role',
        'list'
      );

      // タスク項目
      const taskItems = page.locator('[data-testid="task-item"]');
      if ((await taskItems.count()) > 0) {
        await expect(taskItems.first()).toHaveAttribute('role', 'listitem');
      }
    });
  });
});
