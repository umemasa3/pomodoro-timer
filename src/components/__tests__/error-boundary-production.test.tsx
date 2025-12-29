import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductionErrorBoundary } from '../error-boundary-production';
import { ErrorMonitoringService } from '../../services/error-monitoring';

// ErrorMonitoringServiceをモック
vi.mock('../../services/error-monitoring', () => ({
  ErrorMonitoringService: {
    generateErrorReport: vi.fn(() => ({
      id: 'test-error-id',
      message: 'Test error',
      timestamp: new Date(),
      userAgent: 'test-agent',
      url: 'http://localhost',
    })),
    captureError: vi.fn(() => 'sentry-error-id'),
    addBreadcrumb: vi.fn(),
    classifyErrorSeverity: vi.fn(() => 'medium'),
  },
}));

// テスト用のエラーを投げるコンポーネント
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>正常なコンポーネント</div>;
};

describe('ProductionErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // コンソールエラーを抑制
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('エラーが発生しない場合は子コンポーネントを正常に表示する', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
  });

  it('エラーが発生した場合はエラーUIを表示する', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(
      screen.getByText('予期しないエラーが発生しました')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '申し訳ございません。アプリケーションでエラーが発生しました。'
      )
    ).toBeInTheDocument();
  });

  it('エラー発生時にErrorMonitoringServiceが呼び出される', () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(ErrorMonitoringService.generateErrorReport).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(String)
    );
    expect(ErrorMonitoringService.captureError).toHaveBeenCalled();
    expect(ErrorMonitoringService.addBreadcrumb).toHaveBeenCalledWith(
      'Error caught by boundary: Test error message',
      'error',
      'error'
    );
  });

  it('再試行ボタンをクリックするとエラー状態がリセットされる', () => {
    const { rerender } = render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    // エラーUIが表示されることを確認
    expect(
      screen.getByText('予期しないエラーが発生しました')
    ).toBeInTheDocument();

    // 再試行ボタンをクリック
    const retryButton = screen.getByText('再試行');
    fireEvent.click(retryButton);

    // エラー状態がリセットされ、子コンポーネントが再レンダリングされる
    rerender(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ProductionErrorBoundary>
    );

    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
  });

  it('アプリをリセットボタンをクリックするとページがリロードされる', () => {
    // window.location.reloadをモック
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    });

    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    const resetButton = screen.getByText('アプリをリセット');
    fireEvent.click(resetButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it('カスタムフォールバックが提供された場合はそれを使用する', () => {
    const customFallback = (error: Error) => (
      <div>カスタムエラー: {error.message}</div>
    );

    render(
      <ProductionErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(
      screen.getByText('カスタムエラー: Test error message')
    ).toBeInTheDocument();
  });

  it('開発環境ではエラー詳細が表示される', () => {
    // 開発環境をシミュレート
    vi.stubEnv('DEV', true);

    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    // エラー詳細セクションが存在することを確認
    expect(screen.getByText('エラー詳細')).toBeInTheDocument();
  });

  it('バグレポートフォームが正常に動作する', async () => {
    render(
      <ProductionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    // バグレポートボタンをクリック
    const bugReportButton = screen.getByText('バグを報告');
    fireEvent.click(bugReportButton);

    // フォームが展開されることを確認
    const textarea = screen.getByPlaceholderText(
      '何をしていた時にエラーが発生しましたか？詳細を教えてください。'
    );
    expect(textarea).toBeInTheDocument();

    // テキストを入力
    fireEvent.change(textarea, { target: { value: 'テストエラーの詳細' } });

    // 送信ボタンをクリック
    const submitButton = screen.getByText('送信');
    fireEvent.click(submitButton);

    // 送信中の状態を確認
    expect(screen.getByText('送信中...')).toBeInTheDocument();
  });

  it('onErrorコールバックが呼び出される', () => {
    const onErrorMock = vi.fn();

    render(
      <ProductionErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ProductionErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});
