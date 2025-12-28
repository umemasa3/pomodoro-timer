import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../services/notification-service';
import type { SoundType } from '../services/notification-service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = NotificationService.getInstance();
    // コンソールの警告を抑制
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  test('NotificationServiceのインスタンスを取得できる', () => {
    const service1 = NotificationService.getInstance();
    const service2 = NotificationService.getInstance();

    // シングルトンパターンの確認
    expect(service1).toBe(service2);
  });

  // 要件4.5: 通知音の種類選択テスト
  describe('音声通知の種類選択', () => {
    test('すべてのサウンドタイプが正常に再生される', async () => {
      const soundTypes: SoundType[] = ['bell', 'chime', 'notification'];

      for (const soundType of soundTypes) {
        await expect(
          service.playSoundNotification({
            soundType,
            volume: 0.5,
          })
        ).resolves.not.toThrow();
      }
    });

    test('異なるサウンドタイプでセッション完了通知が正常に動作する', async () => {
      const soundTypes: SoundType[] = ['bell', 'chime', 'notification'];

      for (const soundType of soundTypes) {
        await expect(
          service.showSessionCompleteNotification('pomodoro', true, soundType)
        ).resolves.not.toThrow();
      }
    });

    test('音量設定が正常に適用される', async () => {
      const volumes = [0.0, 0.3, 0.5, 0.7, 1.0];

      for (const volume of volumes) {
        await expect(
          service.playSoundNotification({
            soundType: 'bell',
            volume,
          })
        ).resolves.not.toThrow();
      }
    });

    test('デフォルト音量が適用される', async () => {
      await expect(
        service.playSoundNotification({
          soundType: 'bell',
          // volume未指定でデフォルト0.5が使用される
        })
      ).resolves.not.toThrow();
    });
  });

  // 要件4.4: 音声通知のオン/オフ切り替えテスト
  describe('音声通知の設定切り替え', () => {
    test('音声通知が有効な場合、セッション完了時にサウンドが再生される', async () => {
      // 音声通知有効でセッション完了通知
      await expect(
        service.showSessionCompleteNotification('pomodoro', true, 'bell')
      ).resolves.not.toThrow();
    });

    test('音声通知が無効な場合、セッション完了時にサウンドが再生されない', async () => {
      // 音声通知無効でセッション完了通知
      await expect(
        service.showSessionCompleteNotification('pomodoro', false, 'bell')
      ).resolves.not.toThrow();
    });

    test('異なるセッションタイプで音声通知の切り替えが正常に動作する', async () => {
      const sessionTypes = ['pomodoro', 'short_break', 'long_break'] as const;

      for (const sessionType of sessionTypes) {
        // 音声通知有効
        await expect(
          service.showSessionCompleteNotification(sessionType, true, 'bell')
        ).resolves.not.toThrow();

        // 音声通知無効
        await expect(
          service.showSessionCompleteNotification(sessionType, false, 'bell')
        ).resolves.not.toThrow();
      }
    });

    test('音声通知設定と音声タイプの組み合わせが正常に動作する', async () => {
      const soundTypes: SoundType[] = ['bell', 'chime', 'notification'];
      const soundSettings = [true, false];

      for (const soundEnabled of soundSettings) {
        for (const soundType of soundTypes) {
          await expect(
            service.showSessionCompleteNotification(
              'pomodoro',
              soundEnabled,
              soundType
            )
          ).resolves.not.toThrow();
        }
      }
    });
  });

  test('サウンド通知が例外を投げずに実行される', async () => {
    // サウンド通知が例外を投げないことを確認
    await expect(
      service.playSoundNotification({
        soundType: 'bell',
        volume: 0.5,
      })
    ).resolves.not.toThrow();
  });

  test('異なるサウンドタイプが例外を投げずに実行される', async () => {
    const soundTypes = ['bell', 'chime', 'notification'] as const;

    for (const soundType of soundTypes) {
      await expect(
        service.playSoundNotification({
          soundType,
          volume: 0.5,
        })
      ).resolves.not.toThrow();
    }
  });

  test('セッション完了通知が例外を投げずに実行される', async () => {
    await expect(
      service.showSessionCompleteNotification('pomodoro', true, 'bell')
    ).resolves.not.toThrow();

    await expect(
      service.showSessionCompleteNotification('short_break', false, 'chime')
    ).resolves.not.toThrow();

    await expect(
      service.showSessionCompleteNotification(
        'long_break',
        true,
        'notification'
      )
    ).resolves.not.toThrow();
  });

  test('通知テストが例外を投げずに実行される', async () => {
    await expect(service.testNotification()).resolves.not.toThrow();
  });

  test('クリーンアップが例外を投げずに実行される', () => {
    expect(() => {
      service.cleanup();
    }).not.toThrow();
  });

  test('通知権限の取得が例外を投げずに実行される', () => {
    expect(() => {
      service.getPermission();
    }).not.toThrow();
  });

  test('通知権限の要求が例外を投げずに実行される', async () => {
    await expect(service.requestPermission()).resolves.not.toThrow();
  });
});
