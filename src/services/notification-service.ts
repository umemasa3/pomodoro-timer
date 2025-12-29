/**
 * 通知サービス - Web Notifications APIとサウンド通知を管理
 */

import { SoundGenerator } from './sound-generator';
import { errorHandler } from './error-handler';
import { monitoringService } from './monitoring-service';
import type { GeneratedSoundType } from './sound-generator';

export type NotificationPermission = 'default' | 'granted' | 'denied';
export type SoundType = 'bell' | 'chime' | 'notification';

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export interface SoundNotificationOptions {
  soundType: SoundType;
  volume?: number; // 0.0 - 1.0
}

export class NotificationService {
  private static instance: NotificationService;
  private soundGenerator: SoundGenerator;

  private constructor() {
    this.soundGenerator = new SoundGenerator();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 通知権限を要求
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('このブラウザは通知をサポートしていません');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();

      // 監視記録
      monitoringService.recordUserActivity({
        action: 'notification_permission_requested',
        component: 'NotificationService',
        metadata: { permission },
      });

      return permission as NotificationPermission;
    } catch (error) {
      await errorHandler.handleError(error as Error, {
        type: 'ui',
        severity: 'medium',
        context: {
          method: 'requestPermission',
          browserSupport: 'Notification' in window,
        },
      });
      return 'denied';
    }
  }

  /**
   * 現在の通知権限を取得
   */
  public getPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermission;
  }
  /**
   * デスクトップ通知を表示
   */
  public async showNotification(
    options: NotificationOptions
  ): Promise<Notification | null> {
    const permission = await this.requestPermission();

    if (permission !== 'granted') {
      console.warn('通知権限が許可されていません');
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/vite.svg',
        tag: options.tag || 'pomodoro-timer',
        requireInteraction: options.requireInteraction || false,
        silent: false,
      });

      // 通知クリック時の処理
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自動で閉じる（5秒後）
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('通知の表示に失敗しました:', error);
      return null;
    }
  }

  /**
   * サウンド通知を再生
   */
  public async playSoundNotification(
    options: SoundNotificationOptions
  ): Promise<void> {
    try {
      await this.soundGenerator.playGeneratedSound(
        options.soundType as GeneratedSoundType,
        options.volume || 0.5
      );
    } catch (error) {
      console.error('サウンド通知の再生に失敗しました:', error);
    }
  }

  /**
   * セッション完了通知を表示
   */
  public async showSessionCompleteNotification(
    sessionType: 'pomodoro' | 'short_break' | 'long_break',
    soundEnabled: boolean = true,
    soundType: SoundType = 'bell'
  ): Promise<void> {
    const messages = {
      pomodoro: {
        title: 'ポモドーロセッション完了！',
        body: '25分間お疲れさまでした。休憩を取りましょう。',
      },
      short_break: {
        title: '短い休憩完了！',
        body: '5分間の休憩が終わりました。次のポモドーロを始めましょう。',
      },
      long_break: {
        title: '長い休憩完了！',
        body: '15分間の休憩が終わりました。新しいポモドーロサイクルを始めましょう。',
      },
    };

    const message = messages[sessionType];

    // デスクトップ通知を表示
    await this.showNotification({
      title: message.title,
      body: message.body,
      tag: `session-complete-${sessionType}`,
      requireInteraction: true,
    });

    // サウンド通知を再生
    if (soundEnabled) {
      await this.playSoundNotification({
        soundType,
        volume: 0.7,
      });
    }
  }

  /**
   * 通知設定のテスト
   */
  public async testNotification(): Promise<void> {
    await this.showSessionCompleteNotification('pomodoro', true, 'bell');
  }

  /**
   * リソースをクリーンアップ
   */
  public cleanup(): void {
    this.soundGenerator.cleanup();
  }
}
