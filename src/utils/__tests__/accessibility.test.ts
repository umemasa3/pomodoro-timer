import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  announceToScreenReader,
  focusElement,
  trapFocus,
  getContrastRatio,
  isHighContrastMode,
  setHighContrastMode,
} from '../accessibility';

// アクセシビリティユーティリティのテスト
describe('Accessibility Utils', () => {
  beforeEach(() => {
    // DOMをクリーンアップ
    document.body.innerHTML = '';
    // ローカルストレージをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    document.body.innerHTML = '';
  });

  describe('announceToScreenReader', () => {
    it('スクリーンリーダー用のライブリージョンにメッセージを追加する', () => {
      announceToScreenReader('テストメッセージ');
      
      const liveRegion = document.getElementById('live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toBe('テストメッセージ');
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    });

    it('緊急メッセージの場合はassertiveに設定される', () => {
      announceToScreenReader('緊急メッセージ', 'assertive');
      
      const liveRegion = document.getElementById('live-region');
      expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
    });

    it('既存のライブリージョンがある場合は再利用する', () => {
      // 最初のメッセージ
      announceToScreenReader('メッセージ1');
      const firstRegion = document.getElementById('live-region');
      
      // 2番目のメッセージ
      announceToScreenReader('メッセージ2');
      const secondRegion = document.getElementById('live-region');
      
      // 同じ要素が再利用されることを確認
      expect(firstRegion).toBe(secondRegion);
      expect(secondRegion?.textContent).toBe('メッセージ2');
    });
  });

  describe('focusElement', () => {
    it('指定された要素にフォーカスを設定する', () => {
      const button = document.createElement('button');
      button.id = 'test-button';
      document.body.appendChild(button);
      
      const focusSpy = vi.spyOn(button, 'focus');
      
      focusElement('#test-button');
      
      expect(focusSpy).toHaveBeenCalled();
    });

    it('存在しない要素の場合はエラーをログに出力する', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      focusElement('#non-existent');
      
      expect(consoleSpy).toHaveBeenCalledWith('フォーカス対象の要素が見つかりません:', '#non-existent');
      
      consoleSpy.mockRestore();
    });

    it('遅延フォーカスが動作する', async () => {
      const button = document.createElement('button');
      button.id = 'delayed-button';
      document.body.appendChild(button);
      
      const focusSpy = vi.spyOn(button, 'focus');
      
      focusElement('#delayed-button', 100);
      
      // 遅延前はフォーカスされていない
      expect(focusSpy).not.toHaveBeenCalled();
      
      // 遅延後にフォーカスされる
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('trapFocus', () => {
    it('フォーカストラップが設定される', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="btn1">ボタン1</button>
        <button id="btn2">ボタン2</button>
        <input id="input1" type="text" />
      `;
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      
      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');
      
      // クリーンアップを実行
      cleanup();
    });

    it('フォーカス可能な要素が存在しない場合は何もしない', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>テキストのみ</p>';
      document.body.appendChild(container);
      
      const cleanup = trapFocus(container);
      
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('getContrastRatio', () => {
    it('白と黒のコントラスト比を正しく計算する', () => {
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 1); // 白と黒の理論値は21:1
    });

    it('同じ色のコントラスト比は1になる', () => {
      const ratio = getContrastRatio('#ff0000', '#ff0000');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('グレーのコントラスト比を計算する', () => {
      const ratio = getContrastRatio('#ffffff', '#808080');
      expect(ratio).toBeGreaterThan(1);
      expect(ratio).toBeLessThan(21);
    });

    it('無効な色コードの場合はデフォルト値を返す', () => {
      const ratio = getContrastRatio('invalid', '#000000');
      expect(ratio).toBe(1);
    });
  });

  describe('ハイコントラストモード', () => {
    it('ハイコントラストモードの初期状態はfalse', () => {
      expect(isHighContrastMode()).toBe(false);
    });

    it('ハイコントラストモードを有効にできる', () => {
      setHighContrastMode(true);
      expect(isHighContrastMode()).toBe(true);
      
      // ローカルストレージに保存されることを確認
      expect(localStorage.getItem('high-contrast-mode')).toBe('true');
      
      // body要素にクラスが追加されることを確認
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('ハイコントラストモードを無効にできる', () => {
      // 最初に有効にする
      setHighContrastMode(true);
      expect(isHighContrastMode()).toBe(true);
      
      // 無効にする
      setHighContrastMode(false);
      expect(isHighContrastMode()).toBe(false);
      
      // ローカルストレージから削除されることを確認
      expect(localStorage.getItem('high-contrast-mode')).toBe('false');
      
      // body要素からクラスが削除されることを確認
      expect(document.body.classList.contains('high-contrast')).toBe(false);
    });

    it('ローカルストレージの値を読み込む', () => {
      // ローカルストレージに値を設定
      localStorage.setItem('high-contrast-mode', 'true');
      
      // 関数を呼び出して状態を確認
      expect(isHighContrastMode()).toBe(true);
    });
  });

  describe('色のアクセシビリティ', () => {
    it('WCAG AA基準のコントラスト比をチェック', () => {
      // AA基準: 4.5:1以上
      const goodContrast = getContrastRatio('#ffffff', '#333333');
      expect(goodContrast).toBeGreaterThanOrEqual(4.5);
      
      const poorContrast = getContrastRatio('#ffffff', '#cccccc');
      expect(poorContrast).toBeLessThan(4.5);
    });

    it('WCAG AAA基準のコントラスト比をチェック', () => {
      // AAA基準: 7:1以上
      const excellentContrast = getContrastRatio('#ffffff', '#000000');
      expect(excellentContrast).toBeGreaterThanOrEqual(7);
    });
  });
});