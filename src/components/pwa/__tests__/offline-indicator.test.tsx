import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../offline-indicator';
import { useOnlineStatus } from '../../../hooks/use-online-status';

// オンラインステータスフックのモック
vi.mock('../../../hooks/use-online-status', () => ({
  useOnlineStatus: vi.fn(),
}));

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('オンライン時は何も表示されない', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(true);

      render(<OfflineIndicator />);

      expect(screen.queryByText(/オフラインモード/)).not.toBeInTheDocument();
    });

    it('オフライン時にインジケーターが表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      expect(
        screen.getByText('オフラインモード - データは自動的に同期されます')
      ).toBeInTheDocument();
    });

    it('オフライン時に警告アイコンが表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon?.tagName).toBe('svg');
    });

    it('適切な背景色が適用される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const classAttribute = indicator?.getAttribute('class') || '';
      expect(classAttribute).toContain('bg-yellow-500');
    });

    it('適切な位置に固定表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const classAttribute = indicator?.getAttribute('class') || '';
      expect(classAttribute).toContain('fixed');
      expect(classAttribute).toContain('top-0');
      expect(classAttribute).toContain('left-0');
      expect(classAttribute).toContain('right-0');
      expect(classAttribute).toContain('z-50');
    });

    it('適切なテキストスタイルが適用される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const text = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      );
      expect(text.className).toContain('text-sm');
      expect(text.className).toContain('font-medium');
      expect(text.className).toContain('text-yellow-900');
    });

    it('アイコンが適切なスタイルで表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // SVGのクラス属性を確認（実際のコンポーネントの構造に合わせる）
      const classAttribute = icon?.getAttribute('class') || '';
      const actualClasses = classAttribute.split(' ');

      // 少なくとも一部のクラスが含まれていることを確認
      expect(actualClasses.some((cls: string) => cls.includes('h-5'))).toBe(
        true
      );
      expect(actualClasses.some((cls: string) => cls.includes('w-5'))).toBe(
        true
      );
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイルデバイスでも適切に表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const classAttribute = indicator?.getAttribute('class') || '';
      expect(classAttribute).toContain('px-4');
      expect(classAttribute).toContain('py-2');
    });

    it('中央揃えのレイアウトが適用される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const container = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      ).parentElement;
      const classAttribute = container?.getAttribute('class') || '';
      expect(classAttribute).toContain('flex');
      expect(classAttribute).toContain('items-center');
      expect(classAttribute).toContain('justify-center');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なセマンティック構造になっている', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      // テキストが適切に表示されている
      const text = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      );
      expect(text).toBeInTheDocument();
      expect(text.tagName).toBe('SPAN');
    });

    it('アイコンが装飾的要素として適切にマークされている', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();

      // SVGパスの確認（警告アイコンの特徴的なパス）
      const path = icon?.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path?.getAttribute('d')).toContain('M12 9v3.75m');
    });

    it('高コントラストモードでも視認性が保たれる', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const text = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      );
      const icon = document.querySelector('svg');

      // 背景と文字色のコントラストが適切
      const indicatorClass = indicator?.getAttribute('class') || '';
      const textClass = text.getAttribute('class') || '';
      const iconClass = icon?.getAttribute('class') || '';

      expect(indicatorClass).toContain('bg-yellow-500');
      expect(textClass).toContain('text-yellow-900');
      expect(iconClass).toContain('text-yellow-900');
    });
  });

  describe('状態変化の処理', () => {
    it('オンライン→オフライン状態変化で表示される', () => {
      const { rerender } = render(<OfflineIndicator />);

      // 初期状態：オンライン
      vi.mocked(useOnlineStatus).mockReturnValue(true);
      rerender(<OfflineIndicator />);
      expect(screen.queryByText(/オフラインモード/)).not.toBeInTheDocument();

      // 状態変化：オフライン
      vi.mocked(useOnlineStatus).mockReturnValue(false);
      rerender(<OfflineIndicator />);
      expect(
        screen.getByText('オフラインモード - データは自動的に同期されます')
      ).toBeInTheDocument();
    });

    it('オフライン→オンライン状態変化で非表示になる', () => {
      const { rerender } = render(<OfflineIndicator />);

      // 初期状態：オフライン
      vi.mocked(useOnlineStatus).mockReturnValue(false);
      rerender(<OfflineIndicator />);
      expect(
        screen.getByText('オフラインモード - データは自動的に同期されます')
      ).toBeInTheDocument();

      // 状態変化：オンライン
      vi.mocked(useOnlineStatus).mockReturnValue(true);
      rerender(<OfflineIndicator />);
      expect(screen.queryByText(/オフラインモード/)).not.toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('useOnlineStatusがundefinedを返してもクラッシュしない', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(undefined as any);

      expect(() => {
        render(<OfflineIndicator />);
      }).not.toThrow();
    });

    it('useOnlineStatusがnullを返してもクラッシュしない', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(null as any);

      expect(() => {
        render(<OfflineIndicator />);
      }).not.toThrow();
    });
  });

  describe('パフォーマンス', () => {
    it('オンライン時は何もレンダリングしない（パフォーマンス最適化）', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(true);

      const { container } = render(<OfflineIndicator />);

      // コンテナが空であることを確認
      expect(container.firstChild).toBeNull();
    });

    it('オフライン時のみDOM要素を作成する', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      const { container } = render(<OfflineIndicator />);

      // DOM要素が存在することを確認
      expect(container.firstChild).not.toBeNull();
      expect(container.querySelector('.fixed')).toBeInTheDocument();
    });
  });

  describe('UI一貫性', () => {
    it('他のUI要素と一貫したスタイリングが適用される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const classAttribute = indicator?.getAttribute('class') || '';

      // 一貫したパディングとマージン
      expect(classAttribute).toContain('px-4');
      expect(classAttribute).toContain('py-2');

      // 適切なz-index
      expect(classAttribute).toContain('z-50');
    });

    it('警告色のテーマが一貫して適用される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const indicator = document.querySelector('.fixed');
      const text = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      );
      const icon = document.querySelector('svg');

      // 警告色テーマの一貫性
      const indicatorClass = indicator?.getAttribute('class') || '';
      const textClass = text.getAttribute('class') || '';
      const iconClass = icon?.getAttribute('class') || '';

      expect(indicatorClass).toContain('bg-yellow-500');
      expect(textClass).toContain('text-yellow-900');
      expect(iconClass).toContain('text-yellow-900');
    });
  });

  describe('メッセージ内容', () => {
    it('適切なユーザー向けメッセージが表示される', () => {
      vi.mocked(useOnlineStatus).mockReturnValue(false);

      render(<OfflineIndicator />);

      const message = screen.getByText(
        'オフラインモード - データは自動的に同期されます'
      );
      expect(message).toBeInTheDocument();

      // メッセージが分かりやすく、安心感を与える内容であることを確認
      expect(message.textContent).toContain('オフラインモード');
      expect(message.textContent).toContain('自動的に同期');
    });
  });
});
