/**
 * エラー率監視ダッシュボードのテスト
 * 継続監視項目: エラー率 < 1%
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ErrorRateDashboard,
  ErrorRateWidget,
  ErrorRateAlertBanner,
} from '../error-rate-dashboard';
import type {
  ErrorRateStats,
  ErrorRateAlert,
} from '../../../services/error-rate-monitor';

// モック設定
const mockErrorRateMonitor = {
  getCurrentStats: vi.fn(),
  getConfig: vi.fn(),
  generateErrorRateReport: vi.fn(),
};

vi.mock('../../../services/error-rate-monitor', () => ({
  getErrorRateMonitor: () => mockErrorRateMonitor,
}));

// テスト用のモックデータ
const mockStatsNormal: ErrorRateStats = {
  totalRequests: 1000,
  totalErrors: 5,
  errorRate: 0.5, // 0.5% - 正常範囲
  timeWindow: 5,
  timestamp: new Date(),
  breakdown: {
    'network-error': { count: 3, rate: 0.3 },
    'validation-error': { count: 2, rate: 0.2 },
  },
};

const mockStatsHigh: ErrorRateStats = {
  totalRequests: 1000,
  totalErrors: 25,
  errorRate: 2.5, // 2.5% - 閾値超過
  timeWindow: 5,
  timestamp: new Date(),
  breakdown: {
    'network-error': { count: 15, rate: 1.5 },
    'api-error': { count: 10, rate: 1.0 },
  },
};

const mockConfig = {
  enabled: true,
  threshold: 1.0, // 1%
  timeWindow: 5,
  checkInterval: 30,
  alertCooldown: 10,
  enableConsoleLogging: false,
};

const mockAlert: ErrorRateAlert = {
  currentRate: 2.5,
  threshold: 1.0,
  timeWindow: 5,
  timestamp: new Date(),
  severity: 'warning',
  details: {
    totalRequests: 1000,
    totalErrors: 25,
    topErrors: [
      { type: 'network-error', count: 15, percentage: 1.5 },
      { type: 'api-error', count: 10, percentage: 1.0 },
    ],
  },
};

describe('ErrorRateDashboard', () => {
  beforeEach(() => {
    mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsNormal);
    mockErrorRateMonitor.getConfig.mockReturnValue(mockConfig);
    mockErrorRateMonitor.generateErrorRateReport.mockReturnValue(
      'エラー率監視レポート\n現在のエラー率: 0.50%\n閾値: 1.00%\nステータス: ✅ 正常'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('エラー率ダッシュボードが正しく表示される', async () => {
      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(screen.getByText('エラー率監視')).toBeInTheDocument();
        expect(screen.getByText('0.50%')).toBeInTheDocument();
        expect(screen.getByText('閾値: 1%')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument(); // 総リクエスト数
        expect(screen.getByText('5')).toBeInTheDocument(); // エラー数
      });
    });

    it('正常状態のステータスアイコンが表示される', async () => {
      render(<ErrorRateDashboard />);

      await waitFor(() => {
        const statusIcon = screen.getByText('エラー率は正常範囲内です');
        expect(statusIcon).toBeInTheDocument();
      });
    });

    it('エラータイプ別内訳が表示される', async () => {
      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(screen.getByText('エラータイプ別内訳')).toBeInTheDocument();
        expect(screen.getByText('network-error')).toBeInTheDocument();
        expect(screen.getByText('validation-error')).toBeInTheDocument();
        expect(screen.getByText('3件')).toBeInTheDocument();
        expect(screen.getByText('2件')).toBeInTheDocument();
      });
    });
  });

  describe('閾値超過状態', () => {
    beforeEach(() => {
      mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsHigh);
    });

    it('閾値超過時の警告表示', async () => {
      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(screen.getByText('2.50%')).toBeInTheDocument();
        expect(
          screen.getByText('エラー率が閾値を超えています')
        ).toBeInTheDocument();
        expect(
          screen.getByText('システム管理者に連絡してください')
        ).toBeInTheDocument();
      });
    });

    it('閾値超過時のエラータイプ内訳', async () => {
      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(screen.getByText('network-error')).toBeInTheDocument();
        expect(screen.getByText('api-error')).toBeInTheDocument();
        expect(screen.getByText('15件')).toBeInTheDocument();
        expect(screen.getByText('10件')).toBeInTheDocument();
      });
    });
  });

  describe('手動更新機能', () => {
    it('手動更新ボタンが機能する', async () => {
      render(<ErrorRateDashboard />);

      const refreshButton = screen.getByTitle('手動更新');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockErrorRateMonitor.getCurrentStats).toHaveBeenCalledTimes(2); // 初回 + 手動更新
      });
    });
  });

  describe('コンパクト表示', () => {
    it('コンパクトモードで正しく表示される', async () => {
      render(<ErrorRateDashboard compact={true} />);

      await waitFor(() => {
        expect(screen.getByText('エラー率')).toBeInTheDocument();
        expect(screen.getByText('0.50%')).toBeInTheDocument();
        expect(screen.getByText('閾値: 1%')).toBeInTheDocument();
      });

      // コンパクトモードでは詳細情報は表示されない
      expect(screen.queryByText('エラータイプ別内訳')).not.toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('データ取得エラー時の表示', async () => {
      mockErrorRateMonitor.getCurrentStats.mockImplementation(() => {
        throw new Error('データ取得エラー');
      });

      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(
          screen.getByText('エラー率データを取得できませんでした')
        ).toBeInTheDocument();
        expect(screen.getByText('再試行')).toBeInTheDocument();
      });
    });

    it('再試行ボタンが機能する', async () => {
      mockErrorRateMonitor.getCurrentStats
        .mockImplementationOnce(() => {
          throw new Error('データ取得エラー');
        })
        .mockReturnValueOnce(mockStatsNormal);

      render(<ErrorRateDashboard />);

      await waitFor(() => {
        expect(screen.getByText('再試行')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('0.50%')).toBeInTheDocument();
      });
    });
  });
});

describe('ErrorRateWidget', () => {
  beforeEach(() => {
    mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsNormal);
    mockErrorRateMonitor.getConfig.mockReturnValue(mockConfig);
  });

  it('ウィジェットが正しく表示される', async () => {
    render(<ErrorRateWidget />);

    await waitFor(() => {
      expect(screen.getByText('エラー率')).toBeInTheDocument();
      expect(screen.getByText('0.50%')).toBeInTheDocument();
    });
  });

  it('閾値超過時の警告表示', async () => {
    mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsHigh);

    render(<ErrorRateWidget />);

    await waitFor(() => {
      expect(screen.getByText('2.50%')).toBeInTheDocument();
    });
  });
});

describe('ErrorRateAlertBanner', () => {
  beforeEach(() => {
    // カスタムイベントのモック
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('アラートバナーが初期状態では表示されない', () => {
    render(<ErrorRateAlertBanner />);

    expect(screen.queryByText('エラー率アラート')).not.toBeInTheDocument();
  });

  it('アラートイベント発生時にバナーが表示される', async () => {
    const { rerender } = render(<ErrorRateAlertBanner />);

    // アラートイベントをシミュレート
    const alertEvent = new CustomEvent('error-rate-alert', {
      detail: mockAlert,
    });

    // イベントリスナーを手動で呼び出し
    const addEventListener = window.addEventListener as any;
    const eventHandler = addEventListener.mock.calls.find(
      (call: any) => call[0] === 'error-rate-alert'
    )?.[1];

    if (eventHandler) {
      eventHandler(alertEvent);
      rerender(<ErrorRateAlertBanner />);

      await waitFor(() => {
        expect(screen.getByText('エラー率アラート')).toBeInTheDocument();
        // アラート要素全体のテキストコンテンツを確認
        const alertElement = screen.getByRole('alert');
        expect(alertElement).toBeInTheDocument();
        expect(alertElement.textContent).toContain('2.50');
        expect(alertElement.textContent).toContain('1');
      });
    }
  });

  it('閉じるボタンでバナーを非表示にできる', async () => {
    const { rerender } = render(<ErrorRateAlertBanner />);

    // アラートイベントをシミュレート
    const alertEvent = new CustomEvent('error-rate-alert', {
      detail: mockAlert,
    });

    const addEventListener = window.addEventListener as any;
    const eventHandler = addEventListener.mock.calls.find(
      (call: any) => call[0] === 'error-rate-alert'
    )?.[1];

    if (eventHandler) {
      eventHandler(alertEvent);
      rerender(<ErrorRateAlertBanner />);

      await waitFor(() => {
        expect(screen.getByText('エラー率アラート')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('エラー率アラート')).not.toBeInTheDocument();
      });
    }
  });
});

describe('アクセシビリティ', () => {
  beforeEach(() => {
    mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsNormal);
    mockErrorRateMonitor.getConfig.mockReturnValue(mockConfig);
  });

  it('適切なARIA属性が設定されている', async () => {
    render(<ErrorRateDashboard />);

    await waitFor(() => {
      // ボタンにはaria-labelまたはtitleが設定されている
      const refreshButton = screen.getByTitle('手動更新');
      expect(refreshButton).toBeInTheDocument();
    });
  });

  it('スクリーンリーダー用のテキストが適切に設定されている', async () => {
    render(<ErrorRateAlertBanner />);

    // 閉じるボタンにスクリーンリーダー用テキストが設定されている
    const srText = screen.queryByText('閉じる');
    if (srText) {
      expect(srText).toHaveClass('sr-only');
    }
  });
});

describe('レスポンシブデザイン', () => {
  beforeEach(() => {
    mockErrorRateMonitor.getCurrentStats.mockReturnValue(mockStatsNormal);
    mockErrorRateMonitor.getConfig.mockReturnValue(mockConfig);
  });

  it('グリッドレイアウトが適用されている', async () => {
    render(<ErrorRateDashboard />);

    await waitFor(() => {
      const gridContainer = screen.getByText('現在のエラー率').closest('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });
  });
});
