import React, { useRef, useCallback } from 'react';
import { useKeyboardNavigation } from '../../hooks/use-keyboard-navigation';

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
  className?: string;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  restoreFocus = true,
  autoFocus = true,
  onEscape,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useKeyboardNavigation(containerRef, {
    enabled: active,
    trapFocus: true,
    restoreFocus,
    autoFocus,
    onEscape,
  });

  return (
    <div
      ref={containerRef}
      className={className}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

// モーダル用のフォーカストラップ
export const ModalFocusTrap: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}> = ({ children, isOpen, onClose, className = '' }) => {
  return (
    <FocusTrap
      active={isOpen}
      restoreFocus={true}
      autoFocus={true}
      onEscape={onClose}
      className={className}
    >
      {children}
    </FocusTrap>
  );
};

// フォーカス可能な要素を管理するコンポーネント
export const FocusableElement: React.FC<{
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  [key: string]: any;
}> = ({
  children,
  as: Component = 'div',
  disabled = false,
  onFocus,
  onBlur,
  className = '',
  ...props
}) => {
  const elementRef = useRef<HTMLElement>(null);

  const handleFocus = useCallback(() => {
    if (!disabled && onFocus) {
      onFocus();
    }
  }, [disabled, onFocus]);

  const handleBlur = useCallback(() => {
    if (!disabled && onBlur) {
      onBlur();
    }
  }, [disabled, onBlur]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    // Enterキーでクリックをシミュレート
    if (event.key === 'Enter' && props.onClick) {
      event.preventDefault();
      props.onClick(event);
    }
  }, [disabled, props.onClick]);

  return (
    <Component
      ref={elementRef}
      tabIndex={disabled ? -1 : props.tabIndex ?? 0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </Component>
  );
};

// フォーカス管理のためのユーティリティフック
export const useFocusManagement = () => {
  const saveFocus = useCallback(() => {
    return document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback((element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus();
    }
  }, []);

  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.focus) {
      element.focus();
    }
  }, []);

  const focusFirstInContainer = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement && firstElement.focus) {
      firstElement.focus();
    }
  }, []);

  return {
    saveFocus,
    restoreFocus,
    focusElement,
    focusFirstInContainer,
  };
};