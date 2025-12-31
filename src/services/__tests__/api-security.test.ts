import { describe, it, expect, beforeEach } from 'vitest';

/**
 * APIセキュリティテスト
 *
 * 要件6: データ整合性とセキュリティ
 * - API認証・認可
 * - レート制限
 * - APIキー管理
 * - リクエスト検証
 */

// レート制限管理
class RateLimiter {
  private requests = new Map<string, Array<number>>();
  private limits = {
    perMinute: 60,
    perHour: 1000,
    perDay: 10000,
  };

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // 古いリクエストを削除（1日以上前）
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const recentRequests = clientRequests.filter(time => time > dayAgo);

    // 制限チェック
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    const requestsPerMinute = recentRequests.filter(
      time => time > minuteAgo
    ).length;
    const requestsPerHour = recentRequests.filter(
      time => time > hourAgo
    ).length;
    const requestsPerDay = recentRequests.length;

    if (requestsPerMinute >= this.limits.perMinute) return false;
    if (requestsPerHour >= this.limits.perHour) return false;
    if (requestsPerDay >= this.limits.perDay) return false;

    // リクエストを記録
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    return true;
  }

  getRemainingRequests(clientId: string): {
    perMinute: number;
    perHour: number;
    perDay: number;
  } {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const requestsPerMinute = clientRequests.filter(
      time => time > minuteAgo
    ).length;
    const requestsPerHour = clientRequests.filter(
      time => time > hourAgo
    ).length;
    const requestsPerDay = clientRequests.filter(time => time > dayAgo).length;

    return {
      perMinute: Math.max(0, this.limits.perMinute - requestsPerMinute),
      perHour: Math.max(0, this.limits.perHour - requestsPerHour),
      perDay: Math.max(0, this.limits.perDay - requestsPerDay),
    };
  }
}

// API認証管理
class APIAuthentication {
  private apiKeys = new Map<
    string,
    {
      userId: string;
      permissions: string[];
      createdAt: Date;
      lastUsed: Date;
      isActive: boolean;
    }
  >();

  generateAPIKey(userId: string, permissions: string[]): string {
    const key = 'pk_' + this.randomString(32);
    this.apiKeys.set(key, {
      userId,
      permissions,
      createdAt: new Date(),
      lastUsed: new Date(),
      isActive: true,
    });
    return key;
  }

  validateAPIKey(apiKey: string): {
    isValid: boolean;
    userId?: string;
    permissions?: string[];
  } {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData || !keyData.isActive) {
      return { isValid: false };
    }

    // 最終使用日時を更新
    keyData.lastUsed = new Date();

    return {
      isValid: true,
      userId: keyData.userId,
      permissions: keyData.permissions,
    };
  }

  hasPermission(apiKey: string, requiredPermission: string): boolean {
    const validation = this.validateAPIKey(apiKey);
    if (!validation.isValid || !validation.permissions) {
      return false;
    }

    return (
      validation.permissions.includes(requiredPermission) ||
      validation.permissions.includes('admin')
    );
  }

  revokeAPIKey(apiKey: string): boolean {
    const keyData = this.apiKeys.get(apiKey);
    if (keyData) {
      keyData.isActive = false;
      return true;
    }
    return false;
  }

  private randomString(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// リクエスト検証
class RequestValidator {
  static validateHeaders(headers: Record<string, string>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Content-Typeの検証
    if (
      headers['content-type'] &&
      !headers['content-type'].includes('application/json') &&
      !headers['content-type'].includes('multipart/form-data')
    ) {
      errors.push('サポートされていないContent-Type');
    }

    // User-Agentの検証
    if (!headers['user-agent']) {
      errors.push('User-Agentヘッダーが必要です');
    }

    // Authorizationの検証
    if (
      headers['authorization'] &&
      !headers['authorization'].startsWith('Bearer ') &&
      !headers['authorization'].startsWith('API-Key ')
    ) {
      errors.push('無効なAuthorizationヘッダー形式');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateRequestSize(
    contentLength: number,
    maxSize: number = 10 * 1024 * 1024
  ): boolean {
    return contentLength <= maxSize;
  }

  static detectSuspiciousPatterns(requestBody: string): boolean {
    const suspiciousPatterns = [
      /\b(union|select|insert|update|delete|drop|create|alter)\b/gi,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(requestBody));
  }
}

describe('レート制限テスト', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  it('通常のリクエストを許可する', () => {
    const clientId = 'client-1';

    for (let i = 0; i < 10; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }
  });

  it('分あたりの制限を適用する', () => {
    const clientId = 'client-1';

    // 60回のリクエストは許可される
    for (let i = 0; i < 60; i++) {
      expect(rateLimiter.isAllowed(clientId)).toBe(true);
    }

    // 61回目は拒否される
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
  });

  it('異なるクライアントは独立して制限される', () => {
    const client1 = 'client-1';
    const client2 = 'client-2';

    // client1が制限に達する
    for (let i = 0; i < 60; i++) {
      rateLimiter.isAllowed(client1);
    }
    expect(rateLimiter.isAllowed(client1)).toBe(false);

    // client2は影響を受けない
    expect(rateLimiter.isAllowed(client2)).toBe(true);
  });

  it('残りリクエスト数を正確に計算する', () => {
    const clientId = 'client-1';

    // 10回リクエスト
    for (let i = 0; i < 10; i++) {
      rateLimiter.isAllowed(clientId);
    }

    const remaining = rateLimiter.getRemainingRequests(clientId);
    expect(remaining.perMinute).toBe(50); // 60 - 10
    expect(remaining.perHour).toBe(990); // 1000 - 10
    expect(remaining.perDay).toBe(9990); // 10000 - 10
  });
});

describe('API認証テスト', () => {
  let apiAuth: APIAuthentication;

  beforeEach(() => {
    apiAuth = new APIAuthentication();
  });

  it('APIキーを生成する', () => {
    const userId = 'user-123';
    const permissions = ['read', 'write'];

    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    expect(apiKey).toBeDefined();
    expect(apiKey.startsWith('pk_')).toBe(true);
    expect(apiKey.length).toBe(35); // 'pk_' + 32文字
  });

  it('有効なAPIキーを検証する', () => {
    const userId = 'user-123';
    const permissions = ['read', 'write'];
    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    const validation = apiAuth.validateAPIKey(apiKey);

    expect(validation.isValid).toBe(true);
    expect(validation.userId).toBe(userId);
    expect(validation.permissions).toEqual(permissions);
  });

  it('無効なAPIキーを拒否する', () => {
    const validation = apiAuth.validateAPIKey('invalid-key');

    expect(validation.isValid).toBe(false);
    expect(validation.userId).toBeUndefined();
    expect(validation.permissions).toBeUndefined();
  });

  it('権限を正しく検証する', () => {
    const userId = 'user-123';
    const permissions = ['read', 'write'];
    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    expect(apiAuth.hasPermission(apiKey, 'read')).toBe(true);
    expect(apiAuth.hasPermission(apiKey, 'write')).toBe(true);
    expect(apiAuth.hasPermission(apiKey, 'admin')).toBe(false);
  });

  it('管理者権限は全ての権限を含む', () => {
    const userId = 'admin-123';
    const permissions = ['admin'];
    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    expect(apiAuth.hasPermission(apiKey, 'read')).toBe(true);
    expect(apiAuth.hasPermission(apiKey, 'write')).toBe(true);
    expect(apiAuth.hasPermission(apiKey, 'delete')).toBe(true);
    expect(apiAuth.hasPermission(apiKey, 'admin')).toBe(true);
  });

  it('APIキーを無効化する', () => {
    const userId = 'user-123';
    const permissions = ['read'];
    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    // 最初は有効
    expect(apiAuth.validateAPIKey(apiKey).isValid).toBe(true);

    // 無効化
    const revoked = apiAuth.revokeAPIKey(apiKey);
    expect(revoked).toBe(true);

    // 無効化後は使用不可
    expect(apiAuth.validateAPIKey(apiKey).isValid).toBe(false);
  });
});

describe('リクエスト検証テスト', () => {
  describe('ヘッダー検証', () => {
    it('有効なヘッダーを受け入れる', () => {
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'MyApp/1.0',
        authorization: 'Bearer token123',
      };

      const validation = RequestValidator.validateHeaders(headers);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('User-Agentの不足を検出する', () => {
      const headers = {
        'content-type': 'application/json',
      };

      const validation = RequestValidator.validateHeaders(headers);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('User-Agentヘッダーが必要です');
    });

    it('無効なContent-Typeを検出する', () => {
      const headers = {
        'content-type': 'text/plain',
        'user-agent': 'MyApp/1.0',
      };

      const validation = RequestValidator.validateHeaders(headers);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('サポートされていないContent-Type');
    });

    it('無効なAuthorizationヘッダーを検出する', () => {
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'MyApp/1.0',
        authorization: 'Invalid token123',
      };

      const validation = RequestValidator.validateHeaders(headers);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('無効なAuthorizationヘッダー形式');
    });
  });

  describe('リクエストサイズ検証', () => {
    it('許可されたサイズのリクエストを受け入れる', () => {
      const contentLength = 1024; // 1KB
      const maxSize = 10 * 1024 * 1024; // 10MB

      expect(RequestValidator.validateRequestSize(contentLength, maxSize)).toBe(
        true
      );
    });

    it('大きすぎるリクエストを拒否する', () => {
      const contentLength = 20 * 1024 * 1024; // 20MB
      const maxSize = 10 * 1024 * 1024; // 10MB

      expect(RequestValidator.validateRequestSize(contentLength, maxSize)).toBe(
        false
      );
    });
  });

  describe('不審なパターン検出', () => {
    it('SQLインジェクションパターンを検出する', () => {
      const maliciousBody =
        '{"query": "SELECT * FROM users WHERE id = 1 UNION SELECT * FROM passwords"}';

      expect(RequestValidator.detectSuspiciousPatterns(maliciousBody)).toBe(
        true
      );
    });

    it('XSSパターンを検出する', () => {
      const maliciousBody = '{"content": "<script>alert(\\"XSS\\")</script>"}';

      expect(RequestValidator.detectSuspiciousPatterns(maliciousBody)).toBe(
        true
      );
    });

    it('JavaScriptインジェクションを検出する', () => {
      const maliciousBody = '{"code": "eval(\\"malicious code\\")"}';

      expect(RequestValidator.detectSuspiciousPatterns(maliciousBody)).toBe(
        true
      );
    });

    it('安全なリクエストは通す', () => {
      const safeBody =
        '{"title": "My Task", "description": "This is a normal task description"}';

      expect(RequestValidator.detectSuspiciousPatterns(safeBody)).toBe(false);
    });
  });
});

describe('APIセキュリティ統合テスト', () => {
  let rateLimiter: RateLimiter;
  let apiAuth: APIAuthentication;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    apiAuth = new APIAuthentication();
  });

  it('完全なAPIリクエスト検証フロー', () => {
    // 1. APIキーの生成
    const userId = 'user-123';
    const permissions = ['read', 'write'];
    const apiKey = apiAuth.generateAPIKey(userId, permissions);

    // 2. リクエストヘッダーの検証
    const headers = {
      'content-type': 'application/json',
      'user-agent': 'MyApp/1.0',
      authorization: `API-Key ${apiKey}`,
    };
    const headerValidation = RequestValidator.validateHeaders(headers);
    expect(headerValidation.isValid).toBe(true);

    // 3. APIキーの検証
    const keyValidation = apiAuth.validateAPIKey(apiKey);
    expect(keyValidation.isValid).toBe(true);

    // 4. 権限の確認
    expect(apiAuth.hasPermission(apiKey, 'read')).toBe(true);

    // 5. レート制限の確認
    expect(rateLimiter.isAllowed(userId)).toBe(true);

    // 6. リクエストボディの検証
    const requestBody =
      '{"title": "New Task", "description": "Task description"}';
    expect(RequestValidator.detectSuspiciousPatterns(requestBody)).toBe(false);

    // 7. リクエストサイズの検証
    expect(RequestValidator.validateRequestSize(requestBody.length)).toBe(true);
  });

  it('セキュリティ違反を適切に拒否する', () => {
    // 無効なAPIキー
    const invalidKey = 'invalid-key';
    expect(apiAuth.validateAPIKey(invalidKey).isValid).toBe(false);

    // 不審なリクエストボディ
    const maliciousBody = '{"query": "DROP TABLE users"}';
    expect(RequestValidator.detectSuspiciousPatterns(maliciousBody)).toBe(true);

    // レート制限超過
    const clientId = 'abusive-client';
    for (let i = 0; i < 61; i++) {
      rateLimiter.isAllowed(clientId);
    }
    expect(rateLimiter.isAllowed(clientId)).toBe(false);
  });
});
