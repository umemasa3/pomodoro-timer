import { Page, expect } from '@playwright/test';

/**
 * 認証関連のヘルパー関数
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * テストユーザーでログイン
   */
  async login(
    email: string = 'test@example.com',
    password: string = 'testpassword123'
  ) {
    await this.page.goto('/');

    // ログインフォームが表示されるまで待機
    await this.page.waitForSelector('[data-testid="login-form"]', {
      timeout: 10000,
    });

    // メールアドレス入力
    await this.page.fill('[data-testid="email-input"]', email);

    // パスワード入力
    await this.page.fill('[data-testid="password-input"]', password);

    // ログインボタンクリック
    await this.page.click('[data-testid="login-button"]');

    // ダッシュボードの表示を待機
    await this.page.waitForSelector('[data-testid="timer-component"]', {
      timeout: 15000,
    });

    // ログイン成功の確認
    await expect(
      this.page.locator('[data-testid="timer-component"]')
    ).toBeVisible();
  }

  /**
   * 新規ユーザー登録
   */
  async signup(email: string, password: string, displayName?: string) {
    await this.page.goto('/');

    // サインアップリンクをクリック
    await this.page.click('[data-testid="signup-link"]');

    // サインアップフォームの表示を待機
    await this.page.waitForSelector('[data-testid="signup-form"]');

    // メールアドレス入力
    await this.page.fill('[data-testid="signup-email-input"]', email);

    // パスワード入力
    await this.page.fill('[data-testid="signup-password-input"]', password);

    // 表示名入力（オプション）
    if (displayName) {
      await this.page.fill('[data-testid="display-name-input"]', displayName);
    }

    // サインアップボタンクリック
    await this.page.click('[data-testid="signup-button"]');

    // 確認メッセージまたはダッシュボードの表示を待機
    await this.page.waitForSelector(
      '[data-testid="signup-success"], [data-testid="timer-component"]',
      { timeout: 15000 }
    );
  }

  /**
   * ログアウト
   */
  async logout() {
    // ユーザーメニューを開く
    await this.page.click('[data-testid="user-menu-button"]');

    // ログアウトボタンをクリック
    await this.page.click('[data-testid="logout-button"]');

    // ログインページの表示を待機
    await this.page.waitForSelector('[data-testid="login-form"]', {
      timeout: 10000,
    });

    // ログアウト成功の確認
    await expect(this.page.locator('[data-testid="login-form"]')).toBeVisible();
  }

  /**
   * 認証状態の確認
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="timer-component"]', {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
