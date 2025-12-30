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
    // ホームページに移動
    await this.page.goto('/');

    // ページが完全に読み込まれるまで待機
    await this.page.waitForLoadState('networkidle');

    // 既にログイン済みかどうかを確認
    const isAlreadyLoggedIn = await this.isLoggedIn();
    if (isAlreadyLoggedIn) {
      console.log('既にログイン済みです。ログイン処理をスキップします。');
      return;
    }

    // ログインフォームが表示されるまで待機（複数の方法で試行）
    try {
      // 最初にdata-testidで試行
      await this.page.waitForSelector('[data-testid="login-form"]', {
        timeout: 15000,
      });
    } catch {
      // data-testidが見つからない場合、フォーム要素で試行
      try {
        await this.page.waitForSelector('form', { timeout: 10000 });
      } catch {
        // それでも見つからない場合、ページの内容をログ出力
        const pageContent = await this.page.content();
        console.log('Page content:', pageContent.substring(0, 1000));
        throw new Error('ログインフォームが見つかりません');
      }
    }

    // メールアドレス入力フィールドを探して入力
    const emailSelector =
      '[data-testid="email-input"], input[type="email"], input[name="email"]';
    await this.page.waitForSelector(emailSelector, { timeout: 10000 });
    await this.page.fill(emailSelector, email);

    // パスワード入力フィールドを探して入力
    const passwordSelector =
      '[data-testid="password-input"], input[type="password"], input[name="password"]';
    await this.page.waitForSelector(passwordSelector, { timeout: 10000 });
    await this.page.fill(passwordSelector, password);

    // ログインボタンを探してクリック
    const loginButtonSelector =
      '[data-testid="login-button"], button[type="submit"], button:has-text("ログイン")';
    await this.page.waitForSelector(loginButtonSelector, { timeout: 10000 });
    await this.page.click(loginButtonSelector);

    // ダッシュボードまたはタイマーコンポーネントの表示を待機
    try {
      await this.page.waitForSelector('[data-testid="timer-component"]', {
        timeout: 20000,
      });
    } catch {
      // タイマーコンポーネントが見つからない場合、認証後のページを探す
      try {
        await this.page.waitForSelector('main, [role="main"]', {
          timeout: 10000,
        });
      } catch {
        // エラー情報を収集
        const currentUrl = this.page.url();
        const pageContent = await this.page.content();
        console.log('Current URL:', currentUrl);
        console.log(
          'Page content after login:',
          pageContent.substring(0, 1000)
        );
        throw new Error('ログイン後のページが見つかりません');
      }
    }

    // ログイン成功の確認
    const isLoggedIn = await this.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error('ログインに失敗しました');
    }
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
      // 複数の方法で認証状態を確認
      const selectors = [
        '[data-testid="timer-component"]',
        '[data-testid="logout-button"]',
        'main[role="main"]',
        'header nav',
      ];

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          return true;
        } catch {
          // 次のセレクターを試行
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
