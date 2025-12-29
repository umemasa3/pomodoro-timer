import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  InformationCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface FeatureTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  showOnFirstVisit?: boolean;
  featureId?: string;
  type?: 'info' | 'tip' | 'help';
  delay?: number;
  className?: string;
}

export const FeatureTooltip: React.FC<FeatureTooltipProps> = ({
  children,
  title,
  description,
  position = 'top',
  trigger = 'hover',
  showOnFirstVisit = false,
  featureId,
  type = 'info',
  delay = 0,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ユニークIDの生成
  const tooltipId = `tooltip-${featureId || Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `${tooltipId}-description`;

  // 初回訪問時の表示制御
  useEffect(() => {
    if (showOnFirstVisit && featureId) {
      const storageKey = `tooltip-shown-${featureId}`;
      const hasShown = localStorage.getItem(storageKey);

      if (!hasShown) {
        const timer = window.setTimeout(() => {
          setIsVisible(true);
          localStorage.setItem(storageKey, 'true');
        }, delay);

        return () => clearTimeout(timer);
      }
    }
  }, [showOnFirstVisit, featureId, delay]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 100);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const handleFocus = () => {
    if (trigger === 'focus') {
      setIsVisible(true);
    }
  };

  const handleBlur = () => {
    if (trigger === 'focus') {
      setIsVisible(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    if (showOnFirstVisit && featureId) {
      localStorage.setItem(`tooltip-shown-${featureId}`, 'true');
    }
  };

  // ツールチップの位置計算
  const getTooltipClasses = () => {
    const baseClasses = 'absolute z-50 max-w-xs';

    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  // アイコンの選択
  const getIcon = useCallback(() => {
    switch (type) {
      case 'tip':
        return LightBulbIcon;
      case 'help':
        return QuestionMarkCircleIcon;
      default:
        return InformationCircleIcon;
    }
  }, [type]);

  // アイコンの色
  const getIconColor = () => {
    switch (type) {
      case 'tip':
        return 'text-yellow-500';
      case 'help':
        return 'text-blue-500';
      default:
        return 'text-pomodoro-500';
    }
  };

  const IconComponent = getIcon();

  // ユニークIDの生成
  const tooltipId = `tooltip-${featureId || Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `${tooltipId}-description`;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // キーボードアクセシビリティの改善
      tabIndex={trigger === 'focus' ? 0 : undefined}
      role={trigger === 'click' ? 'button' : undefined}
      aria-describedby={isVisible ? descriptionId : undefined}
      onKeyDown={e => {
        if (trigger === 'click' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
        if (e.key === 'Escape' && isVisible) {
          handleClose();
        }
      }}
    >
      {children}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={getTooltipClasses()}
            initial={{
              opacity: 0,
              scale: 0.8,
              y: position === 'top' ? 10 : -10,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
            transition={{ duration: 0.2 }}
            role="tooltip"
            id={tooltipId}
            aria-live="polite"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 relative">
              {/* 閉じるボタン（初回表示時のみ） */}
              {showOnFirstVisit && (
                <button
                  onClick={handleClose}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label="ツールチップを閉じる"
                  type="button"
                >
                  <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                </button>
              )}

              {/* ヘッダー */}
              <div className="flex items-start space-x-3 mb-2">
                <div
                  className={`flex-shrink-0 ${getIconColor()}`}
                  aria-hidden="true"
                >
                  {React.createElement(IconComponent, {
                    className: 'w-5 h-5',
                    'aria-hidden': true,
                  })}
                </div>
                <div className="flex-1">
                  <h4
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                    id={`${tooltipId}-title`}
                  >
                    {title}
                  </h4>
                </div>
              </div>

              {/* 説明 */}
              <p
                className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed ml-8"
                id={descriptionId}
                aria-labelledby={`${tooltipId}-title`}
              >
                {description}
              </p>

              {/* 矢印 */}
              <div
                className={`
                  absolute w-2 h-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform rotate-45
                  ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-0 border-l-0' : ''}
                  ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-0 border-r-0' : ''}
                  ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-0 border-b-0' : ''}
                  ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-0 border-t-0' : ''}
                `}
                aria-hidden="true"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// プリセットされた機能ツールチップ
export const TimerTooltip: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <FeatureTooltip
    title="ポモドーロタイマー"
    description="25分間の集中作業と5分間の休憩を繰り返すことで、生産性を向上させます。"
    position="bottom"
    type="info"
    featureId="timer-basics"
    showOnFirstVisit={true}
    delay={2000}
  >
    {children}
  </FeatureTooltip>
);

export const TaskTooltip: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <FeatureTooltip
    title="タスク管理"
    description="タスクを作成してポモドーロセッションと関連付けることで、作業の進捗を追跡できます。"
    position="bottom"
    type="tip"
    featureId="task-management"
    trigger="hover"
  >
    {children}
  </FeatureTooltip>
);

export const StatisticsTooltip: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <FeatureTooltip
    title="統計・分析"
    description="作業時間や完了したタスクの統計を確認して、生産性の向上を図ることができます。"
    position="bottom"
    type="info"
    featureId="statistics-feature"
    trigger="hover"
  >
    {children}
  </FeatureTooltip>
);

// ツールチップマネージャー（複数のツールチップを順次表示）
interface TooltipManagerProps {
  tooltips: Array<{
    id: string;
    selector: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
  }>;
  onComplete?: () => void;
}

export const TooltipManager: React.FC<TooltipManagerProps> = ({
  tooltips,
  onComplete,
}) => {
  const [currentTooltip, setCurrentTooltip] = useState(0);

  const handleComplete = useCallback(() => {
    localStorage.setItem('tooltips-completed', 'true');
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (currentTooltip < tooltips.length) {
      const tooltip = tooltips[currentTooltip];
      const element = document.querySelector(tooltip.selector);

      if (element) {
        // ツールチップを表示するロジック
        const timer = window.setTimeout(() => {
          setCurrentTooltip(prev => prev + 1);
        }, tooltip.delay || 3000);

        return () => clearTimeout(timer);
      }
    } else if (currentTooltip >= tooltips.length) {
      handleComplete();
    }
  }, [currentTooltip, tooltips, handleComplete]);

  useEffect(() => {
    // 初回訪問チェック
    const hasShownTooltips = localStorage.getItem('tooltips-completed');
    if (!hasShownTooltips && tooltips.length > 0) {
      // 初期化のためのsetStateをuseLayoutEffectまたは初期状態で処理
      const timer = window.setTimeout(() => {
        setCurrentTooltip(0);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tooltips.length]);

  return null; // このコンポーネントは直接レンダリングしない
};
