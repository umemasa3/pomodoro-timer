import { useState, useEffect } from 'react';

// ブレークポイントの定義（Tailwindに合わせる）
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// 現在の画面サイズを取得するフック
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
  }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// 特定のブレークポイント以上かどうかを判定するフック
export const useBreakpoint = (breakpoint: Breakpoint) => {
  const { width } = useScreenSize();
  return width >= breakpoints[breakpoint];
};

// 複数のブレークポイントの状態を取得するフック
export const useBreakpoints = () => {
  const { width } = useScreenSize();

  return {
    isSm: width >= breakpoints.sm,
    isMd: width >= breakpoints.md,
    isLg: width >= breakpoints.lg,
    isXl: width >= breakpoints.xl,
    is2Xl: width >= breakpoints['2xl'],

    // 逆方向の判定
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,

    // 現在のブレークポイント名を取得
    currentBreakpoint: (() => {
      if (width >= breakpoints['2xl']) return '2xl';
      if (width >= breakpoints.xl) return 'xl';
      if (width >= breakpoints.lg) return 'lg';
      if (width >= breakpoints.md) return 'md';
      if (width >= breakpoints.sm) return 'sm';
      return 'xs';
    })() as Breakpoint | 'xs',

    width,
  };
};

// デバイスの向きを取得するフック
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    () => {
      if (typeof window === 'undefined') return 'portrait';
      return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
};

// タッチデバイスかどうかを判定するフック
export const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-expect-error - msMaxTouchPoints is not in TypeScript definitions
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
};

// プリファードカラースキームを取得するフック
export const usePreferredColorScheme = () => {
  const [preferredScheme, setPreferredScheme] = useState<'light' | 'dark'>(
    () => {
      if (typeof window === 'undefined') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPreferredScheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return preferredScheme;
};

// モーション設定を取得するフック
export const usePreferredMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// レスポンシブな値を取得するフック
export const useResponsiveValue = <T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}) => {
  const { currentBreakpoint } = useBreakpoints();

  // 現在のブレークポイント以下で定義されている最大の値を返す
  const breakpointOrder: (Breakpoint | 'xs')[] = [
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
  ];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp as keyof typeof values] !== undefined) {
      return values[bp as keyof typeof values];
    }
  }

  // フォールバック: 最初に定義されている値を返す
  return (
    values.xs ||
    values.sm ||
    values.md ||
    values.lg ||
    values.xl ||
    values['2xl']
  );
};

// コンテナクエリ風の機能を提供するフック
export const useContainerSize = (ref: React.RefObject<HTMLElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return size;
};
