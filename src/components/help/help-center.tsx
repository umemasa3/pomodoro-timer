import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  BookOpenIcon,
  LifebuoyIcon,
} from '@heroicons/react/24/outline';
import { FAQPage } from './faq-page';
import { FeedbackForm } from './feedback-form';
import { SupportChat } from './support-chat';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'faq' | 'feedback' | 'support';
}

type TabType = 'faq' | 'feedback' | 'support';

const tabs = [
  {
    id: 'faq' as TabType,
    label: 'よくある質問',
    description: '一般的な質問と回答',
    icon: QuestionMarkCircleIcon,
    color: 'blue',
  },
  {
    id: 'feedback' as TabType,
    label: 'フィードバック',
    description: 'ご意見・ご要望をお聞かせください',
    icon: PaperAirplaneIcon,
    color: 'green',
  },
  {
    id: 'support' as TabType,
    label: 'サポートチャット',
    description: 'リアルタイムでサポート',
    icon: ChatBubbleLeftRightIcon,
    color: 'purple',
  },
];

export const HelpCenter: React.FC<HelpCenterProps> = ({
  isOpen,
  onClose,
  initialTab = 'faq',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);

    // タブ変更時に対応するモーダルを開く
    if (tab === 'feedback') {
      setShowFeedbackForm(true);
    } else if (tab === 'support') {
      setShowSupportChat(true);
    }
  };

  const handleClose = () => {
    setShowFeedbackForm(false);
    setShowSupportChat(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* サイドバー */}
          <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* ヘッダー */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <LifebuoyIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      ヘルプセンター
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      サポート・お問い合わせ
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* タブナビゲーション */}
            <div className="flex-1 p-4">
              <nav className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        w-full p-4 rounded-xl text-left transition-all
                        ${
                          isActive
                            ? `bg-${tab.color}-100 dark:bg-${tab.color}-900/30 border-2 border-${tab.color}-200 dark:border-${tab.color}-800`
                            : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`
                          p-2 rounded-lg
                          ${
                            isActive
                              ? `bg-${tab.color}-200 dark:bg-${tab.color}-800`
                              : 'bg-gray-100 dark:bg-gray-700'
                          }
                        `}
                        >
                          <Icon
                            className={`
                            w-5 h-5
                            ${
                              isActive
                                ? `text-${tab.color}-700 dark:text-${tab.color}-300`
                                : 'text-gray-600 dark:text-gray-400'
                            }
                          `}
                          />
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`
                            font-medium mb-1
                            ${
                              isActive
                                ? `text-${tab.color}-900 dark:text-${tab.color}-100`
                                : 'text-gray-900 dark:text-white'
                            }
                          `}
                          >
                            {tab.label}
                          </h3>
                          <p
                            className={`
                            text-sm
                            ${
                              isActive
                                ? `text-${tab.color}-700 dark:text-${tab.color}-300`
                                : 'text-gray-500 dark:text-gray-400'
                            }
                          `}
                          >
                            {tab.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>

            {/* フッター */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <BookOpenIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">
                      ユーザーガイド
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      詳しい使い方はユーザーガイドをご覧ください
                    </p>
                    <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">
                      ガイドを開く →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'faq' && (
                <motion.div
                  key="faq"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <FAQPage />
                </motion.div>
              )}

              {activeTab === 'feedback' && (
                <motion.div
                  key="feedback"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex items-center justify-center p-8"
                >
                  <div className="text-center max-w-md">
                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl inline-block mb-4">
                      <PaperAirplaneIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      フィードバックをお送りください
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      アプリの改善のため、ご意見やご要望をお聞かせください。
                      バグ報告、機能要望、改善提案など、どのようなことでもお気軽にお送りください。
                    </p>
                    <motion.button
                      onClick={() => setShowFeedbackForm(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      フィードバックを送信
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'support' && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full flex items-center justify-center p-8"
                >
                  <div className="text-center max-w-md">
                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl inline-block mb-4">
                      <ChatBubbleLeftRightIcon className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      サポートチャット
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      リアルタイムでサポートを受けることができます。
                      よくある質問への自動回答や、必要に応じて人間のサポートスタッフとの連携も可能です。
                    </p>
                    <motion.button
                      onClick={() => setShowSupportChat(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      チャットを開始
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* フィードバックフォーム */}
      <FeedbackForm
        isOpen={showFeedbackForm}
        onClose={() => setShowFeedbackForm(false)}
        onSubmit={async feedback => {
          console.log('フィードバック送信:', feedback);
          // 実際の実装では、APIに送信する処理を追加
        }}
      />

      {/* サポートチャット */}
      <SupportChat
        isOpen={showSupportChat}
        onClose={() => setShowSupportChat(false)}
        onEscalateToHuman={() => {
          console.log('人間サポートへエスカレーション');
          // 実際の実装では、人間サポートへの接続処理を追加
        }}
      />
    </>
  );
};
