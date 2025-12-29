import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { TimerHelper } from './helpers/timer-helper';
import { testUsers } from './fixtures/test-data';

/**
 * タイマー機能のE2Eテスト
 * 要件: 1.1-1.4 (タイマー機能), 2.1-2.4 (休憩セッション管理)
 */
test.describe('タイマー機能', () => {
  let authHelper: AuthHelper;
  let timerHelper: TimerHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    timerHelper = new TimerHelper(page);

    // テスト前にログイン
    await authHelper.login(testUsers.basic.email, testUsers.basic.password);
  });

  test.describe('基本タイマー操作', () => {
    test('タイマーを開始できる', async ({ page }) => {
      // 要件 1.1: ユーザーがタイマーを開始する THEN システムは25分間のカウントダウンを開始する

      // 初期状態の確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '25:00'
      );
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '停止中'
      );

      // タイマー開始
      await timerHelper.startTimer();

      // タイマーが開始されたことを確認
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '実行中'
      );

      // 少し待ってカウントダウンが進んでいることを確認
      await page.waitForTimeout(2000);
      const currentTime = await timerHelper.getCurrentTime();
      expect(currentTime).not.toBe('25:00');
    });

    test('タイマーを一時停止できる', async ({ page }) => {
      // 要件 1.3: ユーザーがタイマーを一時停止する THEN システムはカウントダウンを停止し、現在の時間を保持する

      // タイマー開始
      await timerHelper.startTimer();

      // 少し待ってから一時停止
      await page.waitForTimeout(3000);
      const timeBeforePause = await timerHelper.getCurrentTime();

      await timerHelper.pauseTimer();

      // 一時停止状態の確認
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '一時停止'
      );

      // 時間が保持されていることを確認
      await page.waitForTimeout(2000);
      const timeAfterPause = await timerHelper.getCurrentTime();
      expect(timeAfterPause).toBe(timeBeforePause);
    });

    test('タイマーをリセットできる', async ({ page }) => {
      // 要件 1.4: ユーザーがタイマーをリセットする THEN システムはタイマーを初期状態（25分）に戻す

      // タイマー開始して少し進める
      await timerHelper.startTimer();
      await page.waitForTimeout(3000);

      // リセット実行
      await timerHelper.resetTimer();

      // 初期状態に戻ったことを確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '25:00'
      );
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '停止中'
      );
    });

    test('タイマーがリアルタイムで更新される', async ({ page }) => {
      // 要件 1.2: タイマーが動作中 THEN システムは残り時間をリアルタイムで表示する

      await timerHelper.startTimer();

      // 初期時間を記録
      const initialTime = await timerHelper.getCurrentTime();

      // 3秒待機
      await page.waitForTimeout(3000);

      // 時間が更新されていることを確認
      const updatedTime = await timerHelper.getCurrentTime();
      expect(updatedTime).not.toBe(initialTime);

      // 時間が減少していることを確認（分:秒形式）
      const [initialMin, initialSec] = initialTime.split(':').map(Number);
      const [updatedMin, updatedSec] = updatedTime.split(':').map(Number);
      const initialTotalSec = initialMin * 60 + initialSec;
      const updatedTotalSec = updatedMin * 60 + updatedSec;

      expect(updatedTotalSec).toBeLessThan(initialTotalSec);
    });
  });

  test.describe('セッション種別管理', () => {
    test('ポモドーロセッションから短い休憩に切り替えられる', async ({
      page,
    }) => {
      // 要件 2.1: ポモドーロセッションが完了する THEN システムは5分間の短い休憩タイマーを提案する

      // 短い休憩セッションに切り替え
      await timerHelper.changeSessionType('shortBreak');

      // 短い休憩の時間設定を確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '05:00'
      );
      await expect(page.locator('[data-testid="session-type"]')).toContainText(
        '短い休憩'
      );
    });

    test('長い休憩セッションに切り替えられる', async ({ page }) => {
      // 要件 2.2: 4回のポモドーロセッションが完了する THEN システムは15分間の長い休憩タイマーを提案する

      // 長い休憩セッションに切り替え
      await timerHelper.changeSessionType('longBreak');

      // 長い休憩の時間設定を確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '15:00'
      );
      await expect(page.locator('[data-testid="session-type"]')).toContainText(
        '長い休憩'
      );
    });

    test('休憩セッションが正常に動作する', async ({ page }) => {
      // 要件 2.3: 休憩タイマーが開始される THEN システムは休憩時間をカウントダウンする

      // 短い休憩に切り替え
      await timerHelper.changeSessionType('shortBreak');

      // 休憩タイマー開始
      await timerHelper.startTimer();

      // カウントダウンが進むことを確認
      await page.waitForTimeout(2000);
      const currentTime = await timerHelper.getCurrentTime();
      expect(currentTime).not.toBe('05:00');
    });
  });

  test.describe('通知機能', () => {
    test('通知設定を変更できる', async ({ page }) => {
      // 要件 4.4, 4.5: 通知設定の変更

      // 通知を無効にする
      await timerHelper.toggleNotifications(false);

      // 設定が保存されたことを確認
      await page.click('[data-testid="settings-button"]');
      const notificationToggle = page.locator(
        '[data-testid="notification-toggle"]'
      );
      await expect(notificationToggle).not.toBeChecked();

      // 設定を閉じる
      await page.click('[data-testid="settings-close-button"]');
    });

    test('セッション完了時に通知が表示される', async ({ page }) => {
      // 要件 4.1, 4.3: セッション終了時の通知

      // テスト用の短時間設定に変更
      await timerHelper.setCustomTime(1, 1, 1); // 1分設定

      // タイマー開始
      await timerHelper.startTimer();

      // セッション完了を待機（最大90秒）
      await timerHelper.waitForSessionComplete(90000);

      // 完了通知が表示されることを確認
      await expect(
        page.locator('[data-testid="session-complete-notification"]')
      ).toBeVisible();
    });
  });

  test.describe('カスタム設定', () => {
    test('ポモドーロ時間をカスタマイズできる', async ({ page }) => {
      // 要件 5.1: ポモドーロセッション時間を15-60分の範囲で設定できる

      const customMinutes = 30;
      await timerHelper.setCustomTime(customMinutes, 5, 15);

      // カスタム時間が反映されることを確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '30:00'
      );
    });

    test('休憩時間をカスタマイズできる', async ({ page }) => {
      // 要件 5.2, 5.3: 短い休憩時間と長い休憩時間の設定

      await timerHelper.setCustomTime(25, 8, 25);

      // 短い休憩時間の確認
      await timerHelper.changeSessionType('shortBreak');
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '08:00'
      );

      // 長い休憩時間の確認
      await timerHelper.changeSessionType('longBreak');
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '25:00'
      );
    });

    test('設定値の範囲制限が機能する', async ({ page }) => {
      // 設定画面を開く
      await page.click('[data-testid="settings-button"]');

      // 範囲外の値を入力
      await page.fill('[data-testid="pomodoro-minutes-input"]', '70'); // 60分を超える
      await page.fill('[data-testid="short-break-minutes-input"]', '2'); // 3分未満

      // 保存ボタンをクリック
      await page.click('[data-testid="settings-save-button"]');

      // バリデーションエラーが表示されることを確認
      await expect(
        page.locator('[data-testid="pomodoro-validation-error"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="short-break-validation-error"]')
      ).toBeVisible();
    });
  });

  test.describe('UI/UX', () => {
    test('タイマー表示が美しく表示される', async ({ page }) => {
      // 要件 6.1, 6.2: 美しく現代的なデザイン、滑らかなアニメーション

      // タイマーコンポーネントが表示されることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();

      // 進捗表示が存在することを確認
      await expect(
        page.locator('[data-testid="timer-progress"]')
      ).toBeVisible();

      // タイマー開始時のアニメーション確認
      await timerHelper.startTimer();

      // アニメーション要素が存在することを確認
      await expect(
        page.locator('[data-testid="timer-animation"]')
      ).toBeVisible();
    });

    test('レスポンシブデザインが機能する', async ({ page }) => {
      // 要件 6.5: レスポンシブデザイン

      // モバイルサイズに変更
      await page.setViewportSize({ width: 375, height: 667 });

      // タイマーが適切に表示されることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();

      // デスクトップサイズに戻す
      await page.setViewportSize({ width: 1280, height: 720 });

      // タイマーが適切に表示されることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();
    });

    test('ダークモードが機能する', async ({ page }) => {
      // 要件 6.4: ダークモード・ライトモードの実装

      // テーマ切り替えボタンをクリック
      await page.click('[data-testid="theme-toggle-button"]');

      // ダークモードが適用されることを確認
      await expect(page.locator('html')).toHaveClass(/dark/);

      // 再度クリックしてライトモードに戻す
      await page.click('[data-testid="theme-toggle-button"]');

      // ライトモードが適用されることを確認
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });
  });

  test.describe('キーボードショートカット', () => {
    test('スペースキーでタイマーを開始/停止できる', async ({ page }) => {
      // スペースキーでタイマー開始
      await page.keyboard.press('Space');

      // タイマーが開始されることを確認
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '実行中'
      );

      // 再度スペースキーで一時停止
      await page.keyboard.press('Space');

      // タイマーが一時停止されることを確認
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '一時停止'
      );
    });

    test('Rキーでタイマーをリセットできる', async ({ page }) => {
      // タイマーを開始して少し進める
      await timerHelper.startTimer();
      await page.waitForTimeout(2000);

      // Rキーでリセット
      await page.keyboard.press('r');

      // タイマーがリセットされることを確認
      await expect(page.locator('[data-testid="timer-display"]')).toContainText(
        '25:00'
      );
      await expect(page.locator('[data-testid="timer-status"]')).toContainText(
        '停止中'
      );
    });
  });
});
