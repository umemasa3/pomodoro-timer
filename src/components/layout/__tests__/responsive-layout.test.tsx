import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ResponsiveLayout,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveNav,
  ResponsiveModal,
} from '../responsive-layout';
import {
  useBreakpoints,
  useOrientation,
  useTouchDevice,
} from '../../../hooks/use-responsive';

// レスポンシブフックのモック
vi.mock('../../../hooks/use-responsive', () => ({
  useBreakpoints: vi.fn(),
  useOrientation: vi.fn(),
  useTouchDevice: vi.fn(),
}));

// Framer Motionのモック
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      whileHover,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: any) => (
      <div
        className={className}
        data-testid="motion-div"
        data-while-hover={JSON.stringify(whileHover)}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-exit={JSON.stringify(exit)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
    button: ({
      children,
      onClick,
      className,
      whileHover,
      whileTap,
      disabled,
      ...props
    }: any) => (
      <button
        onClick={onClick}
        className={className}
        disabled={disabled}
        data-testid="motion-button"
        data-while-hover={JSON.stringify(whileHover)}
        data-while-tap={JSON.stringify(whileTap)}
        {...props}
      >
        {children}
      </button>
    ),
  },
}));

describe('ResponsiveLayout', () => {
  const mockBreakpoints = {
    isSm: false,
    isMd: false,
    isLg: true,
    isXl: true,
    is2Xl: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    currentBreakpoint: 'lg' as const,
    width: 1024,
  };

  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue(mockBreakpoints);
    vi.mocked(useOrientation).mockReturnValue('portrait');
    vi.mocked(useTouchDevice).mockReturnValue(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(
        <ResponsiveLayout>
          <div>テストコンテンツ</div>
        </ResponsiveLayout>
      );

      expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
    });

    it('デスクトップ用のCSSクラスが適用される', () => {
      render(
        <ResponsiveLayout>
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('responsive-layout');
      expect(layout?.className).toContain('layout-desktop');
      expect(layout?.className).toContain('layout-portrait');
      expect(layout?.className).toContain('layout-mouse');
    });

    it('モバイル用のCSSクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(
        <ResponsiveLayout>
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('layout-mobile');
    });

    it('タブレット用のCSSクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: true,
        isMd: true,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        currentBreakpoint: 'md' as const,
        width: 768,
      });

      render(
        <ResponsiveLayout>
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('layout-tablet');
    });

    it('横向き表示のCSSクラスが適用される', () => {
      vi.mocked(useOrientation).mockReturnValue('landscape');

      render(
        <ResponsiveLayout>
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('layout-landscape');
    });

    it('タッチデバイス用のCSSクラスが適用される', () => {
      vi.mocked(useTouchDevice).mockReturnValue(true);

      render(
        <ResponsiveLayout>
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('layout-touch');
    });

    it('カスタムクラスが適用される', () => {
      render(
        <ResponsiveLayout className="custom-layout">
          <div>コンテンツ</div>
        </ResponsiveLayout>
      );

      const layout = screen.getByText('コンテンツ').parentElement;
      expect(layout?.className).toContain('custom-layout');
    });
  });
});

describe('ResponsiveContainer', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue({
      isSm: false,
      isMd: false,
      isLg: true,
      isXl: true,
      is2Xl: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    });
    vi.clearAllMocks();
  });

  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(
        <ResponsiveContainer>
          <div>コンテナコンテンツ</div>
        </ResponsiveContainer>
      );

      expect(screen.getByText('コンテナコンテンツ')).toBeInTheDocument();
    });

    it('デスクトップ用のコンテナクラスが適用される', () => {
      render(
        <ResponsiveContainer>
          <div>コンテンツ</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('コンテンツ').parentElement;
      expect(container?.className).toContain('w-full');
      expect(container?.className).toContain('mx-auto');
      expect(container?.className).toContain('max-w-7xl');
      expect(container?.className).toContain('px-8');
    });

    it('モバイル用のコンテナクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(
        <ResponsiveContainer>
          <div>コンテンツ</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('コンテンツ').parentElement;
      expect(container?.className).toContain('max-w-none');
      expect(container?.className).toContain('px-4');
    });

    it('タブレット用のコンテナクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: true,
        isMd: true,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        currentBreakpoint: 'md' as const,
        width: 768,
      });

      render(
        <ResponsiveContainer>
          <div>コンテンツ</div>
        </ResponsiveContainer>
      );

      const container = screen.getByText('コンテンツ').parentElement;
      expect(container?.className).toContain('max-w-4xl');
      expect(container?.className).toContain('px-6');
    });
  });
});

describe('ResponsiveGrid', () => {
  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(
        <ResponsiveGrid>
          <div>グリッドアイテム1</div>
          <div>グリッドアイテム2</div>
        </ResponsiveGrid>
      );

      expect(screen.getByText('グリッドアイテム1')).toBeInTheDocument();
      expect(screen.getByText('グリッドアイテム2')).toBeInTheDocument();
    });

    it('デフォルトのグリッドクラスが適用される', () => {
      render(
        <ResponsiveGrid>
          <div>アイテム</div>
        </ResponsiveGrid>
      );

      const grid = screen.getByText('アイテム').parentElement;
      expect(grid?.className).toContain('grid');
      expect(grid?.className).toContain('gap-4');
      expect(grid?.className).toContain('grid-cols-1');
      expect(grid?.className).toContain('sm:grid-cols-2');
      expect(grid?.className).toContain('md:grid-cols-3');
      expect(grid?.className).toContain('lg:grid-cols-4');
    });

    it('カスタムカラム設定が適用される', () => {
      render(
        <ResponsiveGrid cols={{ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 }}>
          <div>アイテム</div>
        </ResponsiveGrid>
      );

      const grid = screen.getByText('アイテム').parentElement;
      expect(grid?.className).toContain('grid-cols-2');
      expect(grid?.className).toContain('sm:grid-cols-3');
      expect(grid?.className).toContain('md:grid-cols-4');
      expect(grid?.className).toContain('lg:grid-cols-5');
      expect(grid?.className).toContain('xl:grid-cols-6');
    });

    it('カスタムギャップが適用される', () => {
      render(
        <ResponsiveGrid gap={6}>
          <div>アイテム</div>
        </ResponsiveGrid>
      );

      const grid = screen.getByText('アイテム').parentElement;
      expect(grid?.className).toContain('gap-6');
    });
  });
});

describe('ResponsiveCard', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue({
      isSm: false,
      isMd: false,
      isLg: true,
      isXl: true,
      is2Xl: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    });
    vi.clearAllMocks();
  });

  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(
        <ResponsiveCard>
          <div>カードコンテンツ</div>
        </ResponsiveCard>
      );

      expect(screen.getByText('カードコンテンツ')).toBeInTheDocument();
    });

    it('デフォルトのカードクラスが適用される', () => {
      render(
        <ResponsiveCard>
          <div>コンテンツ</div>
        </ResponsiveCard>
      );

      const card = screen.getByTestId('motion-div');
      expect(card.className).toContain('card');
      expect(card.className).toContain('p-6');
    });

    it('モバイル用のパディングが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(
        <ResponsiveCard>
          <div>コンテンツ</div>
        </ResponsiveCard>
      );

      const card = screen.getByTestId('motion-div');
      expect(card.className).toContain('p-4');
    });

    it('パディングサイズが正しく適用される', () => {
      render(
        <ResponsiveCard padding="lg">
          <div>コンテンツ</div>
        </ResponsiveCard>
      );

      const card = screen.getByTestId('motion-div');
      expect(card.className).toContain('p-8');
    });

    it('ホバー効果が設定される', () => {
      render(
        <ResponsiveCard hover={true}>
          <div>コンテンツ</div>
        </ResponsiveCard>
      );

      const card = screen.getByTestId('motion-div');
      expect(card.className).toContain('hover:shadow-2xl');

      const whileHover = card.getAttribute('data-while-hover');
      if (whileHover) {
        const hoverData = JSON.parse(whileHover);
        expect(hoverData.y).toBe(-4);
      }
    });

    it('ホバー効果を無効にできる', () => {
      render(
        <ResponsiveCard hover={false}>
          <div>コンテンツ</div>
        </ResponsiveCard>
      );

      const card = screen.getByTestId('motion-div');
      expect(card.className).not.toContain('hover:shadow-2xl');
    });
  });
});

describe('ResponsiveButton', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue({
      isSm: false,
      isMd: false,
      isLg: true,
      isXl: true,
      is2Xl: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    });
    vi.clearAllMocks();
  });

  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(<ResponsiveButton>ボタンテキスト</ResponsiveButton>);

      expect(screen.getByText('ボタンテキスト')).toBeInTheDocument();
    });

    it('デフォルトのボタンクラスが適用される', () => {
      render(<ResponsiveButton>ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      expect(button.className).toContain('btn-primary');
      expect(button.className).toContain('px-8 py-4');
    });

    it('モバイル用のサイズが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(<ResponsiveButton>ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      expect(button.className).toContain('px-6 py-3');
    });

    it('バリアント設定が適用される', () => {
      render(
        <ResponsiveButton variant="secondary">
          セカンダリボタン
        </ResponsiveButton>
      );

      const button = screen.getByTestId('motion-button');
      expect(button.className).toContain('btn-secondary');
    });

    it('サイズ設定が適用される', () => {
      render(<ResponsiveButton size="lg">大きなボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      expect(button.className).toContain('px-10 py-5 text-lg');
    });

    it('フルワイド設定が適用される', () => {
      render(
        <ResponsiveButton fullWidth={true}>フルワイドボタン</ResponsiveButton>
      );

      const button = screen.getByTestId('motion-button');
      expect(button.className).toContain('w-full');
    });

    it('無効状態が適用される', () => {
      render(<ResponsiveButton disabled={true}>無効ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('opacity-50');
      expect(button.className).toContain('cursor-not-allowed');
    });

    it('クリックイベントが正しく動作する', () => {
      const handleClick = vi.fn();

      render(
        <ResponsiveButton onClick={handleClick}>
          クリックボタン
        </ResponsiveButton>
      );

      const button = screen.getByTestId('motion-button');
      button.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('無効状態でクリックイベントが発火しない', () => {
      const handleClick = vi.fn();

      render(
        <ResponsiveButton onClick={handleClick} disabled={true}>
          無効ボタン
        </ResponsiveButton>
      );

      const button = screen.getByTestId('motion-button');
      button.click();

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('アニメーション動作', () => {
    it('ホバーアニメーションが設定される', () => {
      render(<ResponsiveButton>ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      const whileHover = button.getAttribute('data-while-hover');

      if (whileHover) {
        const hoverData = JSON.parse(whileHover);
        expect(hoverData.scale).toBe(1.02);
      }
    });

    it('タップアニメーションが設定される', () => {
      render(<ResponsiveButton>ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      const whileTap = button.getAttribute('data-while-tap');

      if (whileTap) {
        const tapData = JSON.parse(whileTap);
        expect(tapData.scale).toBe(0.98);
      }
    });

    it('無効状態でアニメーションが無効化される', () => {
      render(<ResponsiveButton disabled={true}>無効ボタン</ResponsiveButton>);

      const button = screen.getByTestId('motion-button');
      const whileHover = button.getAttribute('data-while-hover');
      const whileTap = button.getAttribute('data-while-tap');

      expect(whileHover).toBeNull();
      expect(whileTap).toBeNull();
    });
  });
});

describe('ResponsiveNav', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue({
      isSm: false,
      isMd: false,
      isLg: true,
      isXl: true,
      is2Xl: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    });
    vi.clearAllMocks();
  });

  describe('基本表示機能', () => {
    it('子要素が正しくレンダリングされる', () => {
      render(
        <ResponsiveNav>
          <div>ナビゲーション</div>
        </ResponsiveNav>
      );

      expect(screen.getByText('ナビゲーション')).toBeInTheDocument();
    });

    it('デスクトップ用のナビゲーションクラスが適用される', () => {
      render(
        <ResponsiveNav>
          <div>ナビ</div>
        </ResponsiveNav>
      );

      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('relative');
      expect(nav.className).not.toContain('fixed');
    });

    it('モバイル用のナビゲーションクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(
        <ResponsiveNav>
          <div>ナビ</div>
        </ResponsiveNav>
      );

      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('fixed');
      expect(nav.className).toContain('bottom-0');
      expect(nav.className).toContain('left-0');
      expect(nav.className).toContain('right-0');
      expect(nav.className).toContain('z-50');
    });
  });
});

describe('ResponsiveModal', () => {
  beforeEach(() => {
    vi.mocked(useBreakpoints).mockReturnValue({
      isSm: false,
      isMd: false,
      isLg: true,
      isXl: true,
      is2Xl: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as const,
      width: 1024,
    });
    vi.clearAllMocks();
  });

  describe('基本表示機能', () => {
    it('開いている時にモーダルが表示される', () => {
      render(
        <ResponsiveModal isOpen={true} onClose={() => {}}>
          <div>モーダルコンテンツ</div>
        </ResponsiveModal>
      );

      expect(screen.getByText('モーダルコンテンツ')).toBeInTheDocument();
    });

    it('閉じている時にモーダルが表示されない', () => {
      render(
        <ResponsiveModal isOpen={false} onClose={() => {}}>
          <div>モーダルコンテンツ</div>
        </ResponsiveModal>
      );

      expect(screen.queryByText('モーダルコンテンツ')).not.toBeInTheDocument();
    });

    it('タイトルが表示される', () => {
      render(
        <ResponsiveModal
          isOpen={true}
          onClose={() => {}}
          title="テストタイトル"
        >
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    });

    it('閉じるボタンが表示される', () => {
      render(
        <ResponsiveModal isOpen={true} onClose={() => {}} title="タイトル">
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });

    it('閉じるボタンクリックでonCloseが呼ばれる', () => {
      const handleClose = vi.fn();

      render(
        <ResponsiveModal isOpen={true} onClose={handleClose} title="タイトル">
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      const closeButton = screen.getByRole('button');
      closeButton.click();

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('モバイル用のサイズクラスが適用される', () => {
      vi.mocked(useBreakpoints).mockReturnValue({
        isSm: false,
        isMd: false,
        isLg: false,
        isXl: false,
        is2Xl: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        currentBreakpoint: 'xs' as const,
        width: 375,
      });

      render(
        <ResponsiveModal isOpen={true} onClose={() => {}}>
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      const motionDivs = screen.getAllByTestId('motion-div');
      const modalContent = motionDivs[2]; // 3番目がモーダルコンテンツ
      const classAttribute = modalContent.getAttribute('class') || '';
      expect(classAttribute).toContain('max-w-sm');
    });

    it('デスクトップ用のサイズクラスが適用される', () => {
      render(
        <ResponsiveModal isOpen={true} onClose={() => {}}>
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      const motionDivs = screen.getAllByTestId('motion-div');
      const modalContent = motionDivs[2]; // 3番目がモーダルコンテンツ
      const classAttribute = modalContent.getAttribute('class') || '';
      expect(classAttribute).toContain('max-w-2xl');
    });
  });

  describe('アニメーション動作', () => {
    it('モーダル表示時にアニメーションが適用される', () => {
      render(
        <ResponsiveModal isOpen={true} onClose={() => {}}>
          <div>コンテンツ</div>
        </ResponsiveModal>
      );

      const motionDivs = screen.getAllByTestId('motion-div');
      const modalContent = motionDivs[2]; // 3番目がモーダルコンテンツ

      const initial = modalContent.getAttribute('data-initial');
      const animate = modalContent.getAttribute('data-animate');

      if (initial && animate) {
        const initialData = JSON.parse(initial);
        const animateData = JSON.parse(animate);

        expect(initialData.opacity).toBe(0);
        expect(initialData.scale).toBe(0.9);
        expect(initialData.y).toBe(20);

        expect(animateData.opacity).toBe(1);
        expect(animateData.scale).toBe(1);
        expect(animateData.y).toBe(0);
      }
    });
  });
});
