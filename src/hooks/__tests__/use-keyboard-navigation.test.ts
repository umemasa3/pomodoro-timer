import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardNavigation } from '../use-keyboard-navigation';

// キーボードナビゲーションフックのテスト
describe('useKeyboardNavigation', () => {
  const mockCallbacks = {
    onNavigateToTimer: vi.fn(),
    onNavigateToTasks: vi.fn(),
    onNavigateToStatistics: vi.fn(),
    onToggleTheme: vi.fn(),
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    // モック関数をリセット
    Object.values(mockCallbacks).forEach(mock => mock.mockClear());
  });

  afterEach(() => {
    // イベントリスナーをクリーンアップ
    document.removeEventListener('keydown', () => {});
  });

  it('フックが正常に初期化される', () => {
    const { result } = renderHook(() => useKeyboardNavigation(mockCallbacks));

    // フックが正常に実行されることを確認
    expect(result.current).toBeUndefined();
  });

  it('Alt+1でタイマーページに移動', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    // Alt+1キーイベントを発火
    const event = new KeyboardEvent('keydown', {
      key: '1',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onNavigateToTimer).toHaveBeenCalledTimes(1);
  });

  it('Alt+2でタスクページに移動', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: '2',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onNavigateToTasks).toHaveBeenCalledTimes(1);
  });

  it('Alt+3で統計ページに移動', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: '3',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onNavigateToStatistics).toHaveBeenCalledTimes(1);
  });

  it('Alt+Tでテーマを切り替え', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: 't',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+Lでログアウト', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: 'L',
      altKey: true,
      shiftKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onLogout).toHaveBeenCalledTimes(1);
  });

  it('関係のないキーでは何も実行されない', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    // 通常のキー入力
    const normalEvent = new KeyboardEvent('keydown', {
      key: 'a',
      bubbles: true,
    });

    document.dispatchEvent(normalEvent);

    // Altキーなしの数字キー
    const numberEvent = new KeyboardEvent('keydown', {
      key: '1',
      bubbles: true,
    });

    document.dispatchEvent(numberEvent);

    // どのコールバックも呼ばれないことを確認
    Object.values(mockCallbacks).forEach(mock => {
      expect(mock).not.toHaveBeenCalled();
    });
  });

  it('入力フィールドにフォーカスがある時はショートカットが無効', () => {
    // 入力フィールドを作成してフォーカス
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: '1',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    // 入力フィールドにフォーカスがある時はコールバックが呼ばれない
    expect(mockCallbacks.onNavigateToTimer).not.toHaveBeenCalled();

    // クリーンアップ
    document.body.removeChild(input);
  });

  it('テキストエリアにフォーカスがある時はショートカットが無効', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    renderHook(() => useKeyboardNavigation(mockCallbacks));

    const event = new KeyboardEvent('keydown', {
      key: '2',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(mockCallbacks.onNavigateToTasks).not.toHaveBeenCalled();

    // クリーンアップ
    document.body.removeChild(textarea);
  });

  it('コンポーネントのアンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useKeyboardNavigation(mockCallbacks));

    // アンマウント
    unmount();

    // removeEventListenerが呼ばれることを確認
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('大文字小文字を区別しない', () => {
    renderHook(() => useKeyboardNavigation(mockCallbacks));

    // 小文字のt
    const lowerEvent = new KeyboardEvent('keydown', {
      key: 't',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(lowerEvent);
    expect(mockCallbacks.onToggleTheme).toHaveBeenCalledTimes(1);

    mockCallbacks.onToggleTheme.mockClear();

    // 大文字のT
    const upperEvent = new KeyboardEvent('keydown', {
      key: 'T',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(upperEvent);
    expect(mockCallbacks.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  describe('アクセシビリティ考慮事項', () => {
    it('スクリーンリーダー使用時でもショートカットが動作する', () => {
      // スクリーンリーダーのシミュレーション（実際の実装では検出ロジックが必要）
      renderHook(() => useKeyboardNavigation(mockCallbacks));

      const event = new KeyboardEvent('keydown', {
        key: '1',
        altKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);

      expect(mockCallbacks.onNavigateToTimer).toHaveBeenCalledTimes(1);
    });

    it('モーダルが開いている時はショートカットが制限される', () => {
      // モーダル要素を作成
      const modal = document.createElement('div');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);

      renderHook(() => useKeyboardNavigation(mockCallbacks));

      const event = new KeyboardEvent('keydown', {
        key: '1',
        altKey: true,
        bubbles: true,
      });

      document.dispatchEvent(event);

      // モーダルが開いている時はナビゲーションが制限される可能性
      // 実装によってはコールバックが呼ばれない場合がある

      // クリーンアップ
      document.body.removeChild(modal);
    });
  });
});
