import React, { useState, useEffect } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { DatabaseService } from '../../services/database-service';
import type { StatisticsFilter, Tag } from '../../types';

interface StatisticsFilterProps {
  filter: StatisticsFilter;
  onFilterChange: (filter: StatisticsFilter) => void;
  onReset: () => void;
}

/**
 * 統計フィルターコンポーネント
 * 要件2.2, 2.4: 統計フィルタリング機能の実装
 */
export const StatisticsFilterComponent: React.FC<StatisticsFilterProps> = ({
  filter,
  onFilterChange,
  onReset,
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await DatabaseService.getTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error('タグ取得エラー:', err);
      }
    };

    fetchTags();
  }, []);

  const handleDatePresetChange = (
    preset: 'today' | 'week' | 'month' | 'custom'
  ) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case 'today':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        setShowCustomDateRange(true);
        return;
    }

    onFilterChange({
      ...filter,
      dateRange: {
        start,
        end,
        preset,
      },
    });
    setShowCustomDateRange(false);
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    const date = new Date(value);
    if (field === 'start') {
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(23, 59, 59, 999);
    }

    onFilterChange({
      ...filter,
      dateRange: {
        ...filter.dateRange,
        [field]: date,
        preset: 'custom',
      },
    });
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = filter.tags.includes(tagId)
      ? filter.tags.filter(id => id !== tagId)
      : [...filter.tags, tagId];

    onFilterChange({
      ...filter,
      tags: newTags,
    });
  };

  const handleSessionTypeToggle = (
    type: 'pomodoro' | 'short_break' | 'long_break'
  ) => {
    const newTypes = filter.sessionTypes.includes(type)
      ? filter.sessionTypes.filter(t => t !== type)
      : [...filter.sessionTypes, type];

    onFilterChange({
      ...filter,
      sessionTypes: newTypes,
    });
  };

  const handleTaskStatusToggle = (
    status: 'completed' | 'in_progress' | 'paused'
  ) => {
    const newStatuses = filter.taskStatus.includes(status)
      ? filter.taskStatus.filter(s => s !== status)
      : [...filter.taskStatus, status];

    onFilterChange({
      ...filter,
      taskStatus: newStatuses,
    });
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filter.dateRange.preset !== 'month') count++; // デフォルトが月間以外の場合
    if (filter.tags.length > 0) count++;
    if (filter.sessionTypes.length < 3) count++; // 全選択でない場合
    if (filter.taskStatus.length < 3) count++; // 全選択でない場合
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            フィルター
          </h3>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
              {activeFiltersCount}個適用中
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onReset}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            data-testid="reset-filters-button"
          >
            リセット
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            data-testid="toggle-filters-button"
          >
            {isExpanded ? '折りたたむ' : '展開'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* 日付範囲選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              期間
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[
                { key: 'today', label: '今日' },
                { key: 'week', label: '今週' },
                { key: 'month', label: '今月' },
                { key: 'custom', label: 'カスタム' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleDatePresetChange(key as any)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border ${
                    filter.dateRange.preset === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  data-testid={`date-preset-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(showCustomDateRange || filter.dateRange.preset === 'custom') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={formatDate(filter.dateRange.start)}
                    onChange={e =>
                      handleCustomDateChange('start', e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    data-testid="custom-date-start"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={formatDate(filter.dateRange.end)}
                    onChange={e =>
                      handleCustomDateChange('end', e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    data-testid="custom-date-end"
                  />
                </div>
              </div>
            )}
          </div>

          {/* タグフィルター */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                タグ
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 text-sm rounded-full border ${
                      filter.tags.includes(tag.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    style={{
                      borderColor: filter.tags.includes(tag.id)
                        ? tag.color
                        : undefined,
                    }}
                    data-testid={`filter-tag-${tag.name}`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* セッションタイプフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              セッションタイプ
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'pomodoro', label: 'ポモドーロ', color: 'bg-red-500' },
                {
                  key: 'short_break',
                  label: '短い休憩',
                  color: 'bg-green-500',
                },
                { key: 'long_break', label: '長い休憩', color: 'bg-blue-500' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => handleSessionTypeToggle(key as any)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border ${
                    filter.sessionTypes.includes(key as any)
                      ? `${color} text-white border-transparent`
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  data-testid={`filter-session-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* タスクステータスフィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タスクステータス
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'completed', label: '完了', color: 'bg-green-600' },
                { key: 'in_progress', label: '進行中', color: 'bg-yellow-600' },
                { key: 'paused', label: '一時停止', color: 'bg-gray-600' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => handleTaskStatusToggle(key as any)}
                  className={`px-3 py-2 text-sm font-medium rounded-md border ${
                    filter.taskStatus.includes(key as any)
                      ? `${color} text-white border-transparent`
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  data-testid={`filter-status-${key}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 現在のフィルター状況の表示 */}
      {!isExpanded && activeFiltersCount > 0 && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex flex-wrap gap-2">
            {filter.dateRange.preset !== 'month' && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                期間:{' '}
                {filter.dateRange.preset === 'today'
                  ? '今日'
                  : filter.dateRange.preset === 'week'
                    ? '今週'
                    : filter.dateRange.preset === 'custom'
                      ? 'カスタム'
                      : '今月'}
              </span>
            )}
            {filter.tags.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                タグ: {filter.tags.length}個
              </span>
            )}
            {filter.sessionTypes.length < 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">
                セッション: {filter.sessionTypes.length}種類
              </span>
            )}
            {filter.taskStatus.length < 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300">
                ステータス: {filter.taskStatus.length}種類
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
