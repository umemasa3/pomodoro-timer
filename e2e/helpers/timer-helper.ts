import { Page, expect } from '@playwright/test';

/**
 * タイマー関連のヘルパー関数
 */
export class TimerHelper {
  constructor(private page: Page) {}

  /**
   * タイマーを開始
   */
  async startTimer() {
    await this.page.click('[data-testid="timer-start-button"]');

    // タイマーが開始されたことを確認
    await expect(
      this.page.locator('[data-testid="timer-status"]')
    ).toContainText('実行中');
  }

  /**
   * タイマーを一時停止
   */
  async pauseTimer() {
    await this.page.click('[data-testid="timer-pause-button"]');

    // タイマーが一時停止されたことを確認
    await expect(
      this.page.locator('[data-testid="timer-status"]')
    ).toContainText('一時停止');
  }

  /**
   * タイマーをリセット
   */
  async resetTimer() {
    await this.page.click('[data-testid="timer-reset-button"]');

    // タイマーがリセットされたことを確認
    await expect(
      this.page.locator('[data-testid="timer-display"]')
    ).toContainText('25:00');
    await expect(
      this.page.locator('[data-testid="timer-status"]')
    ).toContainText('停止中');
  }

  /**
   * 現在のタイマー時間を取得
   */
  async getCurrentTime(): Promise<string> {
    const timeElement = this.page.locator('[data-testid="timer-display"]');
    return (await timeElement.textContent()) || '00:00';
  }

  /**
   * タイマーの状態を取得
   */
  async getTimerStatus(): Promise<string> {
    const statusElement = this.page.locator('[data-testid="timer-status"]');
    return (await statusElement.textContent()) || '';
  }

  /**
   * セッション完了まで待機（テスト用の短縮時間）
   */
  async waitForSessionComplete(timeoutMs: number = 30000) {
    await this.page.waitForSelector(
      '[data-testid="session-complete-notification"]',
      {
        timeout: timeoutMs,
      }
    );

    // 完了通知が表示されたことを確認
    await expect(
      this.page.locator('[data-testid="session-complete-notification"]')
    ).toBeVisible();
  }

  /**
   * セッション種別を変更
   */
  async changeSessionType(type: 'pomodoro' | 'shortBreak' | 'longBreak') {
    const buttonMap = {
      pomodoro: '[data-testid="pomodoro-button"]',
      shortBreak: '[data-testid="short-break-button"]',
      longBreak: '[data-testid="long-break-button"]',
    };

    await this.page.click(buttonMap[type]);

    // セッション種別が変更されたことを確認
    await expect(
      this.page.locator('[data-testid="session-type"]')
    ).toContainText(
      type === 'pomodoro'
        ? 'ポモドーロ'
        : type === 'shortBreak'
          ? '短い休憩'
          : '長い休憩'
    );
  }

  /**
   * 通知設定を変更
   */
  async toggleNotifications(enabled: boolean) {
    // 設定メニューを開く
    await this.page.click('[data-testid="settings-button"]');

    // 通知設定を切り替え
    const notificationToggle = this.page.locator(
      '[data-testid="notification-toggle"]'
    );
    const isCurrentlyEnabled = await notificationToggle.isChecked();

    if (isCurrentlyEnabled !== enabled) {
      await notificationToggle.click();
    }

    // 設定を保存
    await this.page.click('[data-testid="settings-save-button"]');

    // 設定メニューを閉じる
    await this.page.click('[data-testid="settings-close-button"]');
  }

  /**
   * カスタム時間設定
   */
  async setCustomTime(
    pomodoroMinutes: number,
    shortBreakMinutes: number,
    longBreakMinutes: number
  ) {
    // 設定メニューを開く
    await this.page.click('[data-testid="settings-button"]');

    // ポモドーロ時間設定
    await this.page.fill(
      '[data-testid="pomodoro-minutes-input"]',
      pomodoroMinutes.toString()
    );

    // 短い休憩時間設定
    await this.page.fill(
      '[data-testid="short-break-minutes-input"]',
      shortBreakMinutes.toString()
    );

    // 長い休憩時間設定
    await this.page.fill(
      '[data-testid="long-break-minutes-input"]',
      longBreakMinutes.toString()
    );

    // 設定を保存
    await this.page.click('[data-testid="settings-save-button"]');

    // 設定メニューを閉じる
    await this.page.click('[data-testid="settings-close-button"]');
  }
}
