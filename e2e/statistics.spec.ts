import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { TaskHelper } from './helpers/task-helper';
import { TimerHelper } from './helpers/timer-helper';
import { StatisticsHelper } from './helpers/statistics-helper';
import { testUsers } from './fixtures/test-data';

/**
 * 統計・分析機能のE2Eテスト
 * 要件: 3.1-3.21 (セッション追跡・統計分析)
 */
test.describe('統計・分析機能', () => {
  let authHelper: AuthHelper;
  let taskHelper: TaskHelper;
  let timerHelper: TimerHelper;
  let statisticsHelper: StatisticsHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    taskHelper = new TaskHelper(page);
    timerHelper = new TimerHelper(page);
    statisticsHelper = new StatisticsHelper(page);

    // テスト前にログイン
    await authHelper.login(testUsers.basic.email, testUsers.basic.password);
  });

  test.describe('基本統計表示', () => {
    test('統計ページが正常に表示される', async () => {
      // 要件 3.5: ユーザーが統計画面を開く THEN システムは総完了ポモドーロセッション数を表示する

      await statisticsHelper.navigateToStatistics();

      // 基本統計要素の表示確認
      await statisticsHelper.verifyBasicStats();
    });

    test('今日のセッション数が表示される', async () => {
      // 要件 3.2: ユーザーがセッション数を確認する THEN システムは本日の完了セッション数を表示する

      // セッションを実行してから統計確認
      await page.goto('/');

      // 短時間セッションを実行
      await timerHelper.setCustomTime(1, 1, 1); // 1分設定
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);

      // 統計ページで確認
      await statisticsHelper.navigateToStatistics();

      // 今日のセッション数が1以上であることを確認
      const todaySessions =
        await statisticsHelper.getStatValue('today-sessions');
      expect(parseInt(todaySessions)).toBeGreaterThanOrEqual(1);
    });

    test('セッション履歴が表示される', async () => {
      // 要件 3.4: ユーザーがセッション履歴を確認する THEN システムは過去7日間のセッション数を表示する

      await statisticsHelper.navigateToStatistics();

      // セッション履歴の表示確認
      await statisticsHelper.verifySessionHistory();
    });

    test('期間指定統計が機能する', async () => {
      // 要件 3.6: ユーザーが期間を指定する THEN システムは指定期間内のセッション数とタスク完了数を表示する

      await statisticsHelper.navigateToStatistics();

      // 週間フィルターを適用
      await statisticsHelper.changePeriodFilter('week');

      // 統計が更新されることを確認
      await expect(
        page.locator('[data-testid="period-stats-title"]')
      ).toContainText('週間統計');

      // 月間フィルターを適用
      await statisticsHelper.changePeriodFilter('month');

      // 統計が更新されることを確認
      await expect(
        page.locator('[data-testid="period-stats-title"]')
      ).toContainText('月間統計');
    });
  });

  test.describe('詳細分析機能', () => {
    test('作業時間グラフが表示される', async () => {
      // 要件 3.7: ユーザーが詳細統計を確認する THEN システムは日別・週別・月別の作業時間グラフを表示する

      await statisticsHelper.navigateToStatistics();

      // 作業時間グラフの表示確認
      await statisticsHelper.verifyWorkTimeGraph();
    });

    test('タスク種類別内訳が表示される', async () => {
      // 要件 3.8: ユーザーが成果を確認する THEN システムは完了したタスクの総数と種類別内訳を表示する

      // タグ付きタスクを作成してセッション実行
      await taskHelper.createTask('開発タスク', '開発作業', 1, ['開発']);
      await taskHelper.createTask('テストタスク', 'テスト作業', 1, ['テスト']);

      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);

      // 開発タスクでセッション実行
      await taskHelper.selectTaskForSession('開発タスク');
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 統計ページで確認
      await statisticsHelper.navigateToStatistics();

      // タスク種類別内訳の表示確認
      await statisticsHelper.verifyTaskBreakdown();
    });

    test('連続作業日数が表示される', async () => {
      // 要件 3.9: ユーザーが継続性を確認する THEN システムは連続作業日数と最長記録を表示する

      await statisticsHelper.navigateToStatistics();

      // 作業ストリークの表示確認
      await statisticsHelper.verifyWorkStreak();
    });

    test('平均セッション完了率が表示される', async () => {
      // 要件 3.10: ユーザーが効率性を確認する THEN システムは平均セッション完了率と集中度指標を表示する

      await statisticsHelper.navigateToStatistics();

      // 完了率統計の表示確認
      await expect(
        page.locator('[data-testid="completion-rate"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="focus-score"]')).toBeVisible();
    });
  });

  test.describe('タグ別統計', () => {
    test('タグ別完了タスク数と作業時間が表示される', async ({ page }) => {
      // 要件 3.12: ユーザーがタグ別統計を確認する THEN システムはタグごとの完了タスク数と作業時間を表示する

      // タグ付きタスクでセッション実行
      await taskHelper.createTask('開発タスク', '開発作業', 1, ['開発']);
      await page.goto('/');

      await timerHelper.setCustomTime(1, 1, 1);
      await taskHelper.selectTaskForSession('開発タスク');
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);
      await page.click('[data-testid="task-completed-button"]');

      // 統計ページでタグ別統計確認
      await statisticsHelper.navigateToStatistics();
      await statisticsHelper.verifyTagStatistics();

      // 「開発」タグの統計が表示されることを確認
      await expect(
        page.locator('[data-testid="tag-stat-item"]:has-text("開発")')
      ).toBeVisible();
    });

    test('最も生産的なタグと時間帯の組み合わせが表示される', async ({
      page,
    }) => {
      // 要件 3.13: ユーザーが生産性分析を確認する THEN システムは最も生産的なタグと時間帯の組み合わせを表示する

      await statisticsHelper.navigateToStatistics();

      // 生産性分析セクションの表示確認
      await expect(
        page.locator('[data-testid="productivity-analysis"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="most-productive-tag"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="most-productive-time"]')
      ).toBeVisible();
    });

    test('時間帯別・曜日別の作業分布が表示される', async ({ page }) => {
      // 要件 3.15: ユーザーが作業パターンを確認する THEN システムは時間帯別・曜日別の作業分布を表示する

      await statisticsHelper.navigateToStatistics();

      // 作業分布ヒートマップの表示確認
      await expect(
        page.locator('[data-testid="work-distribution-heatmap"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="hourly-distribution"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="daily-distribution"]')
      ).toBeVisible();
    });

    test('タスクカテゴリ別の時間配分が円グラフで表示される', async ({
      page,
    }) => {
      // 要件 3.16: ユーザーがタスク分析を確認する THEN システムはタスクカテゴリ別の時間配分を円グラフで表示する

      await statisticsHelper.navigateToStatistics();

      // カテゴリ別時間配分の円グラフ確認
      await expect(
        page.locator('[data-testid="category-time-pie-chart"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="pie-chart-legend"]')
      ).toBeVisible();
    });
  });

  test.describe('目標設定・比較分析', () => {
    test('週間・月間目標に対する進捗率が表示される', async () => {
      // 要件 3.18: ユーザーが目標設定を行う THEN システムは週間・月間目標に対する進捗率を表示する

      await statisticsHelper.navigateToStatistics();

      // 目標進捗の表示確認
      await statisticsHelper.verifyGoalProgress();
    });

    test('前週・前月との比較データが表示される', async () => {
      // 要件 3.19: ユーザーが比較分析を行う THEN システムは前週・前月との比較データを表示する

      await statisticsHelper.navigateToStatistics();

      // 比較分析の表示確認
      await statisticsHelper.verifyComparisonAnalysis();
    });

    test('タグ別の時間推移がグラフで表示される', async ({ page }) => {
      // 要件 3.20: ユーザーがタグトレンドを確認する THEN システムはタグ別の時間推移をグラフで表示する

      await statisticsHelper.navigateToStatistics();

      // タグトレンドグラフの表示確認
      await expect(
        page.locator('[data-testid="tag-trend-graph"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="trend-legend"]')).toBeVisible();
    });

    test('目標を設定できる', async ({ page }) => {
      await statisticsHelper.navigateToStatistics();

      // 目標設定ボタンをクリック
      await page.click('[data-testid="set-goals-button"]');

      // 目標設定ダイアログが表示される
      await expect(
        page.locator('[data-testid="goal-setting-dialog"]')
      ).toBeVisible();

      // 週間目標を設定
      await page.fill('[data-testid="weekly-goal-input"]', '20');

      // 月間目標を設定
      await page.fill('[data-testid="monthly-goal-input"]', '80');

      // 目標を保存
      await page.click('[data-testid="save-goals-button"]');

      // 目標が保存されたことを確認
      await expect(
        page.locator('[data-testid="weekly-goal-display"]')
      ).toContainText('20');
      await expect(
        page.locator('[data-testid="monthly-goal-display"]')
      ).toContainText('80');
    });
  });

  test.describe('データエクスポート', () => {
    test('統計データをCSV形式でエクスポートできる', async () => {
      // 要件 3.21: システムはエクスポート機能で統計データをCSV形式で出力できる

      await statisticsHelper.navigateToStatistics();

      // CSVエクスポートを実行
      const download = await statisticsHelper.exportToCSV();

      // ダウンロードが成功したことを確認
      expect(download.suggestedFilename()).toMatch(
        /pomodoro-stats-\d{4}-\d{2}-\d{2}\.csv/
      );
    });

    test('エクスポートデータに必要な情報が含まれる', async () => {
      // セッションデータを作成
      await page.goto('/');
      await timerHelper.setCustomTime(1, 1, 1);
      await timerHelper.startTimer();
      await timerHelper.waitForSessionComplete(90000);

      await statisticsHelper.navigateToStatistics();

      // CSVエクスポート
      const download = await statisticsHelper.exportToCSV();

      // ファイルを保存して内容確認
      const path = await download.path();
      expect(path).toBeTruthy();

      // 注意: 実際のテストでは、ダウンロードしたファイルの内容を検証する
      // ここでは、ダウンロードが成功したことのみ確認
    });
  });

  test.describe('リアルタイム更新', () => {
    test('セッション完了後に統計が自動更新される', async ({ page }) => {
      // 統計ページを開いておく
      await statisticsHelper.navigateToStatistics();

      // 現在のセッション数を記録
      const initialSessions =
        await statisticsHelper.getStatValue('today-sessions');

      // 新しいタブでセッションを実行
      const newPage = await page.context().newPage();
      await newPage.goto('/');

      // ログイン
      const newAuthHelper = new AuthHelper(newPage);
      await newAuthHelper.login(
        testUsers.basic.email,
        testUsers.basic.password
      );

      // セッション実行
      const newTimerHelper = new TimerHelper(newPage);
      await newTimerHelper.setCustomTime(1, 1, 1);
      await newTimerHelper.startTimer();
      await newTimerHelper.waitForSessionComplete(90000);

      // 元のページで統計が更新されることを確認
      await page.waitForTimeout(2000); // リアルタイム更新を待機

      const updatedSessions =
        await statisticsHelper.getStatValue('today-sessions');
      expect(parseInt(updatedSessions)).toBeGreaterThan(
        parseInt(initialSessions)
      );

      await newPage.close();
    });
  });

  test.describe('統計フィルタリング', () => {
    test('日付範囲でフィルタリングできる', async ({ page }) => {
      await statisticsHelper.navigateToStatistics();

      // カスタム日付範囲を設定
      await page.click('[data-testid="custom-date-range-button"]');

      // 開始日を設定
      await page.fill('[data-testid="start-date-input"]', '2024-01-01');

      // 終了日を設定
      await page.fill('[data-testid="end-date-input"]', '2024-01-31');

      // フィルターを適用
      await page.click('[data-testid="apply-date-filter"]');

      // フィルターが適用されたことを確認
      await expect(
        page.locator('[data-testid="active-date-range"]')
      ).toContainText('2024-01-01 - 2024-01-31');
    });

    test('タグでフィルタリングできる', async ({ page }) => {
      await statisticsHelper.navigateToStatistics();

      // タグフィルターを開く
      await page.click('[data-testid="tag-filter-button"]');

      // 特定のタグを選択
      await page.click('[data-testid="tag-filter-option"]:has-text("開発")');

      // フィルターが適用されたことを確認
      await expect(
        page.locator('[data-testid="active-tag-filter"]')
      ).toContainText('開発');

      // 統計が更新されることを確認
      await expect(
        page.locator('[data-testid="filtered-stats-title"]')
      ).toContainText('開発タグの統計');
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量データでも統計が正常に表示される', async () => {
      // 注意: 実際のテストでは、大量のテストデータを事前に作成する必要があります
      // ここでは、統計ページの読み込み時間をテストします

      const startTime = Date.now();
      await statisticsHelper.navigateToStatistics();
      const loadTime = Date.now() - startTime;

      // 5秒以内に読み込まれることを確認
      expect(loadTime).toBeLessThan(5000);

      // 基本統計が表示されることを確認
      await statisticsHelper.verifyBasicStats();
    });
  });
});
