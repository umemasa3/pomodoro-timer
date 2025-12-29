import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  BellIcon,
  UserIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth-store';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ onNext: (data?: any) => void; data?: any }>;
}

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (setupData: any) => void;
}

// ステップ1: プロファイル設定
const ProfileStep: React.FC<{ onNext: (data?: any) => void; data?: any }> = ({
  onNext,
  data = {},
}) => {
  const [displayName, setDisplayName] = useState(data.displayName || '');
  const [timezone, setTimezone] = useState(data.timezone || 'Asia/Tokyo');

  const timezones = [
    { value: 'Asia/Tokyo', label: '日本 (JST)' },
    { value: 'America/New_York', label: 'ニューヨーク (EST)' },
    { value: 'America/Los_Angeles', label: 'ロサンゼルス (PST)' },
    { value: 'Europe/London', label: 'ロンドン (GMT)' },
    { value: 'Europe/Paris', label: 'パリ (CET)' },
    { value: 'Asia/Shanghai', label: '上海 (CST)' },
    { value: 'Asia/Seoul', label: 'ソウル (KST)' },
    { value: 'UTC', label: 'UTC' },
  ];

  const handleNext = () => {
    onNext({ displayName, timezone });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          表示名
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="あなたの名前を入力してください"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          アプリ内で表示される名前です
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          タイムゾーン
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          統計の時間表示に使用されます
        </p>
      </div>

      <motion.button
        onClick={handleNext}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 text-white rounded-lg font-medium hover:from-pomodoro-600 hover:to-pomodoro-700 transition-all shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>次へ</span>
        <ArrowRightIcon className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

// ステップ2: タイマー設定
const TimerStep: React.FC<{ onNext: (data?: any) => void; data?: any }> = ({
  onNext,
  data = {},
}) => {
  const [pomodoroMinutes, setPomodoroMinutes] = useState(data.pomodoroMinutes || 25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(data.shortBreakMinutes || 5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(data.longBreakMinutes || 15);
  const [sessionsUntilLongBreak, setSessionsUntilLongBreak] = useState(
    data.sessionsUntilLongBreak || 4
  );

  const handleNext = () => {
    onNext({
      pomodoroMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      sessionsUntilLongBreak,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            集中時間 (分)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={pomodoroMinutes}
            onChange={(e) => setPomodoroMinutes(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            短い休憩 (分)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={shortBreakMinutes}
            onChange={(e) => setShortBreakMinutes(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            長い休憩 (分)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={longBreakMinutes}
            onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            長い休憩までのセッション数
          </label>
          <input
            type="number"
            min="2"
            max="10"
            value={sessionsUntilLongBreak}
            onChange={(e) => setSessionsUntilLongBreak(Number(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              ポモドーロテクニックについて
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              25分の集中作業と5分の休憩を繰り返すことで、集中力を維持し生産性を向上させる手法です。
              設定はいつでも変更できます。
            </p>
          </div>
        </div>
      </div>

      <motion.button
        onClick={handleNext}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 text-white rounded-lg font-medium hover:from-pomodoro-600 hover:to-pomodoro-700 transition-all shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>次へ</span>
        <ArrowRightIcon className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

// ステップ3: 通知設定
const NotificationStep: React.FC<{ onNext: (data?: any) => void; data?: any }> = ({
  onNext,
  data = {},
}) => {
  const [soundEnabled, setSoundEnabled] = useState(data.soundEnabled ?? true);
  const [soundType, setSoundType] = useState(data.soundType || 'bell');
  const [desktopNotifications, setDesktopNotifications] = useState(
    data.desktopNotifications ?? true
  );
  const [vibration, setVibration] = useState(data.vibration ?? false);

  const soundTypes = [
    { value: 'bell', label: 'ベル' },
    { value: 'chime', label: 'チャイム' },
    { value: 'ding', label: 'ディン' },
    { value: 'none', label: 'なし' },
  ];

  const handleNext = () => {
    onNext({
      soundEnabled,
      soundType,
      desktopNotifications,
      vibration,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              音声通知
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              セッション終了時に音で通知します
            </p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${soundEnabled ? 'bg-pomodoro-500' : 'bg-gray-200 dark:bg-gray-700'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {soundEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              通知音の種類
            </label>
            <select
              value={soundType}
              onChange={(e) => setSoundType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pomodoro-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {soundTypes.map((sound) => (
                <option key={sound.value} value={sound.value}>
                  {sound.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              デスクトップ通知
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ブラウザの通知機能を使用します
            </p>
          </div>
          <button
            onClick={() => setDesktopNotifications(!desktopNotifications)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${desktopNotifications ? 'bg-pomodoro-500' : 'bg-gray-200 dark:bg-gray-700'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${desktopNotifications ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              バイブレーション
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              モバイルデバイスで振動通知します
            </p>
          </div>
          <button
            onClick={() => setVibration(!vibration)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${vibration ? 'bg-pomodoro-500' : 'bg-gray-200 dark:bg-gray-700'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${vibration ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      <motion.button
        onClick={handleNext}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 text-white rounded-lg font-medium hover:from-pomodoro-600 hover:to-pomodoro-700 transition-all shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>次へ</span>
        <ArrowRightIcon className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

// ステップ4: 完了
const CompletionStep: React.FC<{ onNext: (data?: any) => void; data?: any }> = ({
  onNext,
}) => {
  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto">
        <CheckIcon className="w-10 h-10 text-white" />
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          セットアップ完了！
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          ポモドーロタイマーを使い始める準備が整いました。
          設定はいつでも変更できます。
        </p>
      </div>

      <div className="bg-gradient-to-r from-pomodoro-50 to-break-50 dark:from-pomodoro-900/20 dark:to-break-900/20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <SparklesIcon className="w-6 h-6 text-pomodoro-600 dark:text-pomodoro-400 flex-shrink-0" />
          <div className="text-left">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              次のステップ
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <li>• タイマーを開始して最初のポモドーロセッションを体験</li>
              <li>• タスクを作成してセッションと関連付け</li>
              <li>• 統計ページで進捗を確認</li>
            </ul>
          </div>
        </div>
      </div>

      <motion.button
        onClick={() => onNext()}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>開始する</span>
        <CheckIcon className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

const setupSteps: SetupStep[] = [
  {
    id: 'profile',
    title: 'プロファイル設定',
    description: '基本的な情報を設定しましょう',
    icon: UserIcon,
    component: ProfileStep,
  },
  {
    id: 'timer',
    title: 'タイマー設定',
    description: 'ポモドーロタイマーの時間を設定しましょう',
    icon: ClockIcon,
    component: TimerStep,
  },
  {
    id: 'notifications',
    title: '通知設定',
    description: '通知の方法を選択しましょう',
    icon: BellIcon,
    component: NotificationStep,
  },
  {
    id: 'completion',
    title: '完了',
    description: 'セットアップが完了しました',
    icon: CheckIcon,
    component: CompletionStep,
  },
];

export const SetupWizard: React.FC<SetupWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<any>({});
  const { updateProfile, updateUserSettings } = useAuthStore();

  const currentStepData = setupSteps[currentStep];
  const isLastStep = currentStep === setupSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async (stepData?: any) => {
    const newSetupData = { ...setupData, ...stepData };
    setSetupData(newSetupData);

    if (isLastStep) {
      // セットアップ完了時の処理
      try {
        // プロファイル更新
        if (newSetupData.displayName || newSetupData.timezone) {
          await updateProfile({
            display_name: newSetupData.displayName,
            timezone: newSetupData.timezone,
          });
        }

        // ユーザー設定更新
        const userSettings = {
          pomodoro_minutes: newSetupData.pomodoroMinutes || 25,
          short_break_minutes: newSetupData.shortBreakMinutes || 5,
          long_break_minutes: newSetupData.longBreakMinutes || 15,
          sessions_until_long_break: newSetupData.sessionsUntilLongBreak || 4,
          sound_enabled: newSetupData.soundEnabled ?? true,
          sound_type: newSetupData.soundType || 'bell',
          notifications: {
            desktop: newSetupData.desktopNotifications ?? true,
            sound: newSetupData.soundEnabled ?? true,
            vibration: newSetupData.vibration ?? false,
          },
        };

        await updateUserSettings(userSettings);

        // セットアップ完了をマーク
        localStorage.setItem('setup-completed', 'true');
        
        onComplete(newSetupData);
        onClose();
      } catch (error) {
        console.error('セットアップ保存エラー:', error);
        // エラーが発生してもセットアップは完了とする
        onComplete(newSetupData);
        onClose();
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('setup-completed', 'true');
    onClose();
  };

  if (!isOpen) return null;

  const StepComponent = currentStepData.component;
  const Icon = currentStepData.icon;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 rounded-lg">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="セットアップをスキップ"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* プログレスバー */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ステップ {currentStep + 1} / {setupSteps.length}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(((currentStep + 1) / setupSteps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / setupSteps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <StepComponent onNext={handleNext} data={setupData} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* フッター */}
        {!isLastStep && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isFirstStep
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>戻る</span>
              </button>

              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                スキップ
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};