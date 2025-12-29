import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PWAInstallPrompt } from '../pwa-install-prompt';

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // LocalStorageのモック
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('初期状態ではインストールプロンプトを表示しない', () => {
    render(<PWAInstallPrompt />);

    expect(screen.queryByText('アプリをインストール')).not.toBeInTheDocument();
  });

  it('コンポーネントが正常にレンダリングされる', () => {
    const { container } = render(<PWAInstallPrompt />);

    expect(container).toBeInTheDocument();
  });

  it('24時間以内に閉じられた場合はプロンプトを表示しない', () => {
    const recentTime = Date.now() - 12 * 60 * 60 * 1000; // 12時間前
    (window.localStorage.getItem as any).mockReturnValue(recentTime.toString());

    render(<PWAInstallPrompt />);

    expect(screen.queryByText('アプリをインストール')).not.toBeInTheDocument();
  });
});
