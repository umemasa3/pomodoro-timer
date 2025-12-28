import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  Cog6ToothIcon,
  BellIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { NotificationSettings } from './notification-settings';
import { ThemeSettings } from './theme-settings';
import { ResponsiveModal } from '../layout/responsive-layout';
import { useBreakpoints } from '../../hooks/use-responsive';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'notifications' | 'theme' | 'general';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');
  const { isMobile } = useBreakpoints();

  const tabs = [
    {
      id: 'theme' as SettingsTab,
      label: 'テーマ・表示',
      icon: PaintBrushIcon,
      description: 'テーマとアクセシビリティ設定',
    },
    {
      id: 'notifications' as SettingsTab,
      label: '通知設定',
      icon: BellIcon,
      description: '音声・視覚通知の設定',
    },
    {
      id: 'general' as SettingsTab,
      label: '一般設定',
      icon: Cog6ToothIcon,
      description: 'タイマーとセッション設定',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'theme':
        return <ThemeSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'general':
        return (
          <div className="text-center py-12">
            <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              一般設定は今後のアップデートで追加予定です
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-pomodoro-500 to-pomodoro-600 rounded-lg">
              <Cog6ToothIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                設定
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                アプリケーションの設定をカスタマイズ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}
        >
          {/* タブナビゲーション */}
          <div
            className={`
            ${isMobile ? 'flex overflow-x-auto border-b' : 'w-64 border-r'} 
            border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50
          `}
          >
            <div
              className={`${isMobile ? 'flex space-x-1 p-2' : 'space-y-1 p-4'}`}
            >
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      ${isMobile ? 'flex-shrink-0 px-4 py-2' : 'w-full p-3'}
                      flex items-center space-x-3 rounded-lg transition-all duration-200
                      ${
                        isActive
                          ? 'bg-white dark:bg-gray-700 text-pomodoro-600 dark:text-pomodoro-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon
                      className={`w-5 h-5 ${isMobile ? '' : 'flex-shrink-0'}`}
                    />
                    <div
                      className={`${isMobile ? 'hidden sm:block' : 'text-left'}`}
                    >
                      <p className="font-medium text-sm">{tab.label}</p>
                      {!isMobile && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {tab.description}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* タブコンテンツ */}
          <div className="flex-1 overflow-y-auto">
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <motion.button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            閉じる
          </motion.button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
