import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';

interface HelpItem {
  id: string;
  title: string;
  content: React.ReactNode;
  type: 'tip' | 'warning' | 'info' | 'guide';
  context: string[]; // どのページ/コンポーネントで表示するか
  priority: number; // 表示優先度
}

interface ContextualHelpProps {
  context: string;
  className?: string;
}

const helpItems: HelpItem[] = [
  {
    id: 'timer-first-use',
    title: 'タイマーの使い方',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          プレイボタンをクリックしてポモドーロセッションを開始しましょう。
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            初回のコツ
          </h5>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 25分間は一つのタスクに集中しましょう</li>
            <li>• 休憩時間は画面から離れてリフレッシュ</li>
            <li>• 通知音を有効にしておくと便利です</li>
          </ul>
        </div>
      </div>
    ),
    type: 'guide',
    context: ['timer', 'first-visit'],
    priority: 1,
  },
  {
    id: 'task-creation-tip',
    title: 'タスクの効果的な作成方法',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          タスクは25分で完了できる小さな単位に分割することが重要です。
        </p>
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <span className="text-green-500 font-bold">✓</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              「レポートの概要を書く」
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-red-500 font-bold">✗</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              「レポートを完成させる」
            </span>
          </div>
        </div>
      </div>
    ),
    type: 'tip',
    context: ['tasks', 'task-creation'],
    priority: 2,
  },
  {
    id: 'statistics-interpretation',
    title: '統計データの見方',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          統計は継続的な改善のためのツールです。完璧を目指さず、傾向を把握しましょう。
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            注目すべきポイント
          </h5>
          <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• 完了率の推移（改善傾向にあるか）</li>
            <li>• 最も生産性の高い時間帯</li>
            <li>• 中断が多い時間帯や曜日</li>
          </ul>
        </div>
      </div>
    ),
    type: 'info',
    context: ['statistics'],
    priority: 2,
  },
  {
    id: 'break-importance',
    title: '休憩の重要性',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          休憩をスキップしたくなりますが、集中力維持のために必ず取りましょう。
        </p>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
          <h5 className="font-medium text-orange-900 dark:text-orange-100 mb-1">
            効果的な休憩方法
          </h5>
          <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
            <li>• 画面から目を離す</li>
            <li>• 軽いストレッチや深呼吸</li>
            <li>• 水分補給</li>
            <li>• SNSやメールは避ける</li>
          </ul>
        </div>
      </div>
    ),
    type: 'warning',
    context: ['timer', 'break'],
    priority: 3,
  },
  {
    id: 'notification-setup',
    title: '通知設定のおすすめ',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          デスクトップ通知を有効にすると、他の作業中でもセッション終了を見逃しません。
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            設定手順
          </h5>
          <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>ブラウザの通知許可を有効にする</li>
            <li>設定ページで通知オプションを調整</li>
            <li>音量を適切なレベルに設定</li>
          </ol>
        </div>
      </div>
    ),
    type: 'info',
    context: ['settings', 'notifications'],
    priority: 2,
  },
];

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  context,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentHelpIndex, setCurrentHelpIndex] = useState(0);
  const [dismissedItems, setDismissedItems] = useState<string[]>([]);

  // コンテキストに応じたヘルプアイテムをフィルタリング
  const relevantHelp = helpItems
    .filter(
      item =>
        item.context.includes(context) && !dismissedItems.includes(item.id)
    )
    .sort((a, b) => a.priority - b.priority);

  const currentHelp = relevantHelp[currentHelpIndex];

  // 初回表示の制御
  useEffect(() => {
    const storageKey = `help-shown-${context}`;
    const hasShown = localStorage.getItem(storageKey);

    if (!hasShown && relevantHelp.length > 0) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem(storageKey, 'true');
      }, 3000); // 3秒後に表示

      return () => clearTimeout(timer);
    }
  }, [context, relevantHelp.length]);

  const handleDismiss = (permanent = false) => {
    if (permanent && currentHelp) {
      setDismissedItems(prev => [...prev, currentHelp.id]);
      localStorage.setItem(`help-dismissed-${currentHelp.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentHelpIndex < relevantHelp.length - 1) {
      setCurrentHelpIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handlePrevious = () => {
    if (currentHelpIndex > 0) {
      setCurrentHelpIndex(prev => prev - 1);
    }
  };

  const getIcon = () => {
    if (!currentHelp) return QuestionMarkCircleIcon;

    switch (currentHelp.type) {
      case 'tip':
        return LightBulbIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'guide':
        return BookOpenIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getIconColor = () => {
    if (!currentHelp) return 'text-blue-500';

    switch (currentHelp.type) {
      case 'tip':
        return 'text-yellow-500';
      case 'warning':
        return 'text-orange-500';
      case 'guide':
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  };

  // ヘルプボタン（常に表示）
  const HelpButton = (
    <motion.button
      onClick={() => setIsOpen(true)}
      className={`
        fixed bottom-6 right-6 z-40 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700
        hover:shadow-xl transition-all duration-200 group
        ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="ヘルプを表示"
    >
      <QuestionMarkCircleIcon className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-pomodoro-500 transition-colors" />
    </motion.button>
  );

  if (relevantHelp.length === 0) {
    return HelpButton;
  }

  const Icon = getIcon();

  return (
    <>
      {HelpButton}

      <AnimatePresence>
        {isOpen && currentHelp && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end justify-end p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => handleDismiss()}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-sm w-full"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${getIconColor()}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {currentHelp.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        コンテキストヘルプ
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss()}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* コンテンツ */}
              <div className="p-4">{currentHelp.content}</div>

              {/* フッター */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {relevantHelp.length > 1 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentHelpIndex + 1} / {relevantHelp.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {currentHelpIndex > 0 && (
                      <button
                        onClick={handlePrevious}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        前へ
                      </button>
                    )}

                    <button
                      onClick={() => handleDismiss(true)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                      非表示
                    </button>

                    {currentHelpIndex < relevantHelp.length - 1 ? (
                      <button
                        onClick={handleNext}
                        className="px-3 py-1.5 bg-pomodoro-500 text-white text-xs font-medium rounded-lg hover:bg-pomodoro-600 transition-colors"
                      >
                        次へ
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDismiss()}
                        className="px-3 py-1.5 bg-pomodoro-500 text-white text-xs font-medium rounded-lg hover:bg-pomodoro-600 transition-colors"
                      >
                        完了
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
