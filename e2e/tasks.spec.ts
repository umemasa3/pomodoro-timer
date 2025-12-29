import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { TaskHelper } from './helpers/task-helper';
import { TimerHelper } from './helpers/timer-helper';
import { testUsers, testTasks } from './fixtures/test-data';

/**
 * タスク管理機能のE2Eテスト
 * 要件: 7.1-7.7 (タスク管理), 8.1-8.5 (タグ管理), 9.1-9.4 (タスク時間見積もり), 10.1-10.7 (セッション・タスク連携)
 */
test.describe('タスク管理機能', () => {
  let authHelper: AuthHelper;
  let taskHelper: TaskHelper;
  let timerHelper: TimerHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    taskHelper = new TaskHelper(page);
    timerHelper = new TimerHelper(page);

    // テスト前にログイン
    await authHelper.login(testUsers.basic.email, testUsers.basic.password);

    // タスクページに移動
    await page.goto('/tasks');
  });

  test.describe('タスクCRUD操作', () => {
    test('新しいタスクを作成できる', async ({ page }) => {
      // 要件 7.1: ユーザーがタスクを追加する THEN システムはタスク名と説明を保存する

      const task = testTasks.basic;
      await taskHelper.createTask(
        task.title,
        task.description,
        task.estimatedPomodoros,
        task.tags
      );

      // タスクが作成されたことを確認
      await expect(
        page.locator(`[data-testid="task-item"]:has-text("${task.title}")`)
      ).toBeVisible();

      // タスクの詳細が正しく表示されることを確認
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${task.title}")`
      );
      await expect(
        taskItem.locator('[data-testid="task-description"]')
      ).toContainText(task.description);
      await expect(
        taskItem.locator('[data-testid="estimated-pomodoros"]')
      ).toContainText(task.estimatedPomodoros.toString());
    });

    test('タスクを編集できる', async ({ page }) => {
      // 要件 7.2: ユーザーがタスクを編集する THEN システムは変更内容を反映する

      // まずタスクを作成
      const originalTask = testTasks.basic;
      await taskHelper.createTask(originalTask.title, originalTask.description);

      // タスクを編集
      const newTitle = '編集されたタスク';
      const newDescription = '編集された説明';
      await taskHelper.editTask(originalTask.title, newTitle, newDescription);

      // 編集が反映されたことを確認
      await expect(
        page.locator(`[data-testid="task-item"]:has-text("${newTitle}")`)
      ).toBeVisible();
      await expect(
        page.locator(
          `[data-testid="task-item"]:has-text("${originalTask.title}")`
        )
      ).not.toBeVisible();
    });

    test('タスクを削除できる', async ({ page }) => {
      // 要件 7.3: ユーザーがタスクを削除する THEN システムはタスクをリストから除去する

      // まずタスクを作成
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);

      // タスクを削除
      await taskHelper.deleteTask(task.title);

      // タスクが削除されたことを確認
      await expect(
        page.locator(`[data-testid="task-item"]:has-text("${task.title}")`)
      ).not.toBeVisible();
    });

    test('タスクを完了としてマークできる', async ({ page }) => {
      // 要件 7.4: ユーザーがタスクを完了としてマークする THEN システムはタスクの状態を完了に変更する

      // まずタスクを作成
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);

      // タスクを完了としてマーク
      await taskHelper.completeTask(task.title);

      // タスクが完了状態になったことを確認
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${task.title}")`
      );
      await expect(taskItem).toHaveClass(/completed/);
      await expect(
        taskItem.locator('[data-testid="task-status"]')
      ).toContainText('完了');
    });

    test('未完了タスクのリストが表示される', async ({ page }) => {
      // 要件 7.5: システムは未完了タスクのリストを表示する

      // 複数のタスクを作成
      await taskHelper.createTask('タスク1', '説明1');
      await taskHelper.createTask('タスク2', '説明2');
      await taskHelper.createTask('タスク3', '説明3');

      // 1つのタスクを完了にする
      await taskHelper.completeTask('タスク2');

      // 未完了タスクフィルターを適用
      await taskHelper.filterTasks('pending');

      // 未完了タスクのみが表示されることを確認
      await expect(
        page.locator('[data-testid="task-item"]:has-text("タスク1")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("タスク3")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("タスク2")')
      ).not.toBeVisible();
    });
  });

  test.describe('タグ管理', () => {
    test('タスクにタグを追加できる', async ({ page }) => {
      // 要件 7.6: ユーザーがタスクにタグを追加する THEN システムはタグをタスクに関連付けて保存する

      const task = testTasks.basic;
      await taskHelper.createTask(
        task.title,
        task.description,
        task.estimatedPomodoros,
        task.tags
      );

      // タグが表示されることを確認
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${task.title}")`
      );
      for (const tag of task.tags) {
        await expect(
          taskItem.locator(`[data-testid="task-tag"]:has-text("${tag}")`)
        ).toBeVisible();
      }
    });

    test('タグでタスクをフィルタリングできる', async ({ page }) => {
      // 要件 7.7: ユーザーがタグでタスクをフィルタリングする THEN システムは指定されたタグを持つタスクのみを表示する

      // 異なるタグを持つタスクを作成
      await taskHelper.createTask('開発タスク', '開発作業', 2, ['開発']);
      await taskHelper.createTask('テストタスク', 'テスト作業', 1, ['テスト']);
      await taskHelper.createTask('混合タスク', '開発とテスト', 3, [
        '開発',
        'テスト',
      ]);

      // 「開発」タグでフィルタリング
      await taskHelper.filterByTag('開発');

      // 「開発」タグを持つタスクのみが表示されることを確認
      await expect(
        page.locator('[data-testid="task-item"]:has-text("開発タスク")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("混合タスク")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("テストタスク")')
      ).not.toBeVisible();
    });

    test('新しいタグを作成できる', async ({ page }) => {
      // 要件 8.1: ユーザーがタグを作成する THEN システムはタグ名と色を設定できる

      // タグ管理画面を開く
      await page.click('[data-testid="manage-tags-button"]');

      // 新しいタグを作成
      await page.click('[data-testid="create-tag-button"]');
      await page.fill('[data-testid="tag-name-input"]', '新しいタグ');
      await page.click(
        '[data-testid="tag-color-picker"] [data-color="#FF5733"]'
      );
      await page.click('[data-testid="save-tag-button"]');

      // タグが作成されたことを確認
      await expect(
        page.locator(
          '[data-testid="tag-list"] [data-testid="tag-item"]:has-text("新しいタグ")'
        )
      ).toBeVisible();
    });

    test('タグを編集できる', async ({ page }) => {
      // 要件 8.2: ユーザーがタグを編集する THEN システムはタグの名前と色を変更できる

      // まずタグを作成
      await page.click('[data-testid="manage-tags-button"]');
      await page.click('[data-testid="create-tag-button"]');
      await page.fill('[data-testid="tag-name-input"]', '編集前タグ');
      await page.click('[data-testid="save-tag-button"]');

      // タグを編集
      await page.click(
        '[data-testid="tag-item"]:has-text("編集前タグ") [data-testid="edit-tag-button"]'
      );
      await page.fill('[data-testid="tag-name-input"]', '編集後タグ');
      await page.click(
        '[data-testid="tag-color-picker"] [data-color="#33FF57"]'
      );
      await page.click('[data-testid="save-tag-button"]');

      // 編集が反映されたことを確認
      await expect(
        page.locator('[data-testid="tag-item"]:has-text("編集後タグ")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="tag-item"]:has-text("編集前タグ")')
      ).not.toBeVisible();
    });

    test('タグを削除できる', async ({ page }) => {
      // 要件 8.3: ユーザーがタグを削除する THEN システムは関連するタスクからタグを除去する

      // タグ付きタスクを作成
      await taskHelper.createTask('タグ付きタスク', '説明', 1, [
        '削除予定タグ',
      ]);

      // タグ管理画面でタグを削除
      await page.click('[data-testid="manage-tags-button"]');
      await page.click(
        '[data-testid="tag-item"]:has-text("削除予定タグ") [data-testid="delete-tag-button"]'
      );
      await page.click('[data-testid="confirm-delete-tag-button"]');

      // タスクページに戻る
      await page.click('[data-testid="close-tag-management"]');

      // タスクからタグが除去されたことを確認
      const taskItem = page.locator(
        '[data-testid="task-item"]:has-text("タグ付きタスク")'
      );
      await expect(
        taskItem.locator('[data-testid="task-tag"]:has-text("削除予定タグ")')
      ).not.toBeVisible();
    });
  });

  test.describe('タスク時間見積もり', () => {
    test('タスクに時間見積もりを設定できる', async ({ page }) => {
      // 要件 9.1: ユーザーがタスクに時間見積もりを設定する THEN システムは見積もり時間をポモドーロセッション単位で保存する

      const task = testTasks.longTask;
      await taskHelper.createTask(
        task.title,
        task.description,
        task.estimatedPomodoros
      );

      // 見積もり時間が表示されることを確認
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${task.title}")`
      );
      await expect(
        taskItem.locator('[data-testid="estimated-pomodoros"]')
      ).toContainText(`${task.estimatedPomodoros}ポモドーロ`);
    });

    test('25分超過タスクの分割提案が表示される', async ({ page }) => {
      // 要件 9.2: タスクの見積もり時間が25分を超える THEN システムはタスク分割を提案する

      // 長時間タスクを作成（5ポモドーロ = 125分）
      const longTask = testTasks.longTask;
      await taskHelper.createTask(
        longTask.title,
        longTask.description,
        longTask.estimatedPomodoros
      );

      // 分割提案が表示されることを確認
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${longTask.title}")`
      );
      await expect(
        taskItem.locator('[data-testid="split-suggestion"]')
      ).toBeVisible();
      await expect(
        taskItem.locator('[data-testid="split-suggestion"]')
      ).toContainText('分割を提案');
    });

    test('タスク分割を実行できる', async ({ page }) => {
      // 要件 9.3, 9.4: タスク分割の実行とサブタスクの生成

      // 長時間タスクを作成
      const longTask = testTasks.longTask;
      await taskHelper.createTask(
        longTask.title,
        longTask.description,
        longTask.estimatedPomodoros
      );

      // 分割を実行
      const taskItem = page.locator(
        `[data-testid="task-item"]:has-text("${longTask.title}")`
      );
      await taskItem.locator('[data-testid="split-task-button"]').click();

      // 分割設定ダイアログで設定
      await page.fill('[data-testid="subtask-count-input"]', '3');
      await page.click('[data-testid="confirm-split-button"]');

      // サブタスクが作成されたことを確認
      await expect(
        page.locator('[data-testid="task-item"]:has-text("長時間タスク - 1/3")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("長時間タスク - 2/3")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("長時間タスク - 3/3")')
      ).toBeVisible();
    });
  });

  test.describe('セッション・タスク連携', () => {
    test('セッション開始時にタスクを選択できる', async ({ page }) => {
      // 要件 10.1: ユーザーがポモドーロセッションを開始する THEN システムは実行するタスクの選択を促す

      // タスクを作成
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);

      // メインページに戻る
      await page.goto('/');

      // タイマー開始時にタスク選択ダイアログが表示されることを確認
      await page.click('[data-testid="timer-start-button"]');

      // タスク選択ダイアログが表示される
      await expect(
        page.locator('[data-testid="task-selection-dialog"]')
      ).toBeVisible();

      // タスクを選択
      await page.click(`[data-testid="task-option"]:has-text("${task.title}")`);
      await page.click('[data-testid="confirm-task-selection"]');

      // 選択されたタスクが表示されることを確認
      await expect(
        page.locator('[data-testid="current-task-display"]')
      ).toContainText(task.title);
    });

    test('セッション中にタスク名が表示される', async ({ page }) => {
      // 要件 10.2: タスクが選択される THEN システムはセッション中にタスク名を表示する

      // タスクを作成して選択
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);
      await page.goto('/');

      // タスクを選択してセッション開始
      await taskHelper.selectTaskForSession(task.title);
      await timerHelper.startTimer();

      // セッション中にタスク名が表示されることを確認
      await expect(
        page.locator('[data-testid="current-task-display"]')
      ).toContainText(task.title);
      await expect(
        page.locator('[data-testid="current-task-display"]')
      ).toBeVisible();
    });

    test('セッション完了時にタスク進捗更新が促される', async ({ page }) => {
      // 要件 10.3: ポモドーロセッションが完了する THEN システムはタスクの進捗更新を促す

      // タスクを作成
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);
      await page.goto('/');

      // 短時間設定でセッション実行
      await timerHelper.setCustomTime(1, 1, 1); // 1分設定
      await taskHelper.selectTaskForSession(task.title);
      await timerHelper.startTimer();

      // セッション完了を待機
      await timerHelper.waitForSessionComplete(90000);

      // タスク完了確認ダイアログが表示されることを確認
      await expect(
        page.locator('[data-testid="task-completion-dialog"]')
      ).toBeVisible();
    });

    test('タスク完了確認で選択肢が提供される', async ({ page }) => {
      // 要件 10.4, 10.1.1-10.1.3: タスク完了確認システム

      // タスクを作成してセッション実行
      const task = testTasks.shortTask;
      await taskHelper.createTask(task.title, task.description);
      await page.goto('/');

      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession(task.title);
      await timerHelper.startTimer();

      // セッション完了を待機
      await timerHelper.waitForSessionComplete(90000);

      // 完了確認ダイアログの選択肢を確認
      const dialog = page.locator('[data-testid="task-completion-dialog"]');
      await expect(
        dialog.locator('[data-testid="task-completed-button"]')
      ).toBeVisible();
      await expect(
        dialog.locator('[data-testid="task-continued-button"]')
      ).toBeVisible();
      await expect(
        dialog.locator('[data-testid="task-paused-button"]')
      ).toBeVisible();
    });

    test('タスク完了選択時に次のタスク選択が提案される', async ({ page }) => {
      // 要件 10.5: ユーザーがタスクを完了とマークした場合 THEN システムは次のタスクの選択を提案する

      // 複数のタスクを作成
      await taskHelper.createTask('タスク1', '最初のタスク');
      await taskHelper.createTask('タスク2', '次のタスク');
      await page.goto('/');

      // セッション実行
      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession('タスク1');
      await timerHelper.startTimer();

      // セッション完了後、タスクを完了としてマーク
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 次のタスク選択ダイアログが表示されることを確認
      await expect(
        page.locator('[data-testid="next-task-selection-dialog"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-option"]:has-text("タスク2")')
      ).toBeVisible();
    });

    test('セッション履歴にタスク情報が記録される', async ({ page }) => {
      // 要件 10.7: セッション履歴を確認する THEN システムは各セッションで実行したタスクを表示する

      // タスクを作成してセッション実行
      const task = testTasks.basic;
      await taskHelper.createTask(task.title, task.description);
      await page.goto('/');

      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession(task.title);
      await timerHelper.startTimer();

      // セッション完了
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 統計ページでセッション履歴を確認
      await page.goto('/statistics');

      // セッション履歴にタスク名が記録されていることを確認
      const historyItem = page
        .locator('[data-testid="session-history-item"]')
        .first();
      await expect(
        historyItem.locator('[data-testid="session-task-name"]')
      ).toContainText(task.title);
    });
  });

  test.describe('タスク検索・フィルタリング', () => {
    test('タスクを検索できる', async ({ page }) => {
      // 複数のタスクを作成
      await taskHelper.createTask('重要な会議の準備', '明日の会議資料作成');
      await taskHelper.createTask('コードレビュー', 'プルリクエストの確認');
      await taskHelper.createTask('会議議事録作成', '今日の会議の記録');

      // 検索機能を使用
      await page.fill('[data-testid="task-search-input"]', '会議');

      // 検索結果の確認
      await expect(
        page.locator('[data-testid="task-item"]:has-text("重要な会議の準備")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("会議議事録作成")')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="task-item"]:has-text("コードレビュー")')
      ).not.toBeVisible();
    });

    test('タスクを優先度でソートできる', async ({ page }) => {
      // 異なる優先度のタスクを作成
      await taskHelper.createTask('低優先度タスク', '説明', 1, [], 'low');
      await taskHelper.createTask('高優先度タスク', '説明', 1, [], 'high');
      await taskHelper.createTask('中優先度タスク', '説明', 1, [], 'medium');

      // 優先度でソート
      await page.click('[data-testid="sort-by-priority"]');

      // ソート順の確認（高→中→低）
      const taskItems = page.locator('[data-testid="task-item"]');
      await expect(taskItems.nth(0)).toContainText('高優先度タスク');
      await expect(taskItems.nth(1)).toContainText('中優先度タスク');
      await expect(taskItems.nth(2)).toContainText('低優先度タスク');
    });
  });
});
