import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { useThemeStore } from '../../stores/theme-store';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  size = 'md',
}) => {
  const { settings, toggleTheme } = useThemeStore();

  // サイズ設定
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // 現在のテーマに基づいてアイコンとテーマ名を取得
  const { Icon, themeName } = useMemo(() => {
    const getIcon = () => {
      switch (settings.theme) {
        case 'light':
          return SunIcon;
        case 'dark':
          return MoonIcon;
        case 'auto':
          return ComputerDesktopIcon;
        default:
          return SunIcon;
      }
    };

    const getThemeName = () => {
      switch (settings.theme) {
        case 'light':
          return 'ライトモード';
        case 'dark':
          return 'ダークモード';
        case 'auto':
          return 'システム設定';
        default:
          return 'ライトモード';
      }
    };

    return {
      Icon: getIcon(),
      themeName: getThemeName(),
    };
  }, [settings.theme]);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <motion.button
        onClick={toggleTheme}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          focus-visible-ring
          shadow-sm hover:shadow-md
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={`現在: ${themeName}`}
        aria-label={`テーマを切り替え (現在: ${themeName})`}
      >
        <motion.div
          key={settings.theme}
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
          }}
        >
          <Icon
            className={`
              ${iconSizeClasses[size]}
              text-gray-600 dark:text-gray-300
            `}
          />
        </motion.div>
      </motion.button>

      {showLabel && (
        <motion.span
          key={settings.theme}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {themeName}
        </motion.span>
      )}
    </div>
  );
};

// より詳細なテーマ選択ドロップダウン
export const ThemeSelector: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { settings, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = React.useState(false);

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'ライトモード',
      icon: SunIcon,
      description: '明るいテーマ',
    },
    {
      value: 'dark' as const,
      label: 'ダークモード',
      icon: MoonIcon,
      description: '暗いテーマ',
    },
    {
      value: 'auto' as const,
      label: 'システム設定',
      icon: ComputerDesktopIcon,
      description: 'システムに従う',
    },
  ];

  const currentTheme = themeOptions.find(
    option => option.value === settings.theme
  );
  const CurrentIcon = currentTheme?.icon || SunIcon;

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center space-x-2 px-3 py-2
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          focus-visible-ring
          shadow-sm hover:shadow-md
          min-w-[140px]
        "
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label="テーマを選択"
      >
        <CurrentIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentTheme?.label}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </motion.button>

      {/* ドロップダウンメニュー */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{
          opacity: isOpen ? 1 : 0,
          y: isOpen ? 0 : -10,
          scale: isOpen ? 1 : 0.95,
        }}
        transition={{ duration: 0.2 }}
        className={`
          absolute top-full left-0 mt-2 w-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg
          z-50
          ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
      >
        {themeOptions.map(option => {
          const Icon = option.icon;
          const isSelected = settings.theme === option.value;

          return (
            <motion.button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center space-x-3 px-3 py-2
                text-left transition-colors duration-150
                first:rounded-t-lg last:rounded-b-lg
                ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
              `}
              whileHover={{ x: 2 }}
            >
              <Icon className="w-4 h-4" />
              <div className="flex-1">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* オーバーレイ */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
