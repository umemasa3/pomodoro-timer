import React, { createContext, useContext, useState, useEffect } from 'react';

interface HighContrastContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  isColorBlindFriendly: boolean;
  toggleColorBlindFriendly: () => void;
  reducedMotion: boolean;
  toggleReducedMotion: () => void;
}

const HighContrastContext = createContext<HighContrastContextType | undefined>(undefined);

export const useHighContrast = () => {
  const context = useContext(HighContrastContext);
  if (!context) {
    throw new Error('useHighContrast must be used within a HighContrastProvider');
  }
  return context;
};

interface HighContrastProviderProps {
  children: React.ReactNode;
}

export const HighContrastProvider: React.FC<HighContrastProviderProps> = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isColorBlindFriendly, setIsColorBlindFriendly] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // 初期設定の読み込み
  useEffect(() => {
    const savedHighContrast = localStorage.getItem('high-contrast') === 'true';
    const savedColorBlindFriendly = localStorage.getItem('color-blind-friendly') === 'true';
    const savedReducedMotion = localStorage.getItem('reduced-motion') === 'true';

    // システム設定の確認
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

    setIsHighContrast(savedHighContrast || prefersHighContrast);
    setIsColorBlindFriendly(savedColorBlindFriendly);
    setReducedMotion(savedReducedMotion || prefersReducedMotion);
  }, []);

  // CSS変数とクラスの適用
  useEffect(() => {
    const root = document.documentElement;
    
    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (isColorBlindFriendly) {
      root.classList.add('color-blind-friendly');
    } else {
      root.classList.remove('color-blind-friendly');
    }

    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [isHighContrast, isColorBlindFriendly, reducedMotion]);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);
    localStorage.setItem('high-contrast', newValue.toString());
  };

  const toggleColorBlindFriendly = () => {
    const newValue = !isColorBlindFriendly;
    setIsColorBlindFriendly(newValue);
    localStorage.setItem('color-blind-friendly', newValue.toString());
  };

  const toggleReducedMotion = () => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem('reduced-motion', newValue.toString());
  };

  return (
    <HighContrastContext.Provider
      value={{
        isHighContrast,
        toggleHighContrast,
        isColorBlindFriendly,
        toggleColorBlindFriendly,
        reducedMotion,
        toggleReducedMotion,
      }}
    >
      {children}
      
      {/* 高コントラストテーマのCSS */}
      <style jsx global>{`
        /* 高コントラストモード */
        .high-contrast {
          --color-primary: #000000;
          --color-primary-contrast: #ffffff;
          --color-secondary: #333333;
          --color-secondary-contrast: #ffffff;
          --color-background: #ffffff;
          --color-surface: #f5f5f5;
          --color-border: #000000;
          --color-text: #000000;
          --color-text-secondary: #333333;
          --color-success: #006600;
          --color-warning: #cc6600;
          --color-error: #cc0000;
          --color-info: #0066cc;
        }

        .high-contrast .dark {
          --color-primary: #ffffff;
          --color-primary-contrast: #000000;
          --color-secondary: #cccccc;
          --color-secondary-contrast: #000000;
          --color-background: #000000;
          --color-surface: #1a1a1a;
          --color-border: #ffffff;
          --color-text: #ffffff;
          --color-text-secondary: #cccccc;
          --color-success: #00ff00;
          --color-warning: #ffcc00;
          --color-error: #ff0000;
          --color-info: #00ccff;
        }

        /* 色覚異常対応 */
        .color-blind-friendly {
          --color-success: #0173b2; /* 青系 */
          --color-warning: #de8f05; /* オレンジ系 */
          --color-error: #cc78bc;   /* マゼンタ系 */
          --color-info: #029e73;    /* 緑系 */
        }

        /* アニメーション削減 */
        .reduced-motion *,
        .reduced-motion *::before,
        .reduced-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }

        /* フォーカス表示の強化 */
        .high-contrast *:focus {
          outline: 3px solid var(--color-primary) !important;
          outline-offset: 2px !important;
        }

        /* ボタンのコントラスト強化 */
        .high-contrast button {
          border: 2px solid var(--color-border) !important;
          background-color: var(--color-background) !important;
          color: var(--color-text) !important;
        }

        .high-contrast button:hover {
          background-color: var(--color-primary) !important;
          color: var(--color-primary-contrast) !important;
        }

        /* リンクのコントラスト強化 */
        .high-contrast a {
          color: var(--color-info) !important;
          text-decoration: underline !important;
        }

        .high-contrast a:hover {
          background-color: var(--color-info) !important;
          color: var(--color-primary-contrast) !important;
        }

        /* 入力フィールドのコントラスト強化 */
        .high-contrast input,
        .high-contrast textarea,
        .high-contrast select {
          border: 2px solid var(--color-border) !important;
          background-color: var(--color-background) !important;
          color: var(--color-text) !important;
        }

        /* 色覚異常対応のパターン */
        .color-blind-friendly .bg-red-500 {
          background-color: var(--color-error) !important;
        }

        .color-blind-friendly .bg-green-500 {
          background-color: var(--color-success) !important;
        }

        .color-blind-friendly .bg-yellow-500 {
          background-color: var(--color-warning) !important;
        }

        .color-blind-friendly .bg-blue-500 {
          background-color: var(--color-info) !important;
        }

        /* テキストの色覚異常対応 */
        .color-blind-friendly .text-red-500 {
          color: var(--color-error) !important;
        }

        .color-blind-friendly .text-green-500 {
          color: var(--color-success) !important;
        }

        .color-blind-friendly .text-yellow-500 {
          color: var(--color-warning) !important;
        }

        .color-blind-friendly .text-blue-500 {
          color: var(--color-info) !important;
        }
      `}</style>
    </HighContrastContext.Provider>
  );
};

// アクセシビリティ設定コンポーネント
export const AccessibilitySettings: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    isHighContrast,
    toggleHighContrast,
    isColorBlindFriendly,
    toggleColorBlindFriendly,
    reducedMotion,
    toggleReducedMotion,
  } = useHighContrast();

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        アクセシビリティ設定
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              高コントラストモード
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              テキストと背景のコントラストを強化します
            </p>
          </div>
          <button
            onClick={toggleHighContrast}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isHighContrast ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
            `}
            aria-pressed={isHighContrast}
            aria-label="高コントラストモードの切り替え"
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              色覚異常対応
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              色覚異常の方にも識別しやすい色を使用します
            </p>
          </div>
          <button
            onClick={toggleColorBlindFriendly}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${isColorBlindFriendly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
            `}
            aria-pressed={isColorBlindFriendly}
            aria-label="色覚異常対応の切り替え"
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isColorBlindFriendly ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              アニメーション削減
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              アニメーションや動きを最小限に抑えます
            </p>
          </div>
          <button
            onClick={toggleReducedMotion}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${reducedMotion ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
            `}
            aria-pressed={reducedMotion}
            aria-label="アニメーション削減の切り替え"
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${reducedMotion ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>
    </div>
  );
};