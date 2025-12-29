import { useState, useEffect } from 'react';
import type { StatisticsFilter } from '../types';

const STORAGE_KEY = 'pomodoro-statistics-filter';

/**
 * 統計フィルターの状態管理フック
 * 要件2.4: フィルター状態の永続化
 */
export const useStatisticsFilter = () => {
  const getDefaultFilter = (): StatisticsFilter => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    return {
      dateRange: {
        start: startOfMonth,
        end: endOfMonth,
        preset: 'month',
      },
      tags: [],
      sessionTypes: ['pomodoro', 'short_break', 'long_break'],
      taskStatus: ['completed', 'in_progress', 'paused'],
    };
  };

  const loadFilterFromStorage = (): StatisticsFilter => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          dateRange: {
            ...parsed.dateRange,
            start: new Date(parsed.dateRange.start),
            end: new Date(parsed.dateRange.end),
          },
        };
      }
    } catch (error) {
      console.warn('フィルター設定の読み込みに失敗:', error);
    }
    return getDefaultFilter();
  };

  const [filter, setFilter] = useState<StatisticsFilter>(loadFilterFromStorage);

  // フィルター変更時にローカルストレージに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
    } catch (error) {
      console.warn('フィルター設定の保存に失敗:', error);
    }
  }, [filter]);

  const updateFilter = (newFilter: StatisticsFilter) => {
    setFilter(newFilter);
  };

  const resetFilter = () => {
    const defaultFilter = getDefaultFilter();
    setFilter(defaultFilter);
  };

  // フィルターに基づいてデータベースクエリのパラメータを生成
  const getFilterParams = () => {
    return {
      startDate: filter.dateRange.start.toISOString(),
      endDate: filter.dateRange.end.toISOString(),
      tags: filter.tags.length > 0 ? filter.tags : undefined,
      sessionTypes:
        filter.sessionTypes.length < 3 ? filter.sessionTypes : undefined,
      taskStatus: filter.taskStatus.length < 3 ? filter.taskStatus : undefined,
    };
  };

  // フィルターが適用されているかどうかを判定
  const hasActiveFilters = () => {
    const defaultFilter = getDefaultFilter();

    return (
      filter.dateRange.preset !== defaultFilter.dateRange.preset ||
      filter.tags.length > 0 ||
      filter.sessionTypes.length < 3 ||
      filter.taskStatus.length < 3
    );
  };

  return {
    filter,
    updateFilter,
    resetFilter,
    getFilterParams,
    hasActiveFilters,
  };
};
