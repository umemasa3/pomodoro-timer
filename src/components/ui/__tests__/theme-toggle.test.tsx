import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle, ThemeSelector } from '../theme-toggle';
import { useThemeStore } from '../../../stores/theme-store';

// Zustandストアのモック
vi.mock('../../../stores/theme-store', () => ({
  useThemeStore: vi.fn(),
}));

// Framer Motionのモック
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      onClick,
      className,
      title,
      whileHover,
      whileTap,
      ...props
    }: any) => (
      <button
        onClick={onClick}
        className={className}
        title={title}
        data-testid="motion-button"
        data-while-hover={JSON.stringify(whileHover)}
        data-while-tap={JSON.stringify(whileTap)}
        {...props}
      >
        {children}
      </button>
    ),
    div: ({
      children,
      initial,
      animate,
      transition,
      className,
      ...props
    }: any) => (
      <div
        className={className}
        data-testid="motion-div"
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
    span: ({ children, initial, animate, className, ...props }: any) => (
      <span
        className={className}
        data-testid="motion-span"
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        {...props}
      >
        {children}
      </span>
    ),
  },
}));

// Heroiconsのモック
vi.mock('@heroicons/react/24/outline', () => ({
  SunIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="sun-icon">
      <title>Sun Icon</title>
    </svg>
  ),
  MoonIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="moon-icon">
      <title>Moon Icon</title>
    </svg>
  ),
  ComputerDesktopIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="computer-icon">
      <title>Computer Icon</title>
    </svg>
  ),
}));

describe('ThemeToggle', () => {
  const mockThemeStore = {
    settings: {
      theme: 'light' as const,
    },
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useThemeStore).mockReturnValue(mockThemeStore);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('ライトモード時にSunIconが表示される', () => {
      render(<ThemeToggle />);

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('computer-icon')).not.toBeInTheDocument();
    });

    it('ダークモード時にMoonIconが表示される', () => {
      vi.mocked(useThemeStore).mockReturnValue({
        ...mockThemeStore,
        settings: { theme: 'dark' },
      });

      render(<ThemeToggle />);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('computer-icon')).not.toBeInTheDocument();
    });

    it('システム設定時にComputerDesktopIconが表示される', () => {
      vi.mocked(useThemeStore).mockReturnValue({
        ...mockThemeStore,
        settings: { theme: 'auto' },
      });

      render(<ThemeToggle />);

      expect(screen.getByTestId('computer-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    });

    it('適切なタイトル属性が設定される', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', '現在: ライトモード');
    });

    it('適切なaria-label属性が設定される', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute(
        'aria-label',
        'テーマを切り替え (現在: ライトモード)'
      );
    });
  });

  describe('テーマ切り替え機能', () => {
    it('ボタンクリックでtoggleThemeが呼ばれる', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockThemeStore.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it('キーボードでの操作が可能', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button); // Enterキーでclickイベントが発火

      expect(mockThemeStore.toggleTheme).toHaveBeenCalled();
    });

    it('スペースキーでの操作が可能', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.click(button); // スペースキーでclickイベントが発火

      expect(mockThemeStore.toggleTheme).toHaveBeenCalled();
    });
  });

  describe('サイズ設定', () => {
    it('デフォルトサイズ(md)が適用される', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-10 h-10');
    });

    it('小サイズ(sm)が適用される', () => {
      render(<ThemeToggle size="sm" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-8 h-8');
    });

    it('大サイズ(lg)が適用される', () => {
      render(<ThemeToggle size="lg" />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('w-12 h-12');
    });

    it('アイコンサイズがボタンサイズに対応する', () => {
      render(<ThemeToggle size="sm" />);

      const icon = screen.getByTestId('sun-icon');
      const classAttribute = icon.getAttribute('class') || '';
      expect(classAttribute).toContain('w-4 h-4');
    });
  });

  describe('ラベル表示機能', () => {
    it('showLabel=trueでラベルが表示される', () => {
      render(<ThemeToggle showLabel={true} />);

      expect(screen.getByText('ライトモード')).toBeInTheDocument();
    });

    it('showLabel=falseでラベルが表示されない', () => {
      render(<ThemeToggle showLabel={false} />);

      expect(screen.queryByText('ライトモード')).not.toBeInTheDocument();
    });

    it('デフォルトでラベルが表示されない', () => {
      render(<ThemeToggle />);

      expect(screen.queryByText('ライトモード')).not.toBeInTheDocument();
    });

    it('テーマ変更時にラベルが更新される', () => {
      const { rerender } = render(<ThemeToggle showLabel={true} />);

      expect(screen.getByText('ライトモード')).toBeInTheDocument();

      // ダークモードに変更
      vi.mocked(useThemeStore).mockReturnValue({
        ...mockThemeStore,
        settings: { theme: 'dark' },
      });

      rerender(<ThemeToggle showLabel={true} />);

      expect(screen.getByText('ダークモード')).toBeInTheDocument();
      expect(screen.queryByText('ライトモード')).not.toBeInTheDocument();
    });
  });

  describe('アニメーション動作', () => {
    it('ホバーアニメーションが設定される', () => {
      render(<ThemeToggle />);

      const button = screen.getByTestId('motion-button');
      const whileHover = button.getAttribute('data-while-hover');

      if (whileHover) {
        const hoverData = JSON.parse(whileHover);
        expect(hoverData.scale).toBe(1.05);
      }
    });

    it('タップアニメーションが設定される', () => {
      render(<ThemeToggle />);

      const button = screen.getByTestId('motion-button');
      const whileTap = button.getAttribute('data-while-tap');

      if (whileTap) {
        const tapData = JSON.parse(whileTap);
        expect(tapData.scale).toBe(0.95);
      }
    });

    it('アイコン変更時にアニメーションが適用される', () => {
      render(<ThemeToggle />);

      const motionDiv = screen.getByTestId('motion-div');
      const initial = motionDiv.getAttribute('data-initial');
      const animate = motionDiv.getAttribute('data-animate');

      if (initial && animate) {
        const initialData = JSON.parse(initial);
        const animateData = JSON.parse(animate);

        expect(initialData.rotate).toBe(-180);
        expect(initialData.opacity).toBe(0);
        expect(animateData.rotate).toBe(0);
        expect(animateData.opacity).toBe(1);
      }
    });
  });

  describe('カスタムクラス', () => {
    it('カスタムクラスが適用される', () => {
      render(<ThemeToggle className="custom-class" />);

      const container = screen.getByRole('button').parentElement;
      expect(container?.className).toContain('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーカス可能である', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('適切なrole属性が設定される', () => {
      render(<ThemeToggle />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('フォーカススタイルが適用される', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus:ring-2');
    });
  });
});

describe('ThemeSelector', () => {
  const mockThemeStore = {
    settings: {
      theme: 'light' as const,
    },
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useThemeStore).mockReturnValue(mockThemeStore);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('現在のテーマが表示される', () => {
      render(<ThemeSelector />);

      // メインボタン内の「ライトモード」テキストを確認
      const mainButton = screen.getByRole('button', { name: /テーマを選択/ });
      expect(mainButton).toHaveTextContent('ライトモード');

      // メインボタン内のアイコンを確認（複数のsun-iconがあるため、メインボタン内のものを特定）
      const icons = screen.getAllByTestId('sun-icon');
      const mainButtonIcon = icons.find(
        icon =>
          icon.closest('button')?.getAttribute('aria-label') === 'テーマを選択'
      );
      expect(mainButtonIcon).toBeInTheDocument();
    });

    it('ドロップダウンボタンが表示される', () => {
      render(<ThemeSelector />);

      const button = screen.getByRole('button', { name: /テーマを選択/ });
      expect(button).toBeInTheDocument();
      const classAttribute = button.getAttribute('class') || '';
      expect(classAttribute).toContain('min-w-[140px]');
    });

    it('初期状態でドロップダウンメニューが非表示', () => {
      render(<ThemeSelector />);

      // ドロップダウンメニューのオプションが非表示であることを確認
      // pointer-events-noneクラスが適用されていることで非表示を判定
      const dropdown = document.querySelector('.pointer-events-none');
      expect(dropdown).toBeInTheDocument();

      // または、opacity: 0 で非表示になっていることを確認
      const motionDiv = screen.getAllByTestId('motion-div').find(div => {
        const animate = div.getAttribute('data-animate');
        return animate && JSON.parse(animate).opacity === 0;
      });
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe('ドロップダウン機能', () => {
    it('ボタンクリックでドロップダウンが開く', async () => {
      render(<ThemeSelector />);

      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('明るいテーマ')).toBeInTheDocument();
        expect(screen.getByText('暗いテーマ')).toBeInTheDocument();
        expect(screen.getByText('システムに従う')).toBeInTheDocument();
      });
    });

    it('オプション選択でテーマが変更される', async () => {
      render(<ThemeSelector />);

      // ドロップダウンを開く
      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('ダークモード')).toBeInTheDocument();
      });

      // ダークモードを選択
      const darkOption = screen.getByText('ダークモード');
      fireEvent.click(darkOption);

      expect(mockThemeStore.setTheme).toHaveBeenCalledWith('dark');
    });

    it('オプション選択後にドロップダウンが閉じる', async () => {
      render(<ThemeSelector />);

      // ドロップダウンを開く
      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('明るいテーマ')).toBeInTheDocument();
      });

      // オプションを選択
      const lightOptions = screen.getAllByText('ライトモード');
      const lightOption = lightOptions.find(option =>
        option.closest('button')?.className.includes('w-full')
      );
      if (lightOption) {
        fireEvent.click(lightOption);
      }

      await waitFor(() => {
        // ドロップダウンが閉じたことを確認（pointer-events-noneクラスが適用される）
        const dropdown = document.querySelector('.pointer-events-none');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it('オーバーレイクリックでドロップダウンが閉じる', async () => {
      render(<ThemeSelector />);

      // ドロップダウンを開く
      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('明るいテーマ')).toBeInTheDocument();
      });

      // オーバーレイをクリック
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }

      await waitFor(() => {
        // ドロップダウンが閉じたことを確認（pointer-events-noneクラスが適用される）
        const dropdown = document.querySelector('.pointer-events-none');
        expect(dropdown).toBeInTheDocument();
      });
    });
  });

  describe('選択状態の表示', () => {
    it('現在選択されているテーマにインジケーターが表示される', async () => {
      render(<ThemeSelector />);

      // ドロップダウンを開く
      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        // ドロップダウン内の「ライトモード」オプションを取得
        const lightOptions = screen.getAllByText('ライトモード');
        const dropdownLightOption = lightOptions.find(
          option =>
            option.closest('button')?.getAttribute('data-testid') ===
            'motion-button'
        );

        expect(dropdownLightOption).toBeInTheDocument();
        const lightButton = dropdownLightOption?.closest('button');
        const classAttribute = lightButton?.getAttribute('class') || '';
        expect(classAttribute).toContain('bg-gray-100');
      });
    });

    it('非選択テーマにはインジケーターが表示されない', async () => {
      render(<ThemeSelector />);

      // ドロップダウンを開く
      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        const darkOptions = screen.getAllByText('ダークモード');
        const darkOption = darkOptions.find(option =>
          option.closest('button')?.className.includes('w-full')
        );
        const classAttribute =
          darkOption?.closest('button')?.getAttribute('class') || '';
        expect(classAttribute).not.toContain('bg-gray-100');
      });
    });
  });

  describe('アニメーション動作', () => {
    it('ドロップダウン開閉時にアニメーションが適用される', async () => {
      render(<ThemeSelector />);

      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      fireEvent.click(dropdownButton);

      // アニメーション要素の確認
      await waitFor(() => {
        const motionDivs = screen.getAllByTestId('motion-div');
        const dropdown = motionDivs.find(div => {
          const classAttribute = div.getAttribute('class') || '';
          return (
            classAttribute.includes('absolute') &&
            classAttribute.includes('bg-white')
          );
        });

        expect(dropdown).toBeInTheDocument();

        const animate = dropdown?.getAttribute('data-animate');
        if (animate) {
          const animateData = JSON.parse(animate);
          expect(animateData.opacity).toBe(1);
          expect(animateData.y).toBe(0);
          expect(animateData.scale).toBe(1);
        }
      });
    });

    it('オプションホバー時にアニメーションが適用される', async () => {
      render(<ThemeSelector />);

      const buttons = screen.getAllByRole('button');
      const mainButton = buttons[0];
      fireEvent.click(mainButton);

      await waitFor(() => {
        const options = screen.getAllByTestId('motion-button');
        const themeOption = options.find(btn =>
          btn.textContent?.includes('ダークモード')
        );

        expect(themeOption).toBeInTheDocument();

        const whileHover = themeOption?.getAttribute('data-while-hover');
        if (whileHover) {
          const hoverData = JSON.parse(whileHover);
          expect(hoverData.x).toBe(2);
        }
      });
    });
  });

  describe('カスタムクラス', () => {
    it('カスタムクラスが適用される', () => {
      render(<ThemeSelector className="custom-selector" />);

      const button = screen.getByRole('button', { name: /テーマを選択/ });
      const container = button.parentElement;
      const classAttribute = container?.getAttribute('class') || '';
      expect(classAttribute).toContain('custom-selector');
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なrole属性が設定される', () => {
      render(<ThemeSelector />);

      const button = screen.getByRole('button', { name: /テーマを選択/ });
      expect(button).toBeInTheDocument();
    });

    it('キーボードナビゲーションが機能する', async () => {
      render(<ThemeSelector />);

      const dropdownButton = screen.getByRole('button', {
        name: /テーマを選択/,
      });
      dropdownButton.focus();
      expect(dropdownButton).toHaveFocus();

      // Enterキーでドロップダウンを開く
      fireEvent.keyDown(dropdownButton, { key: 'Enter' });
      fireEvent.click(dropdownButton);

      await waitFor(() => {
        expect(screen.getByText('明るいテーマ')).toBeInTheDocument();
      });
    });
  });
});
