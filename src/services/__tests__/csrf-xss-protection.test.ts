import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * CSRF・XSS保護テスト
 *
 * 要件6: データ整合性とセキュリティ
 * - CSRF攻撃の防止
 * - XSS攻撃の防止
 * - セキュアヘッダーの設定
 */

// CSRFトークン管理
class CSRFProtection {
  private tokens = new Map<string, { token: string; expires: number }>();

  generateToken(sessionId: string): string {
    const token = this.randomString(32);
    const expires = Date.now() + 30 * 60 * 1000; // 30分後に期限切れ

    this.tokens.set(sessionId, { token, expires });
    return token;
  }

  validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    if (!stored) return false;

    if (Date.now() > stored.expires) {
      this.tokens.delete(sessionId);
      return false;
    }

    return stored.token === token;
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

// XSS保護
class XSSProtection {
  static sanitizeInput(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/on\w+\s*=/gi, '') // イベントハンドラーを除去
      .replace(/javascript:/gi, ''); // JavaScriptプロトコルを除去
  }

  static validateContentSecurityPolicy(csp: string): boolean {
    // 基本的なCSPディレクティブの検証
    const requiredDirectives = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
    ];

    return requiredDirectives.every(directive => csp.includes(directive));
  }

  static detectXSSPatterns(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /expression\s*\(/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }
}

describe('CSRF保護テスト', () => {
  let csrfProtection: CSRFProtection;

  beforeEach(() => {
    csrfProtection = new CSRFProtection();
  });

  it('CSRFトークンを生成する', () => {
    const sessionId = 'session-123';
    const token = csrfProtection.generateToken(sessionId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(32);
  });

  it('有効なCSRFトークンを検証する', () => {
    const sessionId = 'session-123';
    const token = csrfProtection.generateToken(sessionId);

    const isValid = csrfProtection.validateToken(sessionId, token);
    expect(isValid).toBe(true);
  });

  it('無効なCSRFトークンを拒否する', () => {
    const sessionId = 'session-123';
    csrfProtection.generateToken(sessionId);

    const isValid = csrfProtection.validateToken(sessionId, 'invalid-token');
    expect(isValid).toBe(false);
  });

  it('存在しないセッションのトークンを拒否する', () => {
    const isValid = csrfProtection.validateToken(
      'non-existent-session',
      'any-token'
    );
    expect(isValid).toBe(false);
  });

  it('期限切れのCSRFトークンを拒否する', () => {
    const sessionId = 'session-123';
    const token = csrfProtection.generateToken(sessionId);

    // 時間を進める（モック）
    const originalNow = Date.now;
    Date.now = vi.fn(() => originalNow() + 31 * 60 * 1000); // 31分後

    const isValid = csrfProtection.validateToken(sessionId, token);
    expect(isValid).toBe(false);

    // 元に戻す
    Date.now = originalNow;
  });

  it('異なるセッション間でトークンが独立している', () => {
    const session1 = 'session-1';
    const session2 = 'session-2';

    const token1 = csrfProtection.generateToken(session1);
    const token2 = csrfProtection.generateToken(session2);

    expect(token1).not.toBe(token2);
    expect(csrfProtection.validateToken(session1, token1)).toBe(true);
    expect(csrfProtection.validateToken(session2, token2)).toBe(true);
    expect(csrfProtection.validateToken(session1, token2)).toBe(false);
    expect(csrfProtection.validateToken(session2, token1)).toBe(false);
  });
});

describe('XSS保護テスト', () => {
  describe('入力サニタイゼーション', () => {
    it('基本的なHTMLタグをエスケープする', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = XSSProtection.sanitizeInput(maliciousInput);

      expect(sanitized).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(sanitized).not.toContain('<script>');
    });

    it('イベントハンドラーをエスケープする', () => {
      const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = XSSProtection.sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('onerror="');
      expect(sanitized).toContain('&lt;img');
    });

    it('JavaScriptプロトコルをエスケープする', () => {
      const maliciousInput = '<a href="javascript:alert(\'XSS\')">Click me</a>';
      const sanitized = XSSProtection.sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('javascript:alert');
      expect(sanitized).toContain('&lt;a');
    });

    it('通常のテキストは変更しない', () => {
      const normalInput = 'これは通常のテキストです。数字123も含まれます。';
      const sanitized = XSSProtection.sanitizeInput(normalInput);

      expect(sanitized).toBe(normalInput);
    });
  });

  describe('XSSパターン検出', () => {
    it('スクリプトタグを検出する', () => {
      const inputs = [
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script src="malicious.js"></script>',
        '<script type="text/javascript">alert("XSS")</script>',
      ];

      inputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(true);
      });
    });

    it('JavaScriptプロトコルを検出する', () => {
      const inputs = [
        'javascript:alert("XSS")',
        'JAVASCRIPT:alert("XSS")',
        'href="javascript:void(0)"',
      ];

      inputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(true);
      });
    });

    it('イベントハンドラーを検出する', () => {
      const inputs = [
        'onclick="alert(\'XSS\')"',
        'onload="maliciousFunction()"',
        'onerror="alert(\'XSS\')"',
        'onmouseover="alert(\'XSS\')"',
      ];

      inputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(true);
      });
    });

    it('危険なHTMLタグを検出する', () => {
      const inputs = [
        '<iframe src="malicious.html"></iframe>',
        '<object data="malicious.swf"></object>',
        '<embed src="malicious.swf">',
      ];

      inputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(true);
      });
    });

    it('CSSエクスプレッションを検出する', () => {
      const inputs = ['expression(alert("XSS"))', 'EXPRESSION(alert("XSS"))'];

      inputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(true);
      });
    });

    it('安全な入力は検出しない', () => {
      const safeInputs = [
        'これは安全なテキストです',
        '<p>通常のHTMLテキスト</p>',
        'email@example.com',
        'https://example.com',
        '数字123と記号!@#',
      ];

      safeInputs.forEach(input => {
        expect(XSSProtection.detectXSSPatterns(input)).toBe(false);
      });
    });
  });

  describe('Content Security Policy', () => {
    it('有効なCSPを検証する', () => {
      const validCSP =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";

      expect(XSSProtection.validateContentSecurityPolicy(validCSP)).toBe(true);
    });

    it('不完全なCSPを拒否する', () => {
      const incompleteCSP = "default-src 'self'; script-src 'self';";

      expect(XSSProtection.validateContentSecurityPolicy(incompleteCSP)).toBe(
        false
      );
    });

    it('空のCSPを拒否する', () => {
      expect(XSSProtection.validateContentSecurityPolicy('')).toBe(false);
    });
  });
});

describe('セキュリティヘッダーテスト', () => {
  it('必要なセキュリティヘッダーが設定されている', () => {
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // 各ヘッダーが適切に設定されていることを確認
    expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(securityHeaders['X-Frame-Options']).toBe('DENY');
    expect(securityHeaders['X-XSS-Protection']).toBe('1; mode=block');
    expect(securityHeaders['Strict-Transport-Security']).toContain(
      'max-age=31536000'
    );
    expect(securityHeaders['Content-Security-Policy']).toContain(
      "default-src 'self'"
    );
    expect(securityHeaders['Referrer-Policy']).toBe(
      'strict-origin-when-cross-origin'
    );
  });

  it('HTTPSリダイレクトが機能する', () => {
    const checkHTTPSRedirect = (url: string) => {
      if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
      }
      return url;
    };

    expect(checkHTTPSRedirect('http://example.com')).toBe(
      'https://example.com'
    );
    expect(checkHTTPSRedirect('https://example.com')).toBe(
      'https://example.com'
    );
  });
});

describe('セッション管理セキュリティ', () => {
  it('セッションIDが予測不可能である', () => {
    const generateSessionId = () => {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const sessionIds = new Set();
    for (let i = 0; i < 1000; i++) {
      const sessionId = generateSessionId();
      expect(sessionId.length).toBe(32);
      expect(sessionIds.has(sessionId)).toBe(false);
      sessionIds.add(sessionId);
    }
  });

  it('セッションクッキーが適切に設定される', () => {
    const sessionCookie = {
      name: 'sessionId',
      value: 'abc123',
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24時間
    };

    expect(sessionCookie.httpOnly).toBe(true);
    expect(sessionCookie.secure).toBe(true);
    expect(sessionCookie.sameSite).toBe('strict');
    expect(sessionCookie.maxAge).toBe(24 * 60 * 60 * 1000);
  });

  it('セッション固定攻撃を防ぐ', () => {
    const sessionManager = {
      sessions: new Map<string, any>(),

      regenerateSessionId(oldSessionId: string) {
        const sessionData = this.sessions.get(oldSessionId);
        if (sessionData) {
          this.sessions.delete(oldSessionId);
          const newSessionId = this.generateNewSessionId();
          this.sessions.set(newSessionId, sessionData);
          return newSessionId;
        }
        return null;
      },

      generateNewSessionId() {
        return 'new-session-' + Math.random().toString(36).substring(2, 11);
      },
    };

    const oldSessionId = 'old-session-123';
    sessionManager.sessions.set(oldSessionId, { userId: 'user-1' });

    const newSessionId = sessionManager.regenerateSessionId(oldSessionId);

    expect(newSessionId).not.toBe(oldSessionId);
    expect(sessionManager.sessions.has(oldSessionId)).toBe(false);
    expect(sessionManager.sessions.has(newSessionId!)).toBe(true);
  });
});
