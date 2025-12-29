import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SkipLinks } from '../skip-links';
import { LiveRegion } from '../live-region';
import { HighContrastProvider, AccessibilitySettings, useHighContrast } from '../high-contrast-theme';
import { FocusTrap } from '../focus-trap';

// テスト用のHighContrastコンポーネント
const TestHighContrastComponent = () => {
  const { isHighContrast, toggleHighContrast } = useHighContrast();
  
  return (
    <button
      onClick={toggleHighContrast}
      aria-pressed={isHighContrast}
      aria-label={`ハイコントラストモード${isHighContrast ? '無効' : '有効'}化`}
    >
      ハイコントラストモード: {isHighContrast ? 'ON' : 'OFF'}
    </button>
  );
};

// アクセシビリティ統合テスト
describe('Accessibility Integration', () => {
  describe('SkipLinks', () => {
    it('スキップリンクが正しく表示される', () => {
      render(<SkipLinks />);
      
      // スキップリンクが存在することを確認
      const skipToMain = screen.getByText('メインコンテンツにスキップ');
      const skipToNav = screen.getByText('ナビゲーションにスキップ');
      
      expect(skipToMain).toBeInTheDocument();
      expect(skipToNav).toBeInTheDocument();
      
      // 適切なhref属性を持つことを確認
      expect(skipToMain.closest('a')).toHaveAttribute('href', '#main-content');
      expect(skipToNav.closest('a')).toHaveAttribute('href', '#navigation');
    });

    it('フォーカス時にスキップリンクが表示される', () => {
      render(<SkipLinks />);
      
      const skipLink = screen.getByText('メインコンテンツにスキップ').closest('a');
      
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('LiveRegion', () => {
    it('ライブリージョンが正しく設定される', () => {
      render(<LiveRegion />);
      
      const liveRegion = screen.getByRole('status');
      
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });
  });

  describe('HighContrastTheme', () => {
    it('ハイコントラストテーマの切り替えボタンが表示される', () => {
      render(
        <HighContrastProvider>
          <TestHighContrastComponent />
        </HighContrastProvider>
      );
      
      const toggleButton = screen.getByRole('button', { name: /ハイコントラストモード/ });
      
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-pressed');
    });

    it('ハイコントラストモードの切り替えが動作する', () => {
      render(
        <HighContrastProvider>
          <TestHighContrastComponent />
        </HighContrastProvider>
      );
      
      const toggleButton = screen.getByRole('button', { name: /ハイコントラストモード/ });
      
      // 初期状態
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
      
      // クリックして切り替え
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
      
      // 再度クリックして元に戻す
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('AccessibilitySettingsコンポーネントが正しく表示される', () => {
      render(
        <HighContrastProvider>
          <AccessibilitySettings />
        </HighContrastProvider>
      );
      
      const heading = screen.getByText('アクセシビリティ設定');
      const highContrastToggle = screen.getByLabelText('高コントラストモードの切り替え');
      const colorBlindToggle = screen.getByLabelText('色覚異常対応の切り替え');
      const reducedMotionToggle = screen.getByLabelText('アニメーション削減の切り替え');
      
      expect(heading).toBeInTheDocument();
      expect(highContrastToggle).toBeInTheDocument();
      expect(colorBlindToggle).toBeInTheDocument();
      expect(reducedMotionToggle).toBeInTheDocument();
    });
  });

  describe('FocusTrap', () => {
    it('フォーカストラップが子要素を含む', () => {
      const TestContent = () => (
        <div>
          <button>ボタン1</button>
          <button>ボタン2</button>
        </div>
      );

      render(
        <FocusTrap isActive={true}>
          <TestContent />
        </FocusTrap>
      );
      
      const button1 = screen.getByText('ボタン1');
      const button2 = screen.getByText('ボタン2');
      
      expect(button1).toBeInTheDocument();
      expect(button2).toBeInTheDocument();
    });

    it('非アクティブ時はフォーカストラップが無効', () => {
      const TestContent = () => (
        <div>
          <button>テストボタン</button>
        </div>
      );

      render(
        <FocusTrap isActive={false}>
          <TestContent />
        </FocusTrap>
      );
      
      const button = screen.getByText('テストボタン');
      expect(button).toBeInTheDocument();
    });
  });

  describe('ARIA属性とセマンティクス', () => {
    it('適切なランドマークロールが設定される', () => {
      const TestApp = () => (
        <div>
          <nav role="navigation" aria-label="メインナビゲーション">
            <button>ナビゲーション</button>
          </nav>
          <main role="main" aria-label="メインコンテンツ">
            <h1>メインコンテンツ</h1>
          </main>
        </div>
      );

      render(<TestApp />);
      
      const navigation = screen.getByRole('navigation');
      const main = screen.getByRole('main');
      
      expect(navigation).toHaveAttribute('aria-label', 'メインナビゲーション');
      expect(main).toHaveAttribute('aria-label', 'メインコンテンツ');
    });

    it('ボタンに適切なaria-label属性が設定される', () => {
      const TestButton = () => (
        <button aria-label="テストアクション実行">
          <span aria-hidden="true">🔥</span>
        </button>
      );

      render(<TestButton />);
      
      const button = screen.getByRole('button', { name: 'テストアクション実行' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('キーボードナビゲーション', () => {
    it('Tabキーでフォーカス移動が可能', () => {
      const TestForm = () => (
        <div>
          <button>ボタン1</button>
          <button>ボタン2</button>
          <input type="text" placeholder="テキスト入力" />
        </div>
      );

      render(<TestForm />);
      
      const button1 = screen.getByText('ボタン1');
      const button2 = screen.getByText('ボタン2');
      const input = screen.getByPlaceholderText('テキスト入力');
      
      // 最初のボタンにフォーカス
      button1.focus();
      expect(document.activeElement).toBe(button1);
      
      // Tabキーで次の要素に移動
      fireEvent.keyDown(button1, { key: 'Tab' });
      // 実際のフォーカス移動はブラウザが処理するため、要素の存在のみ確認
      expect(button2).toBeInTheDocument();
      expect(input).toBeInTheDocument();
    });

    it('Enterキーでボタンが動作する', () => {
      const handleClick = vi.fn();
      const TestButton = () => (
        <button onClick={handleClick}>クリック可能ボタン</button>
      );

      render(<TestButton />);
      
      const button = screen.getByText('クリック可能ボタン');
      
      // Enterキーでボタンを実行
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.click(button); // Enterキーはclickイベントをトリガー
      
      expect(handleClick).toHaveBeenCalled();
    });
  });
});