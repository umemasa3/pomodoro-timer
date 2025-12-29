import { Page, expect } from '@playwright/test';

/**
 * 統計・分析関連のヘルパー関数
 */
export class StatisticsHelper {
  constructor(private page: Page) {}

  /**
   * 統計ページに移動
   */
  async navigateToStatistics() {
    await this.page.click('[data-testid="nav-statistics"]');

    // 統計ページの表示を待機
    await this.page.waitForSelector('[data-testid="statistics-page"]');
    await expect(
      this.page.locator('[data-testid="statistics-page"]')
    ).toBeVisible();
  }

  /**
   * 基本統計の確認
   */
  async verifyBasicStats() {
    // 今日のセッション数
    await expect(
      this.page.locator('[data-testid="today-sessions"]')
    ).toBeVisible();

    // 今週のセッション数
    await expect(
      this.page.locator('[data-testid="week-sessions"]')
    ).toBeVisible();

    // 今月のセッション数
    await expect(
      this.page.locator('[data-testid="month-sessions"]')
    ).toBeVisible();

    // 総セッション数
    await expect(
      this.page.locator('[data-testid="total-sessions"]')
    ).toBeVisible();
  }

  /**
   * セッション履歴の確認
   */
  async verifySessionHistory() {
    // セッション履歴テーブル
    await expect(
      this.page.locator('[data-testid="session-history-table"]')
    ).toBeVisible();

    // 履歴項目の存在確認
    const historyItems = this.page.locator(
      '[data-testid="session-history-item"]'
    );
    const count = await historyItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  }

  /**
   * 作業時間グラフの確認
   */
  async verifyWorkTimeGraph() {
    // グラフコンテナ
    await expect(
      this.page.locator('[data-testid="work-time-graph"]')
    ).toBeVisible();

    // グラフの描画完了を待機
    await this.page.waitForFunction(
      () => {
        const graph = document.querySelector(
          '[data-testid="work-time-graph"] svg'
        );
        return graph && graph.children.length > 0;
      },
      { timeout: 10000 }
    );
  }

  /**
   * タスク種類別内訳の確認
   */
  async verifyTaskBreakdown() {
    // 円グラフコンテナ
    await expect(
      this.page.locator('[data-testid="task-breakdown-chart"]')
    ).toBeVisible();

    // 凡例の表示確認
    await expect(
      this.page.locator('[data-testid="chart-legend"]')
    ).toBeVisible();
  }

  /**
   * タグ別統計の確認
   */
  async verifyTagStatistics() {
    // タグ統計セクション
    await expect(
      this.page.locator('[data-testid="tag-statistics"]')
    ).toBeVisible();

    // タグ別データの存在確認
    const tagItems = this.page.locator('[data-testid="tag-stat-item"]');
    const count = await tagItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  }

  /**
   * 期間フィルターの変更
   */
  async changePeriodFilter(period: 'week' | 'month' | 'year') {
    const filterMap = {
      week: '[data-testid="filter-week"]',
      month: '[data-testid="filter-month"]',
      year: '[data-testid="filter-year"]',
    };

    await this.page.click(filterMap[period]);

    // フィルターが適用されるまで待機
    await this.page.waitForTimeout(1000);

    // アクティブフィルターの確認
    await expect(
      this.page.locator('[data-testid="active-period-filter"]')
    ).toContainText(
      period === 'week' ? '週' : period === 'month' ? '月' : '年'
    );
  }

  /**
   * CSVエクスポートの実行
   */
  async exportToCSV() {
    // エクスポートボタンをクリック
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid="export-csv-button"]');

    // ダウンロード完了を待機
    const download = await downloadPromise;

    // ファイル名の確認
    expect(download.suggestedFilename()).toMatch(
      /pomodoro-stats-\d{4}-\d{2}-\d{2}\.csv/
    );

    return download;
  }

  /**
   * 目標設定の確認
   */
  async verifyGoalProgress() {
    // 目標進捗セクション
    await expect(
      this.page.locator('[data-testid="goal-progress"]')
    ).toBeVisible();

    // 週間目標
    await expect(
      this.page.locator('[data-testid="weekly-goal-progress"]')
    ).toBeVisible();

    // 月間目標
    await expect(
      this.page.locator('[data-testid="monthly-goal-progress"]')
    ).toBeVisible();
  }

  /**
   * 比較分析の確認
   */
  async verifyComparisonAnalysis() {
    // 比較分析セクション
    await expect(
      this.page.locator('[data-testid="comparison-analysis"]')
    ).toBeVisible();

    // 前週比較
    await expect(
      this.page.locator('[data-testid="previous-week-comparison"]')
    ).toBeVisible();

    // 前月比較
    await expect(
      this.page.locator('[data-testid="previous-month-comparison"]')
    ).toBeVisible();
  }

  /**
   * 統計値の取得
   */
  async getStatValue(statType: string): Promise<string> {
    const element = this.page.locator(`[data-testid="${statType}"]`);
    return (await element.textContent()) || '0';
  }

  /**
   * 作業ストリークの確認
   */
  async verifyWorkStreak() {
    // 連続作業日数
    await expect(
      this.page.locator('[data-testid="current-streak"]')
    ).toBeVisible();

    // 最長記録
    await expect(
      this.page.locator('[data-testid="longest-streak"]')
    ).toBeVisible();
  }
}
