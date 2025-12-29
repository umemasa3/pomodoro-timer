import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useOnlineStatus } from '../use-online-status';

describe('useOnlineStatus', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // console.logのスパイ
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // イベントリスナーのモック
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleSpy.mockRestore();
  });

  it('初期状態でnavigator.onLineの値を返す', () => {
    // navigator.onLineをtrueに設定
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);
  });

  it('navigator.onLineがfalseの場合、初期状態でfalseを返す', () => {
    // navigator.onLineをfalseに設定
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it('onlineイベントでオンライン状態に更新される', () => {
    // navigator.onLineをfalseに設定
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // onlineイベントをシミュレート
    act(() => {
      const onlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'online'
      )?.[1];
      onlineHandler?.();
    });

    expect(result.current).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('ネットワーク接続が復旧しました');
  });

  it('offlineイベントでオフライン状態に更新される', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // offlineイベントをシミュレート
    act(() => {
      const offlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'offline'
      )?.[1];
      offlineHandler?.();
    });

    expect(result.current).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('ネットワーク接続が切断されました');
  });

  it('コンポーネントアンマウント時にイベントリスナーを削除する', () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    // イベントリスナーが追加されていることを確認
    expect(window.addEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );

    unmount();

    // イベントリスナーが削除されていることを確認
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });

  it('複数回のオンライン/オフライン切り替えが正しく動作する', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // オフラインに切り替え
    act(() => {
      const offlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'offline'
      )?.[1];
      offlineHandler?.();
    });

    expect(result.current).toBe(false);

    // オンラインに切り替え
    act(() => {
      const onlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'online'
      )?.[1];
      onlineHandler?.();
    });

    expect(result.current).toBe(true);

    // 再度オフラインに切り替え
    act(() => {
      const offlineHandler = (window.addEventListener as any).mock.calls.find(
        (call: any) => call[0] === 'offline'
      )?.[1];
      offlineHandler?.();
    });

    expect(result.current).toBe(false);
  });
});
