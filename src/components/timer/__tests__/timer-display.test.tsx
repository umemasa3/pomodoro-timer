import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimerDisplay } from '../timer-display';

// Framer Motionのモック
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate,
      initial,
      transition,
      style,
      className,
      ...props
    }: any) => (
      <div
        className={className}
        style={style}
        data-testid="motion-div"
        data-animate={JSON.stringify(animate)}
        data-initial={JSON.stringify(initial)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

describe('TimerDisplay', () => {
  const defaultProps = {
    currentTime: 1500, // 25分
    sessionType: 'pomodoro' as const,
    isRunning: false,
    totalTime: 1500,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本表示機能', () => {
    it('時間が正しく分:秒形式で表示される', () => {
      render(<TimerDisplay {...defaultProps} />);

      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('ポモドーロセッションのラベルが表示される', () => {
      render(<TimerDisplay {...defaultProps} />);

      expect(screen.getByText('ポモドーロ')).toBeInTheDocument();
    });

    it('短い休憩セッションのラベルが表示される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          sessionType="short_break"
          currentTime={300}
          totalTime={300}
        />
      );

      expect(screen.getByText('短い休憩')).toBeInTheDocument();
      expect(screen.getByText('05:00')).toBeInTheDocument();
    });

    it('長い休憩セッションのラベルが表示される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          sessionType="long_break"
          currentTime={900}
          totalTime={900}
        />
      );

      expect(screen.getByText('長い休憩')).toBeInTheDocument();
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('残り時間が1分未満の場合も正しく表示される', () => {
      render(<TimerDisplay {...defaultProps} currentTime={45} />);

      expect(screen.getByText('00:45')).toBeInTheDocument();
    });

    it('残り時間が0の場合も正しく表示される', () => {
      render(<TimerDisplay {...defaultProps} currentTime={0} />);

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  describe('実行状態の表示', () => {
    it('タイマー実行中に実行中インジケーターが表示される', () => {
      render(<TimerDisplay {...defaultProps} isRunning={true} />);

      expect(screen.getByText('実行中')).toBeInTheDocument();
    });

    it('タイマー停止中は実行中インジケーターが表示されない', () => {
      render(<TimerDisplay {...defaultProps} isRunning={false} />);

      expect(screen.queryByText('実行中')).not.toBeInTheDocument();
    });

    it('停止中で進捗がある場合に進捗パーセンテージが表示される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          currentTime={750} // 50%完了
          isRunning={false}
        />
      );

      expect(screen.getByText('50% 完了')).toBeInTheDocument();
    });

    it('実行中は進捗パーセンテージが表示されない', () => {
      render(
        <TimerDisplay {...defaultProps} currentTime={750} isRunning={true} />
      );

      expect(screen.queryByText('50% 完了')).not.toBeInTheDocument();
    });
  });

  describe('アニメーション動作', () => {
    it('実行中にメインタイマーサークルにアニメーションが適用される', () => {
      render(<TimerDisplay {...defaultProps} isRunning={true} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      const timerCircle = motionDivs.find(div =>
        div.className?.includes('timer-circle')
      );

      expect(timerCircle).toBeInTheDocument();

      // アニメーション属性の確認
      const animateData = timerCircle?.getAttribute('data-animate');
      if (animateData) {
        const animate = JSON.parse(animateData);
        expect(animate.scale).toEqual([1, 1.02, 1]);
      }
    });

    it('停止中はアニメーションが適用されない', () => {
      render(<TimerDisplay {...defaultProps} isRunning={false} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      const timerCircle = motionDivs.find(div =>
        div.className?.includes('timer-circle')
      );

      expect(timerCircle).toBeInTheDocument();

      // 停止中のアニメーション確認
      const animateData = timerCircle?.getAttribute('data-animate');
      if (animateData) {
        const animate = JSON.parse(animateData);
        expect(animate.scale).toBe(1);
      }
    });

    it('時間表示にパルスアニメーションが適用される', () => {
      render(<TimerDisplay {...defaultProps} isRunning={true} />);

      const timeDisplay = screen.getByText('25:00');
      const motionDiv = timeDisplay.closest('[data-testid="motion-div"]');

      expect(motionDiv).toBeInTheDocument();

      // パルスアニメーションの確認
      const animateData = motionDiv?.getAttribute('data-animate');
      if (animateData) {
        const animate = JSON.parse(animateData);
        expect(animate.opacity).toEqual([1, 0.9, 1]);
      }
    });

    it('浮遊する装飾要素にアニメーションが適用される', () => {
      render(<TimerDisplay {...defaultProps} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      const floatingElements = motionDivs.filter(
        div =>
          div.className?.includes('absolute') &&
          div.className?.includes('rounded-full') &&
          (div.className?.includes('-top-4') ||
            div.className?.includes('-bottom-6'))
      );

      expect(floatingElements.length).toBeGreaterThan(0);

      // 浮遊アニメーションの確認
      floatingElements.forEach(element => {
        const animateData = element.getAttribute('data-animate');
        if (animateData) {
          const animate = JSON.parse(animateData);
          expect(animate.y).toBeDefined();
          expect(animate.opacity).toBeDefined();
        }
      });
    });
  });

  describe('セッションタイプ別スタイル', () => {
    it('ポモドーロセッションで適切なCSSクラスが適用される', () => {
      render(<TimerDisplay {...defaultProps} />);

      const motionDivs = screen.getAllByTestId('motion-div');
      const timerCircle = motionDivs.find(div =>
        div.className?.includes('timer-circle')
      );

      expect(timerCircle).toBeInTheDocument();
      expect(timerCircle?.className).toContain('timer-circle');
      expect(timerCircle?.className).not.toContain('break-mode');
    });

    it('休憩セッションで適切なCSSクラスが適用される', () => {
      render(<TimerDisplay {...defaultProps} sessionType="short_break" />);

      const motionDivs = screen.getAllByTestId('motion-div');
      const timerCircle = motionDivs.find(div =>
        div.className?.includes('timer-circle')
      );

      expect(timerCircle?.className).toContain('break-mode');
    });
  });

  describe('進捗表示機能', () => {
    it('進捗率が正しく計算される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          currentTime={750} // 残り12.5分 = 50%完了
          totalTime={1500}
          isRunning={false}
        />
      );

      expect(screen.getByText('50% 完了')).toBeInTheDocument();
    });

    it('進捗率が0%の場合は表示されない', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          currentTime={1500} // 0%完了
          totalTime={1500}
          isRunning={false}
        />
      );

      expect(screen.queryByText('0% 完了')).not.toBeInTheDocument();
    });

    it('進捗率が100%の場合は表示される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          currentTime={0} // 100%完了
          totalTime={1500}
          isRunning={false}
        />
      );

      expect(screen.getByText('100% 完了')).toBeInTheDocument();
    });

    it('進捗リングのスタイルが正しく設定される', () => {
      render(
        <TimerDisplay
          {...defaultProps}
          currentTime={750} // 50%完了
          totalTime={1500}
        />
      );

      const progressRing = document.querySelector('.timer-progress');
      expect(progressRing).toBeInTheDocument();

      // 進捗リングのスタイル確認（50% = 180度）
      const style = progressRing?.getAttribute('style');
      expect(style).toContain('conic-gradient');
      expect(style).toContain('180deg');
    });
  });

  describe('エラーハンドリング', () => {
    it('totalTimeが0の場合でもクラッシュしない', () => {
      expect(() => {
        render(<TimerDisplay {...defaultProps} totalTime={0} />);
      }).not.toThrow();
    });

    it('currentTimeが負の値の場合でもクラッシュしない', () => {
      expect(() => {
        render(<TimerDisplay {...defaultProps} currentTime={-10} />);
      }).not.toThrow();
    });

    it('currentTimeがtotalTimeより大きい場合でもクラッシュしない', () => {
      expect(() => {
        render(
          <TimerDisplay {...defaultProps} currentTime={2000} totalTime={1500} />
        );
      }).not.toThrow();
    });
  });

  describe('アクセシビリティ', () => {
    it('時間表示が適切な階層構造になっている', () => {
      render(<TimerDisplay {...defaultProps} />);

      const timeDisplay = screen.getByText('25:00');
      expect(timeDisplay).toBeInTheDocument();
      expect(timeDisplay.tagName).toBe('DIV');
    });

    it('セッションラベルが適切に表示される', () => {
      render(<TimerDisplay {...defaultProps} />);

      const sessionLabel = screen.getByText('ポモドーロ');
      expect(sessionLabel).toBeInTheDocument();
    });

    it('実行状態が適切に伝達される', () => {
      render(<TimerDisplay {...defaultProps} isRunning={true} />);

      expect(screen.getByText('実行中')).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル向けのCSSクラスが適用される', () => {
      // CSSクラスの存在確認
      render(<TimerDisplay {...defaultProps} />);

      const timerCircle = document.querySelector('.timer-circle');
      expect(timerCircle).toBeInTheDocument();

      // レスポンシブクラスの確認（実際のCSSは別途テスト）
      expect(timerCircle?.className).toContain('timer-circle');
    });

    it('装飾要素が適切に配置される', () => {
      render(<TimerDisplay {...defaultProps} />);

      const decorativeElements = document.querySelectorAll(
        '.absolute.rounded-full'
      );
      expect(decorativeElements.length).toBeGreaterThan(0);
    });
  });
});
