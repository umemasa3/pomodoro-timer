import { describe, it, expect } from 'vitest';

/**
 * 入力検証とサニタイゼーションテスト
 *
 * 要件6: データ整合性とセキュリティ
 * - 入力データの検証
 * - サニタイゼーション
 * - 型安全性
 */

// 入力検証関数
const validateTaskInput = (input: any) => {
  const errors: string[] = [];

  // タイトルの検証
  if (typeof input.title !== 'string') {
    errors.push('タイトルは必須です');
  } else if (input.title.trim().length === 0) {
    errors.push('タイトルは空にできません');
  } else if (input.title.length > 200) {
    errors.push('タイトルは200文字以内である必要があります');
  }

  // 説明の検証
  if (input.description && typeof input.description !== 'string') {
    errors.push('説明は文字列である必要があります');
  } else if (input.description && input.description.length > 10000) {
    errors.push('説明は10000文字以内である必要があります');
  }

  // 優先度の検証
  if (input.priority && !['low', 'medium', 'high'].includes(input.priority)) {
    errors.push('優先度は low, medium, high のいずれかである必要があります');
  }

  // 見積もり時間の検証
  if (input.estimated_minutes !== undefined) {
    if (typeof input.estimated_minutes !== 'number') {
      errors.push('見積もり時間は数値である必要があります');
    } else if (input.estimated_minutes < 0) {
      errors.push('見積もり時間は0以上である必要があります');
    } else if (input.estimated_minutes > 1440) {
      // 24時間
      errors.push('見積もり時間は1440分以内である必要があります');
    }
  }

  // タグの検証
  if (input.tags && !Array.isArray(input.tags)) {
    errors.push('タグは配列である必要があります');
  } else if (input.tags) {
    for (const tag of input.tags) {
      if (typeof tag !== 'string') {
        errors.push('タグは文字列である必要があります');
        break;
      }
      if (tag.length > 50) {
        errors.push('タグは50文字以内である必要があります');
        break;
      }
    }
    if (input.tags.length > 10) {
      errors.push('タグは10個以内である必要があります');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// HTMLサニタイゼーション関数
const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/on\w+\s*=/gi, '') // イベントハンドラーを除去
    .replace(/javascript:/gi, ''); // JavaScriptプロトコルを除去
};

// SQLインジェクション対策
const sanitizeSqlInput = (input: string): string => {
  // 危険な文字をエスケープ
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '\\;')
    .replace(/--/g, '\\--')
    .replace(/\/\*/g, '\\/*')
    .replace(/\*\//g, '\\*/');
};

describe('入力検証テスト', () => {
  describe('タスク入力検証', () => {
    it('有効なタスクデータを受け入れる', () => {
      const validTask = {
        title: '有効なタスク',
        description: 'これは有効な説明です',
        priority: 'medium',
        estimated_minutes: 30,
        tags: ['work', 'important'],
      };

      const result = validateTaskInput(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('空のタイトルを拒否する', () => {
      const invalidTask = {
        title: '',
        description: '説明',
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タイトルは空にできません');
    });

    it('長すぎるタイトルを拒否する', () => {
      const invalidTask = {
        title: 'a'.repeat(201),
        description: '説明',
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'タイトルは200文字以内である必要があります'
      );
    });

    it('無効な優先度を拒否する', () => {
      const invalidTask = {
        title: 'タスク',
        priority: 'invalid',
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '優先度は low, medium, high のいずれかである必要があります'
      );
    });

    it('負の見積もり時間を拒否する', () => {
      const invalidTask = {
        title: 'タスク',
        estimated_minutes: -10,
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '見積もり時間は0以上である必要があります'
      );
    });

    it('過度に長い説明を拒否する', () => {
      const invalidTask = {
        title: 'タスク',
        description: 'a'.repeat(10001),
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        '説明は10000文字以内である必要があります'
      );
    });

    it('無効なタグ形式を拒否する', () => {
      const invalidTask = {
        title: 'タスク',
        tags: 'invalid', // 配列ではない
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タグは配列である必要があります');
    });

    it('多すぎるタグを拒否する', () => {
      const invalidTask = {
        title: 'タスク',
        tags: Array(11).fill('tag'), // 11個のタグ
      };

      const result = validateTaskInput(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('タグは10個以内である必要があります');
    });
  });

  describe('HTMLサニタイゼーション', () => {
    it('HTMLタグをエスケープする', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
      expect(sanitized).not.toContain('<script>');
    });

    it('特殊文字をエスケープする', () => {
      const input = '& < > " \' /';
      const sanitized = sanitizeHtml(input);

      expect(sanitized).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
    });

    it('通常のテキストはそのまま保持する', () => {
      const input = 'これは通常のテキストです';
      const sanitized = sanitizeHtml(input);

      expect(sanitized).toBe(input);
    });

    it('複合的な攻撃パターンを防ぐ', () => {
      const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('&lt;img');
    });
  });

  describe('SQLインジェクション対策', () => {
    it('シングルクォートをエスケープする', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeSqlInput(maliciousInput);

      expect(sanitized).toBe("''\\; DROP TABLE users\\; \\--");
      expect(sanitized).not.toContain("'; DROP");
    });

    it('SQLコメントをエスケープする', () => {
      const maliciousInput = "admin' --";
      const sanitized = sanitizeSqlInput(maliciousInput);

      expect(sanitized).toBe("admin'' \\--");
    });

    it('複数行コメントをエスケープする', () => {
      const maliciousInput = "admin' /* comment */ OR 1=1";
      const sanitized = sanitizeSqlInput(maliciousInput);

      expect(sanitized).toBe("admin'' \\/* comment \\*/ OR 1=1");
    });

    it('セミコロンをエスケープする', () => {
      const maliciousInput = "admin'; DELETE FROM users;";
      const sanitized = sanitizeSqlInput(maliciousInput);

      expect(sanitized).toBe("admin''\\; DELETE FROM users\\;");
    });
  });

  describe('型安全性', () => {
    it('数値型の検証', () => {
      const validateNumber = (value: any, min?: number, max?: number) => {
        if (typeof value !== 'number') {
          return { isValid: false, error: '数値である必要があります' };
        }
        if (isNaN(value)) {
          return { isValid: false, error: '有効な数値である必要があります' };
        }
        if (min !== undefined && value < min) {
          return { isValid: false, error: `${min}以上である必要があります` };
        }
        if (max !== undefined && value > max) {
          return { isValid: false, error: `${max}以下である必要があります` };
        }
        return { isValid: true };
      };

      expect(validateNumber(42).isValid).toBe(true);
      expect(validateNumber('42').isValid).toBe(false);
      expect(validateNumber(NaN).isValid).toBe(false);
      expect(validateNumber(5, 10).isValid).toBe(false);
      expect(validateNumber(15, 10, 20).isValid).toBe(true);
    });

    it('メールアドレスの検証', () => {
      const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: emailRegex.test(email),
          error: emailRegex.test(email)
            ? null
            : '有効なメールアドレスを入力してください',
        };
      };

      expect(validateEmail('user@example.com').isValid).toBe(true);
      expect(validateEmail('invalid-email').isValid).toBe(false);
      expect(validateEmail('user@').isValid).toBe(false);
      expect(validateEmail('@example.com').isValid).toBe(false);
    });

    it('日付の検証', () => {
      const validateDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
          isValid: !isNaN(date.getTime()),
          error: isNaN(date.getTime()) ? '有効な日付を入力してください' : null,
        };
      };

      expect(validateDate('2024-01-01').isValid).toBe(true);
      expect(validateDate('invalid-date').isValid).toBe(false);
      expect(validateDate('2024-13-01').isValid).toBe(false);
    });
  });

  describe('ファイルアップロード検証', () => {
    it('許可されたファイル形式のみ受け入れる', () => {
      const validateFileType = (filename: string, allowedTypes: string[]) => {
        const extension = filename.split('.').pop()?.toLowerCase();
        return {
          isValid: extension ? allowedTypes.includes(extension) : false,
          error:
            extension && allowedTypes.includes(extension)
              ? null
              : `許可されたファイル形式: ${allowedTypes.join(', ')}`,
        };
      };

      const allowedTypes = ['jpg', 'png', 'gif'];

      expect(validateFileType('image.jpg', allowedTypes).isValid).toBe(true);
      expect(validateFileType('image.PNG', allowedTypes).isValid).toBe(true);
      expect(validateFileType('script.exe', allowedTypes).isValid).toBe(false);
      expect(validateFileType('document.pdf', allowedTypes).isValid).toBe(
        false
      );
    });

    it('ファイルサイズを制限する', () => {
      const validateFileSize = (size: number, maxSize: number) => {
        return {
          isValid: size <= maxSize,
          error:
            size <= maxSize
              ? null
              : `ファイルサイズは${maxSize / 1024 / 1024}MB以下である必要があります`,
        };
      };

      const maxSize = 5 * 1024 * 1024; // 5MB

      expect(validateFileSize(1024 * 1024, maxSize).isValid).toBe(true); // 1MB
      expect(validateFileSize(10 * 1024 * 1024, maxSize).isValid).toBe(false); // 10MB
    });
  });
});
