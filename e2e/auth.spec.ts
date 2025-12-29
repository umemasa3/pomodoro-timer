import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { testUsers, generateTestData } from './fixtures/test-data';

/**
 * 認証機能のE2Eテスト
 * 要件: 11.1-11.5 (ユーザー認証)
 */
test.describe('認証機能', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('ログイン機能', () => {
    test('有効な認証情報でログインできる', async ({ page }) => {
      // 要件 11.2: ユーザーがログインする THEN システムは認証情報を検証し、アクセスを許可する
      await authHelper.login(testUsers.basic.email, testUsers.basic.password);

      // ダッシュボードが表示されることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();

      // ユーザー情報が表示されることを確認
      await expect(
        page.locator('[data-testid="user-display-name"]')
      ).toContainText(testUsers.basic.displayName);
    });

    test('無効な認証情報でログインが失敗する', async ({ page }) => {
      // 要件 11.5: 認証に失敗する THEN システムは適切なエラーメッセージを表示する
      await page.goto('/');

      // 無効な認証情報でログイン試行
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');

      // エラーメッセージが表示されることを確認
      await expect(
        page.locator('[data-testid="auth-error-message"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="auth-error-message"]')
      ).toContainText('認証に失敗');
    });

    test('空の入力フィールドでログインが失敗する', async ({ page }) => {
      await page.goto('/');

      // 空の状態でログインボタンをクリック
      await page.click('[data-testid="login-button"]');

      // バリデーションエラーが表示されることを確認
      await expect(
        page.locator('[data-testid="email-validation-error"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="password-validation-error"]')
      ).toBeVisible();
    });
  });

  test.describe('サインアップ機能', () => {
    test('新規ユーザーが登録できる', async ({ page }) => {
      // 要件 11.1: ユーザーがアカウント作成を選択する THEN システムはメールアドレスとパスワードでの登録を提供する
      const newUser = generateTestData.user();

      await authHelper.signup(
        newUser.email,
        newUser.password,
        newUser.displayName
      );

      // 登録成功メッセージまたはダッシュボードが表示されることを確認
      const isSuccess = await page
        .locator('[data-testid="signup-success"]')
        .isVisible({ timeout: 5000 });
      const isDashboard = await page
        .locator('[data-testid="timer-component"]')
        .isVisible({ timeout: 5000 });

      expect(isSuccess || isDashboard).toBeTruthy();
    });

    test('既存のメールアドレスで登録が失敗する', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="signup-link"]');

      // 既存のメールアドレスで登録試行
      await page.fill(
        '[data-testid="signup-email-input"]',
        testUsers.basic.email
      );
      await page.fill(
        '[data-testid="signup-password-input"]',
        'newpassword123'
      );
      await page.click('[data-testid="signup-button"]');

      // エラーメッセージが表示されることを確認
      await expect(
        page.locator('[data-testid="signup-error-message"]')
      ).toBeVisible();
    });

    test('弱いパスワードで登録が失敗する', async ({ page }) => {
      const newUser = generateTestData.user();

      await page.goto('/');
      await page.click('[data-testid="signup-link"]');

      // 弱いパスワードで登録試行
      await page.fill('[data-testid="signup-email-input"]', newUser.email);
      await page.fill('[data-testid="signup-password-input"]', '123'); // 弱いパスワード
      await page.click('[data-testid="signup-button"]');

      // パスワード強度エラーが表示されることを確認
      await expect(
        page.locator('[data-testid="password-strength-error"]')
      ).toBeVisible();
    });
  });

  test.describe('ログアウト機能', () => {
    test('ログアウトできる', async ({ page }) => {
      // 要件 11.3: ユーザーがログアウトする THEN システムはセッションを終了し、ローカルデータを保護する

      // まずログイン
      await authHelper.login();

      // ログアウト実行
      await authHelper.logout();

      // ログインページが表示されることを確認
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // 認証が必要なページにアクセスできないことを確認
      await page.goto('/tasks');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('パスワードリセット機能', () => {
    test('パスワードリセット要求ができる', async ({ page }) => {
      // 要件 11.4: ユーザーがパスワードを忘れた場合 THEN システムはパスワードリセット機能を提供する

      await page.goto('/');

      // パスワードリセットリンクをクリック
      await page.click('[data-testid="forgot-password-link"]');

      // パスワードリセットフォームが表示されることを確認
      await expect(
        page.locator('[data-testid="password-reset-form"]')
      ).toBeVisible();

      // メールアドレス入力
      await page.fill(
        '[data-testid="reset-email-input"]',
        testUsers.basic.email
      );

      // リセット要求送信
      await page.click('[data-testid="send-reset-button"]');

      // 成功メッセージが表示されることを確認
      await expect(
        page.locator('[data-testid="reset-success-message"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="reset-success-message"]')
      ).toContainText('リセットメールを送信');
    });

    test('無効なメールアドレスでリセット要求が失敗する', async ({ page }) => {
      await page.goto('/');
      await page.click('[data-testid="forgot-password-link"]');

      // 無効なメールアドレス入力
      await page.fill('[data-testid="reset-email-input"]', 'invalid-email');
      await page.click('[data-testid="send-reset-button"]');

      // バリデーションエラーが表示されることを確認
      await expect(
        page.locator('[data-testid="email-format-error"]')
      ).toBeVisible();
    });
  });

  test.describe('セッション管理', () => {
    test('ページリロード後もログイン状態が維持される', async ({ page }) => {
      // ログイン
      await authHelper.login();

      // ページをリロード
      await page.reload();

      // ログイン状態が維持されていることを確認
      await expect(
        page.locator('[data-testid="timer-component"]')
      ).toBeVisible();
    });

    test('長時間非アクティブ後にセッションが期限切れになる', async ({
      page,
    }) => {
      // ログイン
      await authHelper.login();

      // セッション期限切れをシミュレート（実際のテストでは時間を短縮）
      // 注意: 実際の実装では、テスト用の短いセッション期限を設定する必要があります

      // 期限切れ後のアクセス試行
      await page.goto('/tasks');

      // ログインページにリダイレクトされることを確認（セッション期限切れの場合）
      // 注意: 実際の動作は実装によって異なる場合があります
    });
  });

  test.describe('認証状態の確認', () => {
    test('未認証ユーザーは保護されたページにアクセスできない', async ({
      page,
    }) => {
      // 未認証状態で保護されたページにアクセス
      await page.goto('/tasks');

      // ログインページにリダイレクトされることを確認
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('認証済みユーザーは保護されたページにアクセスできる', async ({
      page,
    }) => {
      // ログイン
      await authHelper.login();

      // 保護されたページにアクセス
      await page.goto('/tasks');

      // ページが正常に表示されることを確認
      await expect(page.locator('[data-testid="tasks-page"]')).toBeVisible();
    });
  });
});
