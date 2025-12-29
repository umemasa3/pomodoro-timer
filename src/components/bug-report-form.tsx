import React from 'react';
import { BugAntIcon } from '@heroicons/react/24/outline';

/**
 * バグレポートフォームコンポーネント
 */
interface BugReportFormProps {
  onSubmit: (description: string) => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export const BugReportForm: React.FC<BugReportFormProps> = ({ onSubmit, isSubmitting, isSubmitted }) => {
  const [description, setDescription] = React.useState('');
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onSubmit(description.trim());
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <p className="text-sm text-green-800 dark:text-green-300 text-center">
          バグレポートを送信しました。ご協力ありがとうございます。
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-md">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <BugAntIcon className="w-4 h-4 mr-2" />
        バグを報告
      </button>
      
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 dark:border-gray-600">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="何をしていた時にエラーが発生しましたか？詳細を教えてください。"
            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end mt-2 space-x-2">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!description.trim() || isSubmitting}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors"
            >
              {isSubmitting ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};