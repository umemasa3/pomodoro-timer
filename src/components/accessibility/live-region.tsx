import React, { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  clearAfter?: number; // メッセージをクリアするまでの時間（ミリ秒）
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  atomic = true,
  relevant = 'all',
  clearAfter = 1000,
  className = '',
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // メッセージを設定
      regionRef.current.textContent = message;

      // 指定時間後にメッセージをクリア
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          if (regionRef.current) {
            regionRef.current.textContent = '';
          }
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={`sr-only ${className}`}
      role="status"
    />
  );
};

// 特定用途向けのライブリージョンコンポーネント

export const TimerAnnouncement: React.FC<{ message: string }> = ({ message }) => (
  <LiveRegion
    message={message}
    priority="assertive"
    clearAfter={2000}
    className="timer-announcement"
  />
);

export const StatusAnnouncement: React.FC<{ message: string }> = ({ message }) => (
  <LiveRegion
    message={message}
    priority="polite"
    clearAfter={3000}
    className="status-announcement"
  />
);

export const ErrorAnnouncement: React.FC<{ message: string }> = ({ message }) => (
  <LiveRegion
    message={message}
    priority="assertive"
    clearAfter={5000}
    className="error-announcement"
  />
);

// グローバルライブリージョンマネージャー
class LiveRegionManager {
  private static instance: LiveRegionManager;
  private regions: Map<string, HTMLDivElement> = new Map();

  static getInstance(): LiveRegionManager {
    if (!LiveRegionManager.instance) {
      LiveRegionManager.instance = new LiveRegionManager();
    }
    return LiveRegionManager.instance;
  }

  private constructor() {
    this.createGlobalRegions();
  }

  private createGlobalRegions() {
    // ポライトリージョン
    const politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    politeRegion.id = 'global-live-region-polite';
    document.body.appendChild(politeRegion);
    this.regions.set('polite', politeRegion);

    // アサーティブリージョン
    const assertiveRegion = document.createElement('div');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    assertiveRegion.id = 'global-live-region-assertive';
    document.body.appendChild(assertiveRegion);
    this.regions.set('assertive', assertiveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite', clearAfter = 1000) {
    const region = this.regions.get(priority);
    if (region) {
      region.textContent = message;

      if (clearAfter > 0) {
        setTimeout(() => {
          region.textContent = '';
        }, clearAfter);
      }
    }
  }

  announceTimer(message: string) {
    this.announce(message, 'assertive', 2000);
  }

  announceStatus(message: string) {
    this.announce(message, 'polite', 3000);
  }

  announceError(message: string) {
    this.announce(message, 'assertive', 5000);
  }
}

export const liveRegionManager = LiveRegionManager.getInstance();

// React Hook for live announcements
export const useLiveAnnouncement = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    liveRegionManager.announce(message, priority);
  };

  const announceTimer = (message: string) => {
    liveRegionManager.announceTimer(message);
  };

  const announceStatus = (message: string) => {
    liveRegionManager.announceStatus(message);
  };

  const announceError = (message: string) => {
    liveRegionManager.announceError(message);
  };

  return {
    announce,
    announceTimer,
    announceStatus,
    announceError,
  };
};