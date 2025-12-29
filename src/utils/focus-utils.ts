/**
 * フォーカス管理のためのユーティリティ関数
 */

// フォーカス可能な要素のセレクター
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

/**
 * フォーカス可能な要素を検索するユーティリティ関数
 */
export const findFocusableElements = (
  container: HTMLElement
): HTMLElement[] => {
  return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS)).filter(
    element => {
      const htmlElement = element as HTMLElement;
      return (
        htmlElement.offsetWidth > 0 &&
        htmlElement.offsetHeight > 0 &&
        !htmlElement.hasAttribute('disabled') &&
        htmlElement.tabIndex !== -1
      );
    }
  ) as HTMLElement[];
};

/**
 * フォーカスを保存する
 */
export const saveFocus = (): HTMLElement | null => {
  return document.activeElement as HTMLElement;
};

/**
 * フォーカスを復元する
 */
export const restoreFocus = (element: HTMLElement | null): void => {
  if (element && element.focus) {
    element.focus();
  }
};

/**
 * セレクターでフォーカスする
 */
export const focusElement = (selector: string): void => {
  const element = document.querySelector(selector) as HTMLElement;
  if (element && element.focus) {
    element.focus();
  }
};

/**
 * コンテナ内の最初のフォーカス可能要素にフォーカスする
 */
export const focusFirstInContainer = (container: HTMLElement): void => {
  const focusableElements = findFocusableElements(container);
  const firstElement = focusableElements[0];
  if (firstElement && firstElement.focus) {
    firstElement.focus();
  }
};
