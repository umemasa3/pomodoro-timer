import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/auth-store';
import { NotificationService } from '../../services/notification-service';
import type {
  SoundType,
  NotificationPermission,
} from '../../services/notification-service';

export const NotificationSettings: React.FC = () => {
  const { user, updateUserSettings } = useAuthStore();
  const [notificationService] = useState(() =>
    NotificationService.getInstance()
  );
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [isTestingSound, setIsTestingSound] = useState(false);

  // 通知権限の状態を取得
  useEffect(() => {
    const currentPermission = notificationService.getPermission();
    setPermission(currentPermission);
  }, [notificationService]);

  // 通知権限を要求
  const handleRequestPermission = async () => {
    const newPermission = await notificationService.requestPermission();
    setPermission(newPermission);
  };

  // 通知設定の更新
  const handleNotificationSettingChange = (
    setting: keyof NonNullable<typeof user>['settings']['notifications'],
    value: boolean
  ) => {
    if (!user) return;

    const newNotifications = {
      ...user.settings.notifications,
      [setting]: value,
    };

    updateUserSettings({
      notifications: newNotifications,
    });
  };

  // サウンド設定の更新
  const handleSoundSettingChange = (enabled: boolean) => {
    if (!user) return;

    updateUserSettings({
      sound_enabled: enabled,
    });
  };

  // サウンドタイプの更新
  const handleSoundTypeChange = (soundType: SoundType) => {
    if (!user) return;

    updateUserSettings({
      sound_type: soundType,
    });
  };

  // サウンドテスト
  const handleTestSound = async () => {
    if (!user || isTestingSound) return;

    setIsTestingSound(true);
    try {
      await notificationService.playSoundNotification({
        soundType: user.settings.sound_type,
        volume: 0.7,
      });
    } catch (error) {
      console.error('サウンドテストに失敗しました:', error);
    } finally {
      setIsTestingSound(false);
    }
  };

  // 通知テスト
  const handleTestNotification = async () => {
    await notificationService.testNotification();
  };

  if (!user) {
    return null;
  }

  return (
    <motion.div
      className="card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        通知設定
      </h3>

      {/* 通知権限 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            通知権限
          </span>
          <span
            className={`text-sm px-2 py-1 rounded ${
              permission === 'granted'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : permission === 'denied'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}
          >
            {permission === 'granted'
              ? '許可済み'
              : permission === 'denied'
                ? '拒否'
                : '未設定'}
          </span>
        </div>

        {permission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            className="btn-primary text-sm"
          >
            通知を許可する
          </button>
        )}
      </div>
      {/* デスクトップ通知設定 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            デスクトップ通知
          </label>
          <input
            type="checkbox"
            checked={user.settings.notifications.desktop}
            onChange={e =>
              handleNotificationSettingChange('desktop', e.target.checked)
            }
            className="toggle"
            disabled={permission !== 'granted'}
            data-testid="notification-toggle"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          セッション完了時にデスクトップ通知を表示します
        </p>
      </div>

      {/* サウンド通知設定 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            サウンド通知
          </label>
          <input
            type="checkbox"
            checked={user.settings.sound_enabled}
            onChange={e => handleSoundSettingChange(e.target.checked)}
            className="toggle"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          セッション完了時にサウンドを再生します
        </p>
      </div>

      {/* サウンドタイプ選択 */}
      {user.settings.sound_enabled && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            サウンドタイプ
          </label>
          <div className="space-y-2">
            {(['bell', 'chime', 'notification'] as SoundType[]).map(
              soundType => (
                <label key={soundType} className="flex items-center">
                  <input
                    type="radio"
                    name="soundType"
                    value={soundType}
                    checked={user.settings.sound_type === soundType}
                    onChange={() => handleSoundTypeChange(soundType)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {soundType === 'bell'
                      ? 'ベル'
                      : soundType === 'chime'
                        ? 'チャイム'
                        : '通知音'}
                  </span>
                </label>
              )
            )}
          </div>

          <button
            onClick={handleTestSound}
            disabled={isTestingSound}
            className="btn-secondary text-sm mt-2"
          >
            {isTestingSound ? 'テスト中...' : 'サウンドをテスト'}
          </button>
        </div>
      )}

      {/* バイブレーション設定（モバイル用） */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            バイブレーション
          </label>
          <input
            type="checkbox"
            checked={user.settings.notifications.vibration}
            onChange={e =>
              handleNotificationSettingChange('vibration', e.target.checked)
            }
            className="toggle"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          モバイルデバイスでバイブレーションを使用します
        </p>
      </div>

      {/* 通知テスト */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleTestNotification}
          className="btn-primary text-sm"
          disabled={permission !== 'granted'}
        >
          通知をテスト
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          現在の設定で通知をテストします
        </p>
      </div>
    </motion.div>
  );
};
