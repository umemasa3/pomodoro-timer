import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OnboardingTour } from '../onboarding-tour';

// Framer Motionのモック
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Heroiconsのモック
vi.mock('@heroicons/react/24/outline', () => ({
  XMarkIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="x-mark-icon" />
  ),
  ArrowRightIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="arrow-right-icon" />
  ),
  ArrowLeftIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="arrow-left-icon" />
  ),
  CheckIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="check-icon" />
  ),
  ClockIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="clock-icon" />
  ),
  ListBulletIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="list-bullet-icon" />
  ),
  ChartBarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chart-bar-icon" />
  ),
  PlayIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="play-icon" />
  ),
}));

describe('OnboardingTour', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpenがfalseの場合は何も表示しない', () => {
    render(
      <OnboardingTour
        isOpen={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByText('ポモドーロタイマーへようこそ！')).not.toBeInTheDocument();
  });

  it('isOpenがtrueの場合は最初のステップを表示する', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('ポモドーロタイマーへようこそ！')).toBeInTheDocument();
    expect(screen.getByText('生産性を向上させるためのシンプルで効果的なツールです。基本的な使い方をご案内します。')).toBeInTheDocument();
    expect(screen.getByText('ステップ 1 / 6')).toBeInTheDocument();
  });

  it('次へボタンをクリックすると次のステップに進む', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    expect(screen.getByText('タイマーの基本操作')).toBeInTheDocument();
    expect(screen.getByText('ステップ 2 / 6')).toBeInTheDocument();
  });

  it('戻るボタンをクリックすると前のステップに戻る', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // 次のステップに進む
    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    // 戻るボタンをクリック
    const backButton = screen.getByText('戻る');
    fireEvent.click(backButton);

    expect(screen.getByText('ポモドーロタイマーへようこそ！')).toBeInTheDocument();
    expect(screen.getByText('ステップ 1 / 6')).toBeInTheDocument();
  });

  it('最初のステップでは戻るボタンが無効化されている', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const backButton = screen.getByText('戻る');
    expect(backButton).toBeDisabled();
  });

  it('スキップボタンをクリックするとonCloseが呼ばれる', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const skipButton = screen.getByText('スキップ');
    fireEvent.click(skipButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const closeButton = screen.getByLabelText('オンボーディングツアーを終了');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('最後のステップで完了ボタンをクリックするとonCompleteとonCloseが呼ばれる', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // 最後のステップまで進む（6ステップあるので5回クリック）
    const nextButton = screen.getByText('次へ');
    for (let i = 0; i < 5; i++) {
      fireEvent.click(nextButton);
    }

    // 完了ボタンをクリック
    const completeButton = screen.getByText('完了');
    fireEvent.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('プログレスバーが正しく表示される', () => {
    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('17%')).toBeInTheDocument(); // 1/6 * 100 = 16.67% ≈ 17%
  });

  it('カスタムステップが正しく表示される', () => {
    const customSteps = [
      {
        id: 'custom-step',
        title: 'カスタムステップ',
        description: 'これはカスタムステップです',
        position: 'center' as const,
      },
    ];

    render(
      <OnboardingTour
        isOpen={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
        steps={customSteps}
      />
    );

    expect(screen.getByText('カスタムステップ')).toBeInTheDocument();
    expect(screen.getByText('これはカスタムステップです')).toBeInTheDocument();
    expect(screen.getByText('ステップ 1 / 1')).toBeInTheDocument();
  });
});