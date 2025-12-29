import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  ListBulletIcon,
  ChartBarIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    type: 'click' | 'navigate' | 'highlight';
    target?: string;
    callback?: () => void;
  };
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  steps?: OnboardingStep[];
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'ポモドーロタイマーへようこそ！',
    description:
      '生産性を向上させるためのシンプルで効果的なツールです。基本的な使い方をご案内します。',
    position: 'center',
    icon: ClockIcon,
  },
  {
    id: 'timer-basics',
    title: 'タイマーの基本操作',
    description:
      'プレイボタンでタイマーを開始、ポーズボタンで一時停止、ストップボタンでリセットできます。',
    target: '[data-testid="timer-controls"]',
    position: 'bottom',
    icon: PlayIcon,
  },
  {
    id: 'task-management',
    title: 'タスク管理機能',
    description:
      'タスクを作成して、ポモドーロセッションと関連付けることで、作業の進捗を追跡できます。',
    target: '[data-testid="nav-tasks"]',
    position: 'bottom',
    icon: ListBulletIcon,
    action: {
      type: 'highlight',
      target: '[data-testid="nav-tasks"]',
    },
  },
  {
    id: 'statistics',
    title: '統計・分析機能',
    description:
      '作業時間や完了したタスクの統計を確認して、生産性の向上を図ることができます。',
    target: '[data-testid="nav-statistics"]',
    position: 'bottom',
    icon: ChartBarIcon,
    action: {
      type: 'highlight',
      target: '[data-testid="nav-statistics"]',
    },
  },
  {
    id: 'pomodoro-technique',
    title: 'ポモドーロテクニックとは',
    description:
      '25分間の集中作業と5分間の休憩を繰り返すことで、集中力を維持し生産性を向上させる手法です。',
    position: 'center',
    icon: ClockIcon,
  },
  {
    id: 'getting-started',
    title: '早速始めてみましょう！',
    description:
      'タイマーを開始して、最初のポモドーロセッションを体験してみてください。',
    target: '[data-testid="timer-start-button"]',
    position: 'top',
    icon: CheckIcon,
    action: {
      type: 'highlight',
      target: '[data-testid="timer-start-button"]',
    },
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onComplete,
  steps = defaultSteps,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // フォーカス管理のためのref
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // ハイライト効果の管理
  const highlightedElement = useMemo(() => {
    return currentStepData?.action?.type === 'highlight' &&
      currentStepData.action.target
      ? currentStepData.action.target
      : null;
  }, [currentStep, currentStepData]);

  // ハンドラー関数を先に定義
  const handleComplete = useCallback(() => {
    // ハイライトをクリア
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    onComplete();
    onClose();
  }, [onComplete, onClose]);

  const handleSkip = useCallback(() => {
    // ハイライトをクリア
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStepData?.action?.callback) {
      currentStepData.action.callback();
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStepData, isLastStep, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  }, [isFirstStep]);

  // フォーカス管理
  useEffect(() => {
    if (isOpen) {
      // 現在のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;

      // モーダル内の最初のフォーカス可能要素にフォーカス
      setTimeout(() => {
        if (nextButtonRef.current) {
          nextButtonRef.current.focus();
        }
      }, 100);
    } else {
      // モーダルが閉じられた時、元のフォーカスを復元
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleSkip();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          if (!isLastStep) {
            handleNext();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          if (!isFirstStep) {
            handlePrevious();
          }
          break;
        case 'Tab': {
          // フォーカストラップの実装
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[
              focusableElements.length - 1
            ] as HTMLElement;

            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
          break;
        }
      }
    },
    [isOpen, isLastStep, isFirstStep, handleSkip, handleNext, handlePrevious]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ハイライト要素のスタイル適用
  useEffect(() => {
    if (highlightedElement) {
      const element = document.querySelector(highlightedElement);
      if (element) {
        element.classList.add('onboarding-highlight');
      }
    }

    return () => {
      // クリーンアップ
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    };
  }, [highlightedElement]);

  // ツールチップの位置計算
  const getTooltipPosition = useCallback(() => {
    if (!currentStepData?.target) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const targetElement = document.querySelector(currentStepData.target);
    if (!targetElement) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const rect = targetElement.getBoundingClientRect();
    const position = currentStepData.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          top: `${rect.top - 20}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: `${rect.bottom + 20}px`,
          left: `${rect.left + rect.width / 2}px`,
          transform: 'translate(-50%, 0)',
        };
      case 'left':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.left - 20}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: `${rect.top + rect.height / 2}px`,
          left: `${rect.right + 20}px`,
          transform: 'translate(0, -50%)',
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  }, [currentStepData]);

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* ツールチップ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={modalRef}
          className="fixed z-50 max-w-sm"
          style={getTooltipPosition()}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          aria-describedby="onboarding-description"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 relative">
            {/* 閉じるボタン */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-pomodoro-500 focus:ring-offset-2 rounded"
              aria-label="オンボーディングツアーを終了"
              type="button"
            >
              <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* アイコン */}
            {currentStepData.icon && (
              <div
                className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 rounded-xl mb-4"
                aria-hidden="true"
              >
                <currentStepData.icon className="w-6 h-6 text-white" />
              </div>
            )}

            {/* コンテンツ */}
            <div className="mb-6">
              <h2
                id="onboarding-title"
                className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {currentStepData.title}
              </h2>
              <p
                id="onboarding-description"
                className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
              >
                {currentStepData.description}
              </p>
            </div>

            {/* プログレスバー */}
            <div className="mb-4" role="group" aria-labelledby="progress-label">
              <div className="flex justify-between items-center mb-2">
                <span
                  id="progress-label"
                  className="text-xs text-gray-500 dark:text-gray-400"
                >
                  ステップ {currentStep + 1} / {steps.length}
                </span>
                <span
                  className="text-xs text-gray-500 dark:text-gray-400"
                  aria-label={`進捗: ${Math.round(((currentStep + 1) / steps.length) * 100)}パーセント完了`}
                >
                  {Math.round(((currentStep + 1) / steps.length) * 100)}%
                </span>
              </div>
              <div
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
                role="progressbar"
                aria-valuenow={currentStep + 1}
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-labelledby="progress-label"
              >
                <motion.div
                  className="bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* ナビゲーションボタン */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-pomodoro-500 focus:ring-offset-2
                  ${
                    isFirstStep
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                type="button"
                aria-label="前のステップに戻る"
              >
                <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
                <span>戻る</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-pomodoro-500 focus:ring-offset-2 rounded"
                  type="button"
                  aria-label="オンボーディングツアーをスキップ"
                >
                  スキップ
                </button>
                <motion.button
                  ref={nextButtonRef}
                  onClick={handleNext}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 text-white rounded-lg text-sm font-medium hover:from-pomodoro-600 hover:to-pomodoro-700 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-pomodoro-500 focus:ring-offset-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  aria-label={
                    isLastStep
                      ? 'オンボーディングツアーを完了'
                      : '次のステップに進む'
                  }
                >
                  <span>{isLastStep ? '完了' : '次へ'}</span>
                  {isLastStep ? (
                    <CheckIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ツールチップの矢印 */}
          {currentStepData.target && currentStepData.position !== 'center' && (
            <div
              className={`
                absolute w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform rotate-45
                ${currentStepData.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2' : ''}
                ${currentStepData.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2' : ''}
                ${currentStepData.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2' : ''}
                ${currentStepData.position === 'right' ? 'left-[-6px] top-1/2 -translate-y-1/2' : ''}
              `}
              aria-hidden="true"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ハイライト効果用のCSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .onboarding-highlight {
            position: relative;
            z-index: 51;
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            animation: onboarding-pulse 2s infinite;
          }

          @keyframes onboarding-pulse {
            0%, 100% {
              box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.3);
            }
          }
        `,
        }}
      />
    </>
  );
};
