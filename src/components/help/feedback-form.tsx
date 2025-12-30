import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  StarIcon,
  BugAntIcon,
  LightBulbIcon,
  HeartIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (feedback: FeedbackData) => Promise<void>;
}

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  rating?: number;
  title: string;
  description: string;
  email?: string;
  includeSystemInfo: boolean;
  systemInfo?: {
    userAgent: string;
    url: string;
    timestamp: string;
    userId?: string;
  };
}

const feedbackTypes = [
  {
    id: 'bug' as const,
    label: 'バグ報告',
    description: '動作しない機能や予期しない動作について',
    icon: BugAntIcon,
    color: 'red',
  },
  {
    id: 'feature' as const,
    label: '機能要望',
    description: '新しい機能のアイデアや提案',
    icon: LightBulbIcon,
    color: 'yellow',
  },
  {
    id: 'improvement' as const,
    label: '改善提案',
    description: '既存機能の改善や使いやすさの向上',
    icon: StarIcon,
    color: 'blue',
  },
  {
    id: 'general' as const,
    label: '一般的な感想',
    description: 'アプリ全体に対する感想やコメント',
    icon: HeartIcon,
    color: 'pink',
  },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [step, setStep] = useState<'type' | 'details' | 'success'>('type');
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type'] | null>(
    null
  );
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setStep('type');
    setFeedbackType(null);
    setRating(0);
    setTitle('');
    setDescription('');
    setEmail('');
    setIncludeSystemInfo(true);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type: FeedbackData['type']) => {
    setFeedbackType(type);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!feedbackType || !title.trim() || !description.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackData = {
        type: feedbackType,
        rating: rating > 0 ? rating : undefined,
        title: title.trim(),
        description: description.trim(),
        email: email.trim() || undefined,
        includeSystemInfo,
        systemInfo: includeSystemInfo
          ? {
              userAgent: navigator.userAgent,
              url: window.location.href,
              timestamp: new Date().toISOString(),
            }
          : undefined,
      };

      if (onSubmit) {
        await onSubmit(feedbackData);
      } else {
        // デフォルトの処理（ローカルストレージに保存）
        const existingFeedback = JSON.parse(
          localStorage.getItem('user-feedback') || '[]'
        );
        existingFeedback.push({
          ...feedbackData,
          id: Date.now().toString(),
          submittedAt: new Date().toISOString(),
        });
        localStorage.setItem('user-feedback', JSON.stringify(existingFeedback));
      }

      setStep('success');
    } catch (error) {
      console.error('フィードバック送信エラー:', error);
      // エラーハンドリング（実際の実装では適切なエラー表示）
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = feedbackTypes.find(type => type.id === feedbackType);

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                フィードバック
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {step === 'type' && 'フィードバックの種類を選択してください'}
                {step === 'details' &&
                  selectedType &&
                  `${selectedType.label}の詳細`}
                {step === 'success' && 'フィードバックを送信しました'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {feedbackTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <motion.button
                      key={type.id}
                      onClick={() => handleTypeSelect(type.id)}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-lg
                        border-gray-200 dark:border-gray-700 hover:border-${type.color}-300 dark:hover:border-${type.color}-600
                        bg-white dark:bg-gray-800 hover:bg-${type.color}-50 dark:hover:bg-${type.color}-900/20
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`p-3 bg-${type.color}-100 dark:bg-${type.color}-900/30 rounded-lg`}
                        >
                          <Icon
                            className={`w-6 h-6 text-${type.color}-600 dark:text-${type.color}-400`}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {type.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {step === 'details' && selectedType && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* 選択されたタイプの表示 */}
                <div
                  className={`p-4 bg-${selectedType.color}-50 dark:bg-${selectedType.color}-900/20 rounded-lg border border-${selectedType.color}-200 dark:border-${selectedType.color}-800`}
                >
                  <div className="flex items-center space-x-3">
                    <selectedType.icon
                      className={`w-5 h-5 text-${selectedType.color}-600 dark:text-${selectedType.color}-400`}
                    />
                    <span
                      className={`font-medium text-${selectedType.color}-900 dark:text-${selectedType.color}-100`}
                    >
                      {selectedType.label}
                    </span>
                  </div>
                </div>

                {/* 評価（一般的な感想の場合のみ） */}
                {feedbackType === 'general' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      アプリの評価をお聞かせください
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1 transition-colors"
                        >
                          {star <= rating ? (
                            <StarIconSolid className="w-8 h-8 text-yellow-400" />
                          ) : (
                            <StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 hover:text-yellow-400" />
                          )}
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          {rating} / 5
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* タイトル */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    タイトル *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder={
                      feedbackType === 'bug'
                        ? '例: タイマーが開始されない'
                        : feedbackType === 'feature'
                          ? '例: タスクの並び替え機能'
                          : feedbackType === 'improvement'
                            ? '例: 統計画面の改善'
                            : '例: 使いやすいアプリです'
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* 詳細 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    詳細 *
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder={
                      feedbackType === 'bug'
                        ? '問題の詳細、再現手順、期待される動作などを記載してください'
                        : feedbackType === 'feature'
                          ? '機能の詳細、使用場面、期待される効果などを記載してください'
                          : feedbackType === 'improvement'
                            ? '現在の問題点、改善案、期待される効果などを記載してください'
                            : 'アプリに対する感想、気づいた点などを自由に記載してください'
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* メールアドレス（任意） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    メールアドレス（任意）
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="返信が必要な場合はご入力ください"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* システム情報の送信 */}
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="includeSystemInfo"
                    checked={includeSystemInfo}
                    onChange={e => setIncludeSystemInfo(e.target.checked)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div>
                    <label
                      htmlFor="includeSystemInfo"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      システム情報を含める
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ブラウザ情報、URL、タイムスタンプを含めることで、問題の特定に役立ちます
                    </p>
                  </div>
                </div>

                {/* ボタン */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStep('type')}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    戻る
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={
                      !title.trim() || !description.trim() || isSubmitting
                    }
                    className={`
                      flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
                      ${
                        !title.trim() || !description.trim() || isSubmitting
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
                      }
                    `}
                    whileHover={
                      !title.trim() || !description.trim() || isSubmitting
                        ? {}
                        : { scale: 1.02 }
                    }
                    whileTap={
                      !title.trim() || !description.trim() || isSubmitting
                        ? {}
                        : { scale: 0.98 }
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>送信中...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-5 h-5" />
                        <span>送信</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center py-8"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4">
                  <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  フィードバックを送信しました
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  貴重なご意見をありがとうございます。
                  <br />
                  今後のアプリ改善に活用させていただきます。
                </p>
                <motion.button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  閉じる
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
