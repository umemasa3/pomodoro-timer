import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// テーマの種類を定義
export type Theme = 'light' | 'dark' | 'auto';

// カラーモードの種類を定義（色彩心理学に基づく）
export type ColorMode = 'focus' | 'calm' | 'energy' | 'nature';

// テーマ設定のインターフェース
interface ThemeSettings {
  theme: Theme;
  colorMode: ColorMode;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

// テーマストアの状態インターフェース
interface ThemeState {
  // 現在の設定
  settings: ThemeSettings;

  // 実際に適用されているテーマ（autoの場合はシステム設定に基づく）
  resolvedTheme: 'light' | 'dark';

  // アクション
  setTheme: (theme: Theme) => void;
  setColorMode: (colorMode: ColorMode) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setHighContrast: (highContrast: boolean) => void;
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void;
  toggleTheme: () => void;

  // 初期化
  initializeTheme: () => void;
}

// デフォルト設定
const defaultSettings: ThemeSettings = {
  theme: 'auto',
  colorMode: 'focus',
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
};

// システムのダークモード設定を取得
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// テーマを解決（autoの場合はシステム設定を使用）
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'auto') {
    return getSystemTheme();
  }
  return theme;
};

// DOMにテーマクラスを適用
const applyThemeToDOM = (
  resolvedTheme: 'light' | 'dark',
  colorMode: ColorMode,
  highContrast: boolean,
  reducedMotion: boolean,
  fontSize: 'small' | 'medium' | 'large'
) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // テーマクラスの適用
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);

  // カラーモードクラスの適用
  root.classList.remove(
    'color-focus',
    'color-calm',
    'color-energy',
    'color-nature'
  );
  root.classList.add(`color-${colorMode}`);

  // アクセシビリティクラスの適用
  root.classList.toggle('high-contrast', highContrast);
  root.classList.toggle('reduced-motion', reducedMotion);

  // フォントサイズクラスの適用
  root.classList.remove('font-small', 'font-medium', 'font-large');
  root.classList.add(`font-${fontSize}`);

  // メタテーマカラーの更新（PWA対応）
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const themeColors = {
      light: {
        focus: '#ef4444',
        calm: '#3b82f6',
        energy: '#f59e0b',
        nature: '#22c55e',
      },
      dark: {
        focus: '#dc2626',
        calm: '#2563eb',
        energy: '#d97706',
        nature: '#16a34a',
      },
    };
    metaThemeColor.setAttribute(
      'content',
      themeColors[resolvedTheme][colorMode]
    );
  }
};

// テーマストアの作成
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      resolvedTheme: 'light',

      setTheme: (theme: Theme) => {
        const resolvedTheme = resolveTheme(theme);
        const { settings } = get();
        const newSettings = { ...settings, theme };

        set({ settings: newSettings, resolvedTheme });
        applyThemeToDOM(
          resolvedTheme,
          settings.colorMode,
          settings.highContrast,
          settings.reducedMotion,
          settings.fontSize
        );
      },

      setColorMode: (colorMode: ColorMode) => {
        const { settings, resolvedTheme } = get();
        const newSettings = { ...settings, colorMode };

        set({ settings: newSettings });
        applyThemeToDOM(
          resolvedTheme,
          colorMode,
          settings.highContrast,
          settings.reducedMotion,
          settings.fontSize
        );
      },

      setReducedMotion: (reducedMotion: boolean) => {
        const { settings, resolvedTheme } = get();
        const newSettings = { ...settings, reducedMotion };

        set({ settings: newSettings });
        applyThemeToDOM(
          resolvedTheme,
          settings.colorMode,
          settings.highContrast,
          reducedMotion,
          settings.fontSize
        );
      },

      setHighContrast: (highContrast: boolean) => {
        const { settings, resolvedTheme } = get();
        const newSettings = { ...settings, highContrast };

        set({ settings: newSettings });
        applyThemeToDOM(
          resolvedTheme,
          settings.colorMode,
          highContrast,
          settings.reducedMotion,
          settings.fontSize
        );
      },

      setFontSize: (fontSize: 'small' | 'medium' | 'large') => {
        const { settings, resolvedTheme } = get();
        const newSettings = { ...settings, fontSize };

        set({ settings: newSettings });
        applyThemeToDOM(
          resolvedTheme,
          settings.colorMode,
          settings.highContrast,
          settings.reducedMotion,
          fontSize
        );
      },

      toggleTheme: () => {
        const { settings } = get();
        const currentResolved = resolveTheme(settings.theme);
        const newTheme: Theme = currentResolved === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      initializeTheme: () => {
        const { settings } = get();
        const resolvedTheme = resolveTheme(settings.theme);

        set({ resolvedTheme });
        applyThemeToDOM(
          resolvedTheme,
          settings.colorMode,
          settings.highContrast,
          settings.reducedMotion,
          settings.fontSize
        );

        // システムテーマ変更の監視（autoモードの場合）
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            const { settings } = get();
            if (settings.theme === 'auto') {
              const newResolvedTheme = getSystemTheme();
              set({ resolvedTheme: newResolvedTheme });
              applyThemeToDOM(
                newResolvedTheme,
                settings.colorMode,
                settings.highContrast,
                settings.reducedMotion,
                settings.fontSize
              );
            }
          };

          mediaQuery.addEventListener('change', handleChange);

          // クリーンアップ関数を返す
          return () => {
            mediaQuery.removeEventListener('change', handleChange);
          };
        }
      },
    }),
    {
      name: 'pomodoro-theme-settings',
      partialize: state => ({ settings: state.settings }),
    }
  )
);
