import { Page, expect } from '@playwright/test';

/**
 * タスク管理関連のヘルパー関数
 */
export class TaskHelper {
  constructor(private page: Page) {}

  /**
   * 新しいタスクを作成
   */
  async createTask(
    title: string,
    description?: string,
    estimatedPomodoros?: number,
    tags?: string[]
  ) {
    // タスク作成ボタンをクリック
    await this.page.click('[data-testid="create-task-button"]');

    // タスク作成フォームの表示を待機
    await this.page.waitForSelector('[data-testid="task-form"]');

    // タスクタイトル入力
    await this.page.fill('[data-testid="task-title-input"]', title);

    // 説明入力（オプション）
    if (description) {
      await this.page.fill(
        '[data-testid="task-description-input"]',
        description
      );
    }

    // 見積もりポモドーロ数入力（オプション）
    if (estimatedPomodoros) {
      await this.page.fill(
        '[data-testid="estimated-pomodoros-input"]',
        estimatedPomodoros.toString()
      );
    }

    // タグ追加（オプション）
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await this.page.fill('[data-testid="tag-input"]', tag);
        await this.page.press('[data-testid="tag-input"]', 'Enter');
      }
    }

    // タスク保存
    await this.page.click('[data-testid="save-task-button"]');

    // タスクリストに追加されたことを確認
    await expect(
      this.page.locator(`[data-testid="task-item"]:has-text("${title}")`)
    ).toBeVisible();
  }

  /**
   * タスクを編集
   */
  async editTask(
    originalTitle: string,
    newTitle: string,
    newDescription?: string
  ) {
    // タスクの編集ボタンをクリック
    await this.page.click(
      `[data-testid="task-item"]:has-text("${originalTitle}") [data-testid="edit-task-button"]`
    );

    // 編集フォームの表示を待機
    await this.page.waitForSelector('[data-testid="task-edit-form"]');

    // タイトル変更
    await this.page.fill('[data-testid="task-title-input"]', newTitle);

    // 説明変更（オプション）
    if (newDescription) {
      await this.page.fill(
        '[data-testid="task-description-input"]',
        newDescription
      );
    }

    // 変更を保存
    await this.page.click('[data-testid="save-task-button"]');

    // 変更が反映されたことを確認
    await expect(
      this.page.locator(`[data-testid="task-item"]:has-text("${newTitle}")`)
    ).toBeVisible();
  }

  /**
   * タスクを削除
   */
  async deleteTask(title: string) {
    // タスクの削除ボタンをクリック
    await this.page.click(
      `[data-testid="task-item"]:has-text("${title}") [data-testid="delete-task-button"]`
    );

    // 削除確認ダイアログで確認
    await this.page.click('[data-testid="confirm-delete-button"]');

    // タスクが削除されたことを確認
    await expect(
      this.page.locator(`[data-testid="task-item"]:has-text("${title}")`)
    ).not.toBeVisible();
  }

  /**
   * タスクを完了としてマーク
   */
  async completeTask(title: string) {
    // タスクの完了チェックボックスをクリック
    await this.page.click(
      `[data-testid="task-item"]:has-text("${title}") [data-testid="task-complete-checkbox"]`
    );

    // タスクが完了状態になったことを確認
    await expect(
      this.page.locator(`[data-testid="task-item"]:has-text("${title}")`)
    ).toHaveClass(/completed/);
  }

  /**
   * タスクを選択してセッション開始
   */
  async selectTaskForSession(title: string) {
    // タスクの選択ボタンをクリック
    await this.page.click(
      `[data-testid="task-item"]:has-text("${title}") [data-testid="select-task-button"]`
    );

    // 選択されたタスクがタイマーに表示されることを確認
    await expect(
      this.page.locator('[data-testid="current-task-display"]')
    ).toContainText(title);
  }

  /**
   * タスクリストをフィルタリング
   */
  async filterTasks(status: 'all' | 'pending' | 'completed') {
    const filterMap = {
      all: '[data-testid="filter-all-tasks"]',
      pending: '[data-testid="filter-pending-tasks"]',
      completed: '[data-testid="filter-completed-tasks"]',
    };

    await this.page.click(filterMap[status]);

    // フィルターが適用されたことを確認
    await expect(
      this.page.locator('[data-testid="active-filter"]')
    ).toContainText(
      status === 'all' ? 'すべて' : status === 'pending' ? '未完了' : '完了済み'
    );
  }

  /**
   * タグでタスクをフィルタリング
   */
  async filterByTag(tagName: string) {
    // タグフィルターを開く
    await this.page.click('[data-testid="tag-filter-dropdown"]');

    // 特定のタグを選択
    await this.page.click(
      `[data-testid="tag-filter-option"]:has-text("${tagName}")`
    );

    // フィルターが適用されたことを確認
    await expect(
      this.page.locator('[data-testid="active-tag-filter"]')
    ).toContainText(tagName);
  }

  /**
   * タスクの存在確認
   */
  async taskExists(title: string): Promise<boolean> {
    try {
      await expect(
        this.page.locator(`[data-testid="task-item"]:has-text("${title}")`)
      ).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * タスク数を取得
   */
  async getTaskCount(): Promise<number> {
    const tasks = this.page.locator('[data-testid="task-item"]');
    return await tasks.count();
  }
}
