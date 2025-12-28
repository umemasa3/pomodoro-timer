import React from 'react';
import { motion } from 'framer-motion';
import {
  useBreakpoints,
  useOrientation,
  useTouchDevice,
} from '../../hooks/use-responsive';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// メインレスポンシブレイアウト
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
}) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();
  const orientation = useOrientation();
  const isTouchDevice = useTouchDevice();

  return (
    <div
      className={`
        responsive-layout
        ${isMobile ? 'layout-mobile' : ''}
        ${isTablet ? 'layout-tablet' : ''}
        ${isDesktop ? 'layout-desktop' : ''}
        ${orientation === 'landscape' ? 'layout-landscape' : 'layout-portrait'}
        ${isTouchDevice ? 'layout-touch' : 'layout-mouse'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// レスポンシブコンテナ
export const ResponsiveContainer: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
}) => {
  const { isMobile, isTablet } = useBreakpoints();

  return (
    <div
      className={`
        w-full mx-auto px-4
        ${isMobile ? 'max-w-none px-4' : ''}
        ${isTablet ? 'max-w-4xl px-6' : ''}
        ${!isMobile && !isTablet ? 'max-w-7xl px-8' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// レスポンシブグリッド
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
}) => {
  const gridClasses = [
    'grid',
    `gap-${gap}`,
    cols.xs ? `grid-cols-${cols.xs}` : 'grid-cols-1',
    cols.sm ? `sm:grid-cols-${cols.sm}` : '',
    cols.md ? `md:grid-cols-${cols.md}` : '',
    cols.lg ? `lg:grid-cols-${cols.lg}` : '',
    cols.xl ? `xl:grid-cols-${cols.xl}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={`${gridClasses} ${className}`}>{children}</div>;
};

// レスポンシブカード
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = true,
}) => {
  const { isMobile } = useBreakpoints();

  const paddingClasses = {
    sm: isMobile ? 'p-3' : 'p-4',
    md: isMobile ? 'p-4' : 'p-6',
    lg: isMobile ? 'p-6' : 'p-8',
  };

  return (
    <motion.div
      className={`
        card
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-2xl hover:-translate-y-1' : ''}
        ${className}
      `}
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

// レスポンシブボタン
interface ResponsiveButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
}) => {
  const { isMobile } = useBreakpoints();

  const baseClasses =
    'font-semibold rounded-xl transition-all duration-300 focus-visible-ring';

  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  };

  const sizeClasses = {
    sm: isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-sm',
    md: isMobile ? 'px-6 py-3' : 'px-8 py-4',
    lg: isMobile ? 'px-8 py-4 text-lg' : 'px-10 py-5 text-lg',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${disabledClass}
        ${className}
      `}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
};

// レスポンシブナビゲーション
interface ResponsiveNavProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveNav: React.FC<ResponsiveNavProps> = ({
  children,
  className = '',
}) => {
  const { isMobile } = useBreakpoints();

  return (
    <nav
      className={`
        ${isMobile ? 'fixed bottom-0 left-0 right-0 z-50' : 'relative'}
        ${isMobile ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md' : ''}
        ${isMobile ? 'border-t border-gray-200 dark:border-gray-700' : ''}
        ${isMobile ? 'px-4 py-2' : ''}
        ${className}
      `}
    >
      <div
        className={`
          ${isMobile ? 'flex justify-around items-center' : 'flex items-center space-x-4'}
        `}
      >
        {children}
      </div>
    </nav>
  );
};

// レスポンシブモーダル
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
}) => {
  const { isMobile } = useBreakpoints();

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* オーバーレイ */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* モーダルコンテンツ */}
      <motion.div
        className={`
          relative w-full max-h-[90vh] overflow-y-auto
          ${isMobile ? 'max-w-sm' : 'max-w-2xl'}
          bg-white dark:bg-gray-800
          rounded-2xl shadow-2xl
          ${className}
        `}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className={isMobile ? 'p-4' : 'p-6'}>{children}</div>
      </motion.div>
    </motion.div>
  );
};
