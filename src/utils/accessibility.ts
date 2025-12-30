// アクセシビリティ関連のユーティリティ関数

/**
 * スクリーンリーダー用のライブリージョンにメッセージを送信
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // メッセージを読み上げた後、要素を削除
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * 要素にアクセシブルな名前を設定
 */
export const setAccessibleName = (
  element: HTMLElement,
  name: string,
  method: 'aria-label' | 'aria-labelledby' | 'title' = 'aria-label'
) => {
  switch (method) {
    case 'aria-label':
      element.setAttribute('aria-label', name);
      break;
    case 'aria-labelledby':
      element.setAttribute('aria-labelledby', name);
      break;
    case 'title':
      element.setAttribute('title', name);
      break;
  }
};

/**
 * 要素にアクセシブルな説明を設定
 */
export const setAccessibleDescription = (
  element: HTMLElement,
  description: string,
  method: 'aria-describedby' | 'title' = 'aria-describedby'
) => {
  if (method === 'aria-describedby') {
    element.setAttribute('aria-describedby', description);
  } else {
    element.setAttribute('title', description);
  }
};

/**
 * 時間を人間が読みやすい形式に変換（スクリーンリーダー用）
 */
export const formatTimeForScreenReader = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}時間`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}分`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}秒`);
  }

  return parts.join(' ');
};

/**
 * 進捗率を人間が読みやすい形式に変換（スクリーンリーダー用）
 */
export const formatProgressForScreenReader = (
  current: number,
  total: number,
  unit: string = '項目'
): string => {
  const percentage = Math.round((current / total) * 100);
  return `${total}${unit}中${current}${unit}完了、進捗率${percentage}パーセント`;
};

/**
 * 色覚異常対応のカラーパレット
 */
export const accessibleColors = {
  // 高コントラスト対応
  primary: {
    light: '#1f2937', // gray-800
    dark: '#f9fafb', // gray-50
  },
  secondary: {
    light: '#374151', // gray-700
    dark: '#e5e7eb', // gray-200
  },
  success: {
    light: '#065f46', // emerald-800
    dark: '#10b981', // emerald-500
  },
  warning: {
    light: '#92400e', // amber-800
    dark: '#f59e0b', // amber-500
  },
  error: {
    light: '#991b1b', // red-800
    dark: '#ef4444', // red-500
  },
  info: {
    light: '#1e40af', // blue-800
    dark: '#3b82f6', // blue-500
  },
};

/**
 * コントラスト比を計算
 */
export const calculateContrastRatio = (
  color1: string,
  color2: string
): number => {
  const getLuminance = (color: string): number => {
    // 簡易的な輝度計算（実際の実装ではより正確な計算が必要）
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * WCAG準拠のコントラスト比チェック
 */
export const checkContrastCompliance = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);

  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
};

/**
 * フォーカス可能な要素のセレクター
 */
export const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'details > summary',
  'audio[controls]',
  'video[controls]',
].join(', ');

/**
 * 要素がフォーカス可能かチェック
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (
    !element ||
    element.hidden ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1') {
    return false;
  }

  if (element.matches(FOCUSABLE_SELECTORS)) {
    return true;
  }

  return tabIndex !== null && !isNaN(parseInt(tabIndex, 10));
};

/**
 * 要素が表示されているかチェック
 */
export const isVisible = (element: HTMLElement): boolean => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
};

/**
 * キーボードナビゲーション用のキーコード
 */
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * ARIA属性のヘルパー
 */
export const ARIA_ATTRIBUTES = {
  // 状態
  expanded: (expanded: boolean) => ({ 'aria-expanded': expanded.toString() }),
  selected: (selected: boolean) => ({ 'aria-selected': selected.toString() }),
  checked: (checked: boolean) => ({ 'aria-checked': checked.toString() }),
  disabled: (disabled: boolean) => ({ 'aria-disabled': disabled.toString() }),
  hidden: (hidden: boolean) => ({ 'aria-hidden': hidden.toString() }),
  pressed: (pressed: boolean) => ({ 'aria-pressed': pressed.toString() }),

  // プロパティ
  label: (label: string) => ({ 'aria-label': label }),
  labelledBy: (id: string) => ({ 'aria-labelledby': id }),
  describedBy: (id: string) => ({ 'aria-describedby': id }),
  controls: (id: string) => ({ 'aria-controls': id }),
  owns: (id: string) => ({ 'aria-owns': id }),

  // ライブリージョン
  live: (politeness: 'off' | 'polite' | 'assertive') => ({
    'aria-live': politeness,
  }),
  atomic: (atomic: boolean) => ({ 'aria-atomic': atomic.toString() }),
  relevant: (relevant: string) => ({ 'aria-relevant': relevant }),

  // 値
  valueNow: (value: number) => ({ 'aria-valuenow': value.toString() }),
  valueMin: (min: number) => ({ 'aria-valuemin': min.toString() }),
  valueMax: (max: number) => ({ 'aria-valuemax': max.toString() }),
  valueText: (text: string) => ({ 'aria-valuetext': text }),

  // 関係性
  level: (level: number) => ({ 'aria-level': level.toString() }),
  setSize: (size: number) => ({ 'aria-setsize': size.toString() }),
  posInSet: (position: number) => ({ 'aria-posinset': position.toString() }),
} as const;
