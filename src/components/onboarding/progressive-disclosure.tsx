import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRightIcon,
  InformationCircleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface DisclosureItem {
  id: string;
  title: string;
  summary: string;
  details: React.ReactNode;
  level: 'beginner' | 'intermediate' | 'advanced';
  category: 'basic' | 'feature' | 'tip' | 'advanced';
  icon?: React.ComponentType<{ className?: string }>;
  showByDefault?: boolean;
}

interface ProgressiveDisclosureProps {
  items: DisclosureItem[];
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  className?: string;
}

const defaultItems: DisclosureItem[] = [
  {
    id: 'pomodoro-basics',
    title: 'ポモドーロテクニックとは',
    summary: '25分の集中作業と5分の休憩を繰り返す時間管理手法',
    details: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          ポモドーロテクニックは、1980年代後半にフランチェスコ・シリロによって開発された時間管理手法です。
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">基本的な流れ</h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>25分間集中して作業する</li>
            <li>5分間の短い休憩を取る</li>
            <li>これを4回繰り返す</li>
            <li>4回目の後は15-30分の長い休憩を取る</li>
          </ol>
        </div>
      </div>
    ),
    level: 'beginner',
    category: 'basic',
    icon: AcademicCapIcon,
    showByDefault: true,
  },
  {
    id: 'timer-controls',
    title: 'タイマーの操作方法',
    summary: 'タイマーの開始、一時停止、リセットの方法',
    details: (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">開始</h5>
            <p className="text-xs text-green-800 dark:text-green-200">
              プレイボタンをクリックしてタイマーを開始します
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">一時停止</h5>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ポーズボタンで一時停止、再度クリックで再開
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <h5 className="font-medium text-red-900 dark:text-red-100 mb-1">リセット</h5>
            <p className="text-xs text-red-800 dark:text-red-200">
              ストップボタンでタイマーをリセット
            </p>
          </div>
        </div>
      </div>
    ),
    level: 'beginner',
    category: 'basic',
    icon: InformationCircleIcon,
  },
  {
    id: 'task-integration',
    title: 'タスクとの連携',
    summary: 'タスクを作成してポモドーロセッションと関連付ける方法',
    details: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          タスクを作成することで、どの作業にどれだけの時間を費やしたかを追跡できます。
        </p>
        <div className="space-y-2">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-pomodoro-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">タスク管理ページでタスクを作成</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-pomodoro-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">タイマー開始時にタスクを選択</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-pomodoro-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">セッション完了後に進捗が自動記録</p>
          </div>
        </div>
      </div>
    ),
    level: 'intermediate',
    category: 'feature',
    icon: InformationCircleIcon,
  },
  {
    id: 'statistics-analysis',
    title: '統計と分析機能',
    summary: '作業時間や生産性の分析方法',
    details: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          統計ページでは、あなたの作業パターンや生産性を詳しく分析できます。
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-1">日別統計</h5>
            <p className="text-xs text-purple-800 dark:text-purple-200">
              日ごとの作業時間と完了セッション数
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <h5 className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">タスク分析</h5>
            <p className="text-xs text-indigo-800 dark:text-indigo-200">
              タスクごとの時間配分と完了率
            </p>
          </div>
        </div>
      </div>
    ),
    level: 'intermediate',
    category: 'feature',
    icon: InformationCircleIcon,
  },
  {
    id: 'productivity-tips',
    title: '生産性向上のコツ',
    summary: 'ポモドーロテクニックを効果的に活用するためのヒント',
    details: (
      <div className="space-y-3">
        <div className="space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3">
            <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              💡 休憩時間を有効活用
            </h5>
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              短い休憩では軽いストレッチや深呼吸、長い休憩では散歩や軽食を取りましょう。
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 p-3">
            <h5 className="font-medium text-green-900 dark:text-green-100 mb-1">
              🎯 タスクを細分化
            </h5>
            <p className="text-xs text-green-800 dark:text-green-200">
              大きなタスクは25分で完了できる小さな単位に分割しましょう。
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              🔕 集中環境を整える
            </h5>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              通知をオフにし、必要のないタブやアプリを閉じて集中できる環境を作りましょう。
            </p>
          </div>
        </div>
      </div>
    ),
    level: 'intermediate',
    category: 'tip',
    icon: LightBulbIcon,
  },
  {
    id: 'advanced-settings',
    title: '高度な設定とカスタマイズ',
    summary: 'タイマー時間の調整や通知設定のカスタマイズ',
    details: (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          設定ページでは、あなたの作業スタイルに合わせて詳細な調整が可能です。
        </p>
        <div className="space-y-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">タイマー時間の調整</h5>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              集中時間、休憩時間、長い休憩までのセッション数を自由に設定できます。
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">通知設定</h5>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              音声通知、デスクトップ通知、バイブレーションの有効/無効を設定できます。
            </p>
          </div>
        </div>
      </div>
    ),
    level: 'advanced',
    category: 'advanced',
    icon: CogIcon,
  },
];

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  items = defaultItems,
  userLevel = 'beginner',
  className = '',
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [visibilityLevel, setVisibilityLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(userLevel);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 初期表示項目の設定
  useEffect(() => {
    const defaultExpanded = items
      .filter(item => item.showByDefault)
      .map(item => item.id);
    setExpandedItems(new Set(defaultExpanded));
  }, [items]);

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

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  // レベルに応じたアイテムのフィルタリング
  const getVisibleItems = () => {
    const levelOrder = ['beginner', 'intermediate', 'advanced'];
    const maxLevelIndex = levelOrder.indexOf(visibilityLevel);
    
    return items.filter(item => {
      const itemLevelIndex = levelOrder.indexOf(item.level);
      return itemLevelIndex <= maxLevelIndex;
    });
  };

  // カテゴリ別のアイテムグループ化
  const groupedItems = getVisibleItems().reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, DisclosureItem[]>);

  const categoryLabels = {
    basic: '基本操作',
    feature: '機能紹介',
    tip: '活用のコツ',
    advanced: '高度な設定',
  };

  const categoryIcons = {
    basic: InformationCircleIcon,
    feature: CogIcon,
    tip: LightBulbIcon,
    advanced: CogIcon,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* レベル選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ヘルプ・ガイド
          </h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">表示レベル:</label>
            <select
              value={visibilityLevel}
              onChange={(e) => setVisibilityLevel(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="beginner">初心者</option>
              <option value="intermediate">中級者</option>
              <option value="advanced">上級者</option>
            </select>
          </div>
        </div>

        <button
          onClick={toggleAdvanced}
          className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          {showAdvanced ? (
            <>
              <EyeSlashIcon className="w-4 h-4" />
              <span>詳細を隠す</span>
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              <span>詳細を表示</span>
            </>
          )}
        </button>
      </div>

      {/* カテゴリ別表示 */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => {
          const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center space-x-2">
                <CategoryIcon className="w-5 h-5 text-pomodoro-500" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h4>
              </div>

              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const ItemIcon = item.icon || InformationCircleIcon;

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <ItemIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {item.title}
                              </h5>
                              {!isExpanded && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {item.summary}
                                </p>
                              )}
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
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
                            <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                              <div className="pt-4">
                                {item.details}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 追加情報（上級者向け） */}
      {showAdvanced && visibilityLevel === 'advanced' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-start space-x-3">
            <AcademicCapIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                さらなる学習リソース
              </h4>
              <div className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
                <p>• キーボードショートカット: スペースキーでタイマー開始/停止</p>
                <p>• データエクスポート: 統計データをCSV形式でダウンロード可能</p>
                <p>• カスタムテーマ: 設定でダークモード/ライトモードを切り替え</p>
                <p>• PWA対応: ホーム画面に追加してアプリのように使用可能</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};