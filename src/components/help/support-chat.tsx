import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  ComputerDesktopIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalateToHuman?: () => void;
}

const quickReplies = [
  'タイマーが動かない',
  '通知が来ない',
  'データが保存されない',
  'アカウントについて',
  'その他の問題',
];

const botResponses: Record<string, string> = {
  タイマーが動かない:
    'タイマーの問題ですね。以下をお試しください：\n\n1. ページを再読み込みしてください\n2. ブラウザのキャッシュをクリアしてください\n3. 他のブラウザで試してみてください\n\nそれでも解決しない場合は、詳細をお聞かせください。',
  通知が来ない:
    '通知の問題について説明します：\n\n1. ブラウザの通知許可を確認してください\n2. 設定ページで通知が有効になっているか確認してください\n3. OSの通知設定も確認してください\n\n詳しい設定方法をご案内しますか？',
  データが保存されない:
    'データ保存の問題ですね：\n\n1. ネットワーク接続を確認してください\n2. ログイン状態を確認してください\n3. ブラウザのローカルストレージ制限を確認してください\n\n作業中のデータは失われていませんか？',
  アカウントについて:
    'アカウントに関するお問い合わせですね。以下のどちらでしょうか？\n\n• ログインできない\n• パスワードを忘れた\n• アカウントを削除したい\n• その他のアカウント問題\n\n該当するものを教えてください。',
  その他の問題:
    'その他の問題について詳しく教えてください。どのような問題が発生していますか？\n\n可能であれば以下の情報も教えてください：\n• いつから発生しているか\n• どの機能で問題が起きるか\n• エラーメッセージがあるか',
};

export const SupportChat: React.FC<SupportChatProps> = ({
  isOpen,
  onClose,
  onEscalateToHuman,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期メッセージの設定
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'bot',
        content:
          'こんにちは！ポモドーロタイマーのサポートです。\n\nどのようなことでお困りでしょうか？よくある質問から選択するか、直接メッセージを入力してください。',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // メッセージ自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // ユーザーメッセージを追加
    addMessage({
      type: 'user',
      content: content.trim(),
    });

    setInputValue('');
    setShowQuickReplies(false);
    setIsTyping(true);

    // ボットの応答をシミュレート
    setTimeout(
      () => {
        const response = getBotResponse(content.trim());
        addMessage({
          type: 'bot',
          content: response,
          actions: response.includes('詳しい設定方法')
            ? [
                {
                  label: '設定方法を見る',
                  action: () => {
                    addMessage({
                      type: 'bot',
                      content:
                        '通知設定の詳しい手順：\n\n【ブラウザ設定】\n1. アドレスバーの鍵アイコンをクリック\n2. 「通知」を「許可」に変更\n3. ページを再読み込み\n\n【アプリ設定】\n1. 右上の設定ボタンをクリック\n2. 「通知設定」セクションを開く\n3. 必要な通知を有効にする',
                    });
                  },
                },
              ]
            : undefined,
        });
        setIsTyping(false);
      },
      1000 + Math.random() * 1000
    );
  };

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // キーワードベースの簡単な応答
    if (
      lowerMessage.includes('タイマー') &&
      (lowerMessage.includes('動かない') || lowerMessage.includes('開始'))
    ) {
      return botResponses['タイマーが動かない'];
    }
    if (
      lowerMessage.includes('通知') &&
      (lowerMessage.includes('来ない') || lowerMessage.includes('表示'))
    ) {
      return botResponses['通知が来ない'];
    }
    if (
      lowerMessage.includes('データ') &&
      (lowerMessage.includes('保存') || lowerMessage.includes('消え'))
    ) {
      return botResponses['データが保存されない'];
    }
    if (
      lowerMessage.includes('アカウント') ||
      lowerMessage.includes('ログイン') ||
      lowerMessage.includes('パスワード')
    ) {
      return botResponses['アカウントについて'];
    }

    // デフォルト応答
    return 'ご質問ありがとうございます。\n\nより詳しくサポートするために、以下の情報を教えていただけますか？\n\n• 具体的にどのような問題が発生していますか？\n• いつから問題が起きていますか？\n• どの機能を使用中に問題が発生しますか？\n\nまた、人間のサポートスタッフに直接相談することも可能です。';
  };

  const handleQuickReply = (reply: string) => {
    handleSendMessage(reply);
  };

  const handleEscalate = () => {
    addMessage({
      type: 'system',
      content: '人間のサポートスタッフに接続しています...',
    });

    setTimeout(() => {
      addMessage({
        type: 'bot',
        content:
          '申し訳ございませんが、現在サポートスタッフは対応中です。\n\nお急ぎの場合は、フィードバックフォームから詳細をお送りください。24時間以内にメールでご返信いたします。',
      });
      onEscalateToHuman?.();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-end p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md h-[600px] flex flex-col"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                サポートチャット
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  オンライン
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* メッセージエリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-3 text-sm
                  ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : message.type === 'system'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }
                `}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'bot' && (
                    <ComputerDesktopIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                  )}
                  {message.type === 'user' && (
                    <UserIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/80" />
                  )}
                  {message.type === 'system' && (
                    <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <div className="flex-1">
                    <div className="whitespace-pre-line">{message.content}</div>
                    {message.actions && (
                      <div className="mt-3 space-y-2">
                        {message.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className="block w-full text-left px-3 py-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors border border-gray-200 dark:border-gray-500"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* タイピングインジケーター */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <ComputerDesktopIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* クイック返信 */}
        <AnimatePresence>
          {showQuickReplies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-2 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                よくある質問:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map(reply => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 入力エリア */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder="メッセージを入力..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim()}
                className={`
                  absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all
                  ${
                    inputValue.trim()
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 人間サポートへのエスカレーション */}
          <div className="mt-3 text-center">
            <button
              onClick={handleEscalate}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              人間のサポートスタッフと話す
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
