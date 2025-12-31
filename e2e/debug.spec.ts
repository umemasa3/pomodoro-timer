import { test } from '@playwright/test';

test.describe('デバッグテスト', () => {
  test('アプリケーションの表示確認', async ({ page }) => {
    // ホームページにアクセス
    await page.goto('/');

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // スクリーンショットを取得
    await page.screenshot({ path: 'debug-home.png', fullPage: true });

    // ページの内容をログ出力
    const content = await page.content();
    console.log('Page content length:', content.length);
    console.log('Page title:', await page.title());

    // 認証関連の要素を確認
    const loginForm = page.locator('[data-testid="login-form"]');
    const isLoginFormVisible = await loginForm.isVisible().catch(() => false);
    console.log('Login form visible:', isLoginFormVisible);

    if (isLoginFormVisible) {
      console.log('Login form found!');
    } else {
      // 他の要素を確認
      const timerComponent = page.locator('[data-testid="timer-component"]');
      const isTimerVisible = await timerComponent
        .isVisible()
        .catch(() => false);
      console.log('Timer component visible:', isTimerVisible);

      // ページ内のすべてのdata-testid要素を取得
      const testIds = await page.locator('[data-testid]').all();
      console.log('Found test IDs:', testIds.length);

      for (const element of testIds) {
        const testId = await element.getAttribute('data-testid');
        console.log('Test ID:', testId);
      }
    }
  });

  test('タスクページへのアクセス確認', async ({ page }) => {
    // タスクページに直接アクセス
    await page.goto('/tasks');

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // スクリーンショットを取得
    await page.screenshot({ path: 'debug-tasks.png', fullPage: true });

    // 現在のURL確認
    console.log('Current URL:', page.url());

    // 認証フォームの確認
    const loginForm = page.locator('[data-testid="login-form"]');
    const isLoginFormVisible = await loginForm.isVisible().catch(() => false);
    console.log('Login form visible on /tasks:', isLoginFormVisible);
  });
});
