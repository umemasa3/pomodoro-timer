import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { CSVExport } from '../csv-export';
import { DatabaseService } from '../../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    exportStatisticsToCSV: vi.fn(),
  },
}));

describe('CSVExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // DOM環境をクリーンアップ
    document.body.innerHTML = '';

    // テスト用のルート要素を作成
    const root = document.createElement('div');
    root.id = 'test-root';
    document.body.appendChild(root);
  });

  afterEach(() => {
    cleanup();
    // DOM環境をクリーンアップ
    document.body.innerHTML = '';
  });

  it('CSVエクスポートボタンを正しく表示する', () => {
    render(<CSVExport />);

    expect(screen.getByText('データエクスポート')).toBeInTheDocument();
    expect(screen.getByText('CSV形式でダウンロード')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /統計データをエクスポート/ })
    ).toBeInTheDocument();
  });

  it('CSVエクスポートボタンをクリックするとデータ取得が開始される', async () => {
    const mockCSVData = 'test,data\n1,2';
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /統計データをエクスポート/,
    });
    fireEvent.click(exportButton);

    // ローディング状態の確認
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();

    // データ取得の完了を待機
    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalledTimes(1);
    });
  });

  it('エクスポート中はボタンが無効化される', async () => {
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('test data'), 100))
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /統計データをエクスポート/,
    });
    fireEvent.click(exportButton);

    // ローディング中はボタンが無効化される
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();

    // エクスポート完了後はボタンが有効化される
    await waitFor(() => {
      expect(exportButton).not.toBeDisabled();
      expect(screen.getByText('統計データをエクスポート')).toBeInTheDocument();
    });
  });

  it('エクスポートエラー時に適切なエラーメッセージを表示する', async () => {
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockRejectedValue(
      new Error('エクスポートエラー')
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /統計データをエクスポート/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(
        screen.getByText('エクスポートに失敗しました。もう一度お試しください。')
      ).toBeInTheDocument();
    });

    // エラー後もボタンは有効化される
    expect(exportButton).not.toBeDisabled();
  });

  it('エクスポートの説明文が正しく表示される', () => {
    render(<CSVExport />);

    expect(screen.getByText('エクスポートされるデータ')).toBeInTheDocument();
    expect(screen.getByText('セッション履歴')).toBeInTheDocument();
    expect(screen.getByText('タスク履歴')).toBeInTheDocument();
    expect(screen.getByText('タグ別統計')).toBeInTheDocument();
    expect(screen.getByText('目標進捗')).toBeInTheDocument();
    expect(screen.getByText('比較分析')).toBeInTheDocument();
  });

  it('ダークモード対応が正しく適用される', () => {
    render(<CSVExport />);

    const container = screen
      .getByText('データエクスポート')
      .closest('.bg-white');
    expect(container).toHaveClass('bg-white', 'dark:bg-gray-800');

    const title = screen.getByText('データエクスポート');
    expect(title).toHaveClass('text-gray-900', 'dark:text-white');
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /統計データをエクスポート/,
    });
    expect(exportButton).toHaveAttribute('type', 'button');
  });
});
