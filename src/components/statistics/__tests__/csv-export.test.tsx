import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CSVExport } from '../csv-export';
import { DatabaseService } from '../../../services/database-service';

// DatabaseServiceのモック
vi.mock('../../../services/database-service', () => ({
  DatabaseService: {
    exportStatisticsToCSV: vi.fn(),
  },
}));

// URL.createObjectURL と URL.revokeObjectURL のモック
const mockCreateObjectURL = vi.fn(() => 'mock-blob-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: mockRevokeObjectURL,
});

// document.createElement のモック
const mockClick = vi.fn();
const mockSetAttribute = vi.fn();
const originalCreateElement = document.createElement;

describe('CSVExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // document.createElement のモック設定
    document.createElement = vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return {
          setAttribute: mockSetAttribute,
          click: mockClick,
          style: {},
          download: '',
          href: '',
        };
      }
      return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
  });

  it('CSVエクスポートボタンを正しく表示する', () => {
    render(<CSVExport />);

    expect(screen.getByText('CSVエクスポート')).toBeInTheDocument();
    expect(
      screen.getByText('統計データをCSV形式でダウンロード')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /CSVダウンロード/ })
    ).toBeInTheDocument();
  });

  it('CSVエクスポートボタンをクリックするとダウンロードが開始される', async () => {
    const mockCSVData = `=== セッション履歴 ===
日付,タイプ,計画時間(分),実際時間(分),完了状況,タスクID
2024-12-28,pomodoro,25,25,完了,task-1

=== タスク履歴 ===
タスク名,優先度,状態,見積もりポモドーロ,完了ポモドーロ,作成日,完了日
Test Task,high,completed,1,1,2024-12-28,2024-12-28`;

    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    // ローディング状態の確認
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();

    // データ取得の完了を待機
    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalledTimes(1);
    });

    // Blob作成の確認
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));

    // ダウンロードリンクの作成と実行の確認
    expect(mockSetAttribute).toHaveBeenCalledWith('href', 'mock-blob-url');
    expect(mockSetAttribute).toHaveBeenCalledWith(
      'download',
      expect.stringMatching(/pomodoro-statistics-\d{4}-\d{2}-\d{2}\.csv/)
    );
    expect(mockClick).toHaveBeenCalledTimes(1);

    // URL.revokeObjectURL の呼び出し確認
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
  });

  it('エクスポート中はボタンが無効化される', async () => {
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('test data'), 100))
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    // ローディング中はボタンが無効化される
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('エクスポート中...')).toBeInTheDocument();

    // エクスポート完了後はボタンが有効化される
    await waitFor(() => {
      expect(exportButton).not.toBeDisabled();
      expect(screen.getByText('CSVダウンロード')).toBeInTheDocument();
    });
  });

  it('エクスポートエラー時に適切なエラーメッセージを表示する', async () => {
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockRejectedValue(
      new Error('エクスポートエラー')
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(
        screen.getByText('CSVエクスポートに失敗しました')
      ).toBeInTheDocument();
    });

    // エラー後もボタンは有効化される
    expect(exportButton).not.toBeDisabled();
  });

  it('CSVファイル名に現在の日付が含まれる', async () => {
    const mockCSVData = 'test,data\n1,2';
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalled();
    });

    // ファイル名に日付が含まれることを確認
    const today = new Date().toISOString().split('T')[0];
    expect(mockSetAttribute).toHaveBeenCalledWith(
      'download',
      `pomodoro-statistics-${today}.csv`
    );
  });

  it('BlobにUTF-8 BOMが含まれる', async () => {
    const mockCSVData = 'テスト,データ\n1,2';
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalled();
    });

    // Blobが正しいオプションで作成されることを確認
    expect(mockCreateObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text/csv;charset=utf-8;',
      })
    );
  });

  it('エクスポート成功時に成功メッセージを表示する', async () => {
    const mockCSVData = 'test,data\n1,2';
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(
        screen.getByText('CSVファイルのダウンロードが完了しました')
      ).toBeInTheDocument();
    });
  });

  it('複数回のエクスポートが正しく動作する', async () => {
    const mockCSVData = 'test,data\n1,2';
    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      mockCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });

    // 1回目のエクスポート
    fireEvent.click(exportButton);
    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalledTimes(1);
    });

    // 2回目のエクスポート
    fireEvent.click(exportButton);
    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalledTimes(2);
    });

    // 両方とも正常に実行される
    expect(mockClick).toHaveBeenCalledTimes(2);
  });

  it('エクスポートの説明文が正しく表示される', () => {
    render(<CSVExport />);

    expect(screen.getByText('📊 エクスポート内容')).toBeInTheDocument();
    expect(screen.getByText('• セッション履歴')).toBeInTheDocument();
    expect(screen.getByText('• タスク履歴')).toBeInTheDocument();
    expect(screen.getByText('• タグ別統計')).toBeInTheDocument();
    expect(screen.getByText('• 目標進捗データ')).toBeInTheDocument();
    expect(screen.getByText('• 週間・月間比較データ')).toBeInTheDocument();
  });

  it('ダークモード対応が正しく適用される', () => {
    render(<CSVExport />);

    const container = screen.getByText('CSVエクスポート').closest('div');
    expect(container).toHaveClass('bg-white', 'dark:bg-gray-800');

    const title = screen.getByText('CSVエクスポート');
    expect(title).toHaveClass('text-gray-900', 'dark:text-white');
  });

  it('アクセシビリティ属性が正しく設定される', () => {
    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    expect(exportButton).toHaveAttribute('type', 'button');
  });

  it('空のデータでもエクスポートが実行される', async () => {
    const emptyCSVData = `=== セッション履歴 ===
日付,タイプ,計画時間(分),実際時間(分),完了状況,タスクID

=== タスク履歴 ===
タスク名,優先度,状態,見積もりポモドーロ,完了ポモドーロ,作成日,完了日`;

    vi.mocked(DatabaseService.exportStatisticsToCSV).mockResolvedValue(
      emptyCSVData
    );

    render(<CSVExport />);

    const exportButton = screen.getByRole('button', {
      name: /CSVダウンロード/,
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(DatabaseService.exportStatisticsToCSV).toHaveBeenCalled();
    });

    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('CSVファイルのダウンロードが完了しました')
    ).toBeInTheDocument();
  });
});
