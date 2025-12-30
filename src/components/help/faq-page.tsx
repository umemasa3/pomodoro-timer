import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  ListBulletIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

interface FAQItem {
  id: string;
  question: string;
  answer: React.ReactNode;
  category:
    | 'basic'
    | 'timer'
    | 'tasks'
    | 'statistics'
    | 'settings'
    | 'troubleshooting';
  tags: string[];
  popularity: number;
}

interface FAQPageProps {
  className?: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'what-is-pomodoro',
    question: 'ポモドーロテクニックとは何ですか？',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          ポモドーロテクニックは、25分間の集中作業と5分間の休憩を繰り返す時間管理手法です。
          1980年代後半にフランチェスコ・シリロによって開発されました。
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            基本的な流れ
          </h5>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>25分間集中して作業する（1ポモドーロ）</li>
            <li>5分間の短い休憩を取る</li>
            <li>これを4回繰り返す</li>
            <li>4回目の後は15-30分の長い休憩を取る</li>
          </ol>
        </div>
      </div>
    ),
    category: 'basic',
    tags: ['ポモドーロ', '基本', '時間管理'],
    popularity: 10,
  },
  {
    id: 'timer-not-starting',
    question: 'タイマーが開始されません',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          タイマーが開始されない場合、以下の点を確認してください：
        </p>
        <div className="space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3">
            <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              よくある原因
            </h5>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• ブラウザのタブがバックグラウンドになっている</li>
              <li>• JavaScriptが無効になっている</li>
              <li>• ブラウザの拡張機能が干渉している</li>
            </ul>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-3">
            <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">
              解決方法
            </h5>
            <ol className="text-sm text-green-800 dark:text-green-200 space-y-1 list-decimal list-inside">
              <li>ページを再読み込みしてみる</li>
              <li>他のブラウザで試してみる</li>
              <li>拡張機能を一時的に無効にする</li>
              <li>ブラウザのキャッシュをクリアする</li>
            </ol>
          </div>
        </div>
      </div>
    ),
    category: 'troubleshooting',
    tags: ['タイマー', 'トラブル', '開始できない'],
    popularity: 8,
  },
  {
    id: 'notification-not-working',
    question: '通知が表示されません',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          通知が表示されない場合の対処法：
        </p>
        <div className="space-y-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              ブラウザ設定の確認
            </h5>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>ブラウザのアドレスバー左側の鍵アイコンをクリック</li>
              <li>「通知」の設定を「許可」に変更</li>
              <li>ページを再読み込み</li>
            </ol>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <h5 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
              OS設定の確認
            </h5>
            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
              <li>• Windows: 設定 &gt; システム &gt; 通知とアクション</li>
              <li>• Mac: システム環境設定 &gt; 通知</li>
              <li>• ブラウザからの通知が有効になっているか確認</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    category: 'troubleshooting',
    tags: ['通知', 'デスクトップ通知', 'トラブル'],
    popularity: 7,
  },
  {
    id: 'data-not-saving',
    question: 'データが保存されません',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          データが保存されない場合の確認事項：
        </p>
        <div className="space-y-3">
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-3">
            <h5 className="font-medium text-red-900 dark:text-red-100 mb-1">
              緊急対応
            </h5>
            <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
              <li>• 作業中のデータをメモ帳などにバックアップ</li>
              <li>• ブラウザを閉じる前に手動でエクスポート</li>
            </ul>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              原因と対処法
            </h5>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• ネットワーク接続を確認</li>
              <li>• ブラウザのローカルストレージ制限を確認</li>
              <li>• プライベートブラウジングモードを無効にする</li>
              <li>• アカウントにログインしているか確認</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    category: 'troubleshooting',
    tags: ['データ', '保存', 'ローカルストレージ'],
    popularity: 6,
  },
  {
    id: 'custom-timer-duration',
    question: 'タイマーの時間を変更できますか？',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          はい、タイマーの時間は自由にカスタマイズできます。
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
            設定方法
          </h5>
          <ol className="text-sm text-green-800 dark:text-green-200 space-y-1 list-decimal list-inside">
            <li>右上のユーザーメニューから「設定」を選択</li>
            <li>「タイマー設定」セクションを開く</li>
            <li>集中時間、短い休憩、長い休憩の時間を調整</li>
            <li>「保存」ボタンをクリック</li>
          </ol>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
            おすすめ設定
          </h5>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• 初心者: 15分集中 / 5分休憩</li>
            <li>• 標準: 25分集中 / 5分休憩</li>
            <li>• 上級者: 50分集中 / 10分休憩</li>
          </ul>
        </div>
      </div>
    ),
    category: 'settings',
    tags: ['設定', 'タイマー', 'カスタマイズ'],
    popularity: 9,
  },
  {
    id: 'task-organization',
    question: 'タスクを効率的に整理する方法は？',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          効率的なタスク管理のコツをご紹介します：
        </p>
        <div className="space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
              タスクの分割
            </h5>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
              <li>• 大きなタスクは25分で完了できる小さな単位に分割</li>
              <li>• 具体的で測定可能な目標を設定</li>
              <li>• 「〜を完成させる」より「〜の概要を書く」</li>
            </ul>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              優先順位付け
            </h5>
            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              <li>• 重要度と緊急度で分類</li>
              <li>• 1日の始めに最重要タスクを特定</li>
              <li>• エネルギーの高い時間帯に難しいタスクを配置</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    category: 'tasks',
    tags: ['タスク', '整理', '効率化'],
    popularity: 8,
  },
  {
    id: 'statistics-understanding',
    question: '統計データをどう活用すればよいですか？',
    answer: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          統計データは継続的な改善のための貴重な情報源です：
        </p>
        <div className="space-y-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <h5 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">
              注目すべき指標
            </h5>
            <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1">
              <li>• 完了率の推移（週単位、月単位）</li>
              <li>• 最も生産性の高い時間帯</li>
              <li>• 中断が多い時間帯や曜日</li>
              <li>• タスクカテゴリ別の時間配分</li>
            </ul>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
              改善のヒント
            </h5>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• 完璧を目指さず、傾向を把握する</li>
              <li>• 週次で振り返りの時間を設ける</li>
              <li>• 小さな改善を積み重ねる</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    category: 'statistics',
    tags: ['統計', '分析', '改善'],
    popularity: 7,
  },
];

const categories = {
  basic: { label: '基本', icon: InformationCircleIcon, color: 'blue' },
  timer: { label: 'タイマー', icon: ClockIcon, color: 'green' },
  tasks: { label: 'タスク', icon: ListBulletIcon, color: 'purple' },
  statistics: { label: '統計', icon: ChartBarIcon, color: 'indigo' },
  settings: { label: '設定', icon: CogIcon, color: 'gray' },
  troubleshooting: {
    label: 'トラブル',
    icon: ExclamationTriangleIcon,
    color: 'red',
  },
};

export const FAQPage: React.FC<FAQPageProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 検索とフィルタリング
  const filteredItems = faqItems
    .filter(item => {
      const matchesSearch =
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => b.popularity - a.popularity);

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl">
            <QuestionMarkCircleIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          よくある質問
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          ポモドーロタイマーの使い方やトラブルシューティング
        </p>
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="質問やキーワードで検索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            すべて
          </button>
          {Object.entries(categories).map(([key, category]) => {
            const Icon = category.icon;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    selectedCategory === key
                      ? `bg-${category.color}-500 text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ項目 */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <QuestionMarkCircleIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              該当する質問が見つかりません
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              検索条件を変更するか、サポートにお問い合わせください
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedItems.has(item.id);
            const category = categories[item.category];
            const CategoryIcon = category.icon;

            return (
              <motion.div
                key={item.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div
                        className={`p-2 bg-${category.color}-100 dark:bg-${category.color}-900/30 rounded-lg flex-shrink-0`}
                      >
                        <CategoryIcon
                          className={`w-5 h-5 text-${category.color}-600 dark:text-${category.color}-400`}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {item.question}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-1 bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-700 dark:text-${category.color}-300 rounded-full`}
                          >
                            {category.label}
                          </span>
                          <div className="flex space-x-1">
                            {item.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-shrink-0 ml-4"
                    >
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="pt-4">{item.answer}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* フッター */}
      <div className="mt-12 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            解決しない問題がありますか？
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            お困りのことがございましたら、お気軽にサポートまでお問い合わせください
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg">
            サポートに問い合わせ
          </button>
        </div>
      </div>
    </div>
  );
};
