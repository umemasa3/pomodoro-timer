import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Supabaseのモック設定
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
        limit: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null,
        })
      ),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    rpc: vi.fn(),
  },
}));

// グローバルなモック設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// URL.createObjectURL のモック（CSVエクスポート用）
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// document.createElement のモック（CSVダウンロード用）
const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  if (tagName === 'a') {
    return {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
      download: '',
    };
  }
  return originalCreateElement.call(document, tagName);
});

// Heroiconsのモック設定
vi.mock('@heroicons/react/24/outline', async () => {
  const { createElement } = await import('react');
  return {
    XMarkIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'x-mark-icon',
      })
    ),
    LinkIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', { className, ...props, 'data-testid': 'link-icon' })
    ),
    ArrowPathIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'arrow-path-icon',
      })
    ),
    ExclamationTriangleIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'exclamation-triangle-icon',
      })
    ),
    CheckCircleIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'check-circle-icon',
      })
    ),
    InformationCircleIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'information-circle-icon',
      })
    ),
    PlusIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', { className, ...props, 'data-testid': 'plus-icon' })
    ),
    PencilIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'pencil-icon',
      })
    ),
    TrashIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', { className, ...props, 'data-testid': 'trash-icon' })
    ),
    WifiIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', { className, ...props, 'data-testid': 'wifi-icon' })
    ),
    Cog6ToothIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'cog-6-tooth-icon',
      })
    ),
    ChartBarIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'chart-bar-icon',
      })
    ),
    ClockIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'clock-icon',
      })
    ),
    BellIcon: vi.fn(({ className, ...props }) =>
      createElement('svg', {
        className,
        ...props,
        'data-testid': 'bell-icon',
      })
    ),
  };
});
