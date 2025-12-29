import React, { useRef, useCallback, useMemo } from 'react';
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

  // useKeyboardNavigationのオプションをメモ化
  const navigationOptions = useMemo(
    () => ({
      enabled: active,
      trapFocus: true,
      restoreFocus,
      autoFocus,
      onEscape,
    }),
    [active, restoreFocus, autoFocus, onEscape]
  );

  useKeyboardNavigation(
    containerRef as React.RefObject<HTMLElement>,
    navigationOptions
  );

  return (
    <div ref={containerRef} className={className} tabIndex={-1}>
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
  as?: keyof React.JSX.IntrinsicElements;
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

  const { onClick } = props;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      // Enterキーでクリックをシミュレート
      if (event.key === 'Enter' && onClick) {
        event.preventDefault();
        onClick(event);
      }
    },
    [disabled, onClick]
  );

  const ElementComponent = Component as React.ElementType;

  return (
    <ElementComponent
      ref={elementRef}
      tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </ElementComponent>
  );
};
