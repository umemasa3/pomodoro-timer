import React from 'react';
import { motion } from 'framer-motion';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import {
  useThemeStore,
  type Theme,
  type ColorMode,
} from '../../stores/theme-store';

interface ThemeSettingsProps {
  className?: string;
}

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  className = '',
}) => {
  const {
    settings,
    resolvedTheme,
    setTheme,
    setColorMode,
    setReducedMotion,
    setHighContrast,
    setFontSize,
  } = useThemeStore();

  // テーマオプション
  const themeOptions: Array<{
    value: Theme;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      value: 'light',
      label: 'ライトモード',
      icon: SunIcon,
      description: '明るいテーマで表示',
    },
    {
      value: 'dark',
      label: 'ダークモード',
      icon: MoonIcon,
      description: '暗いテーマで表示',
    },
    {
      value: 'auto',
      label: 'システム設定',
      icon: ComputerDesktopIcon,
      description: 'システムの設定に従う',
    },
  ];

  // カラーモードオプション（色彩心理学に基づく）
  const colorModeOptions: Array<{
    value: ColorMode;
    label: string;
    description: string;
    colors: string[];
  }> = [
    {
      value: 'focus',
      label: '集中モード',
      description: '赤系の色で集中力を高める',
      colors: ['bg-red-500', 'bg-red-600', 'bg-red-700'],
    },
    {
      value: 'calm',
      label: '落ち着きモード',
      description: '青系の色でリラックス効果',
      colors: ['bg-blue-500', 'bg-blue-600', 'bg-blue-700'],
    },
    {
      value: 'energy',
      label: 'エネルギーモード',
      description: 'オレンジ系の色で活力を向上',
      colors: ['bg-orange-500', 'bg-orange-600', 'bg-orange-700'],
    },
    {
      value: 'nature',
      label: 'ナチュラルモード',
      description: '緑系の色で自然な集中',
      colors: ['bg-green-500', 'bg-green-600', 'bg-green-700'],
    },
  ];

  // フォントサイズオプション
  const fontSizeOptions = [
    {
      value: 'small' as const,
      label: '小',
      description: '読みやすい小さめのフォント',
    },
    {
      value: 'medium' as const,
      label: '中',
      description: '標準的なフォントサイズ',
    },
    {
      value: 'large' as const,
      label: '大',
      description: '大きめのフォントで見やすく',
    },
  ];

  return (
    <div className={`space-y-8 ${className}`}>
      {/* テーマ選択 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
          テーマ設定
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map(option => {
            const Icon = option.icon;
            const isSelected = settings.theme === option.value;

            return (
              <motion.button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300
                  ${
                    isSelected
                      ? 'border-pomodoro-500 bg-pomodoro-50 dark:bg-pomodoro-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <Icon
                    className={`w-6 h-6 ${
                      isSelected
                        ? 'text-pomodoro-600 dark:text-pomodoro-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        isSelected
                          ? 'text-pomodoro-900 dark:text-pomodoro-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* 選択インジケーター */}
                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2 w-3 h-3 bg-pomodoro-500 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 現在適用されているテーマの表示 */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          現在適用中:{' '}
          {resolvedTheme === 'light' ? 'ライトモード' : 'ダークモード'}
        </p>
      </motion.div>

      {/* カラーモード選択 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          カラーモード（色彩心理学）
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {colorModeOptions.map(option => {
            const isSelected = settings.colorMode === option.value;

            return (
              <motion.button
                key={option.value}
                onClick={() => setColorMode(option.value)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-300 text-left
                  ${
                    isSelected
                      ? 'border-pomodoro-500 bg-pomodoro-50 dark:bg-pomodoro-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3">
                  {/* カラーサンプル */}
                  <div className="flex space-x-1">
                    {option.colors.map((color, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full ${color}`}
                      />
                    ))}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isSelected
                          ? 'text-pomodoro-900 dark:text-pomodoro-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* 選択インジケーター */}
                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2 w-3 h-3 bg-pomodoro-500 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* アクセシビリティ設定 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <EyeIcon className="w-5 h-5 mr-2" />
          アクセシビリティ
        </h3>

        <div className="space-y-4">
          {/* ハイコントラスト */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                ハイコントラスト
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                コントラストを高めて見やすくします
              </p>
            </div>
            <motion.button
              onClick={() => setHighContrast(!settings.highContrast)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${
                  settings.highContrast
                    ? 'bg-pomodoro-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform"
                animate={{
                  x: settings.highContrast ? 24 : 4,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          {/* モーション軽減 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                アニメーション軽減
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                動きを抑えて快適に使用できます
              </p>
            </div>
            <motion.button
              onClick={() => setReducedMotion(!settings.reducedMotion)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${
                  settings.reducedMotion
                    ? 'bg-pomodoro-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
              whileTap={{ scale: 0.95 }}
              data-testid="theme-toggle-button"
            >
              <motion.span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform"
                animate={{
                  x: settings.reducedMotion ? 24 : 4,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </div>

          {/* フォントサイズ */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
              フォントサイズ
            </p>
            <div className="flex space-x-2">
              {fontSizeOptions.map(option => {
                const isSelected = settings.fontSize === option.value;

                return (
                  <motion.button
                    key={option.value}
                    onClick={() => setFontSize(option.value)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all duration-200
                      ${
                        isSelected
                          ? 'bg-pomodoro-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={option.description}
                  >
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
