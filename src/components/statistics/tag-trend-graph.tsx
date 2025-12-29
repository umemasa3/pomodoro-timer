import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../../services/database-service';

interface TagTrendData {
  trendData: Array<{
    date: string;
    tagData: Record<string, number>;
  }>;
  tagList: Array<{
    tagName: string;
    tagColor: string;
    totalHours: number;
  }>;
}

/**
 * タグ別時間推移グラフコンポーネント
 * 要件3.20: タグ別の時間推移グラフ表示
 */
export const TagTrendGraph: React.FC = () => {
  const [trendData, setTrendData] = useState<TagTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [visibleTags, setVisibleTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getTagTrendData(selectedPeriod);
        setTrendData(data);

        // 上位5つのタグを初期表示対象とする
        const topTags = data.tagList.slice(0, 5).map(tag => tag.tagName);
        setVisibleTags(new Set(topTags));

        setError(null);
      } catch (err) {
        console.error('タグ推移データの取得に失敗:', err);
        setError('タグ推移データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [selectedPeriod]);

  const toggleTagVisibility = (tagName: string) => {
    const newVisibleTags = new Set(visibleTags);
    if (newVisibleTags.has(tagName)) {
      newVisibleTags.delete(tagName);
    } else {
      newVisibleTags.add(tagName);
    }
    setVisibleTags(newVisibleTags);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タグ別時間推移
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !trendData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タグ別時間推移
        </h3>
        <div className="text-red-600 dark:text-red-400">
          タグ推移データの取得に失敗しました
        </div>
      </div>
    );
  }

  // データが空の場合の処理を追加
  if (trendData.trendData.length === 0 || trendData.tagList.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            タグ別時間推移
          </h3>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value={7}>過去7日</option>
            <option value={14}>過去14日</option>
            <option value={30}>過去30日</option>
            <option value={90}>過去90日</option>
          </select>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            表示するデータがありません
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            タスクにタグを設定して作業を開始してください
          </div>
        </div>
      </div>
    );
  }

  // 簡易的な線グラフの描画（SVGを使用）
  const GraphSVG: React.FC = () => {
    const width = 800;
    const height = 300;
    const padding = 60;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // 日付の範囲を計算
    const dates = trendData.trendData.map(d => d.date).sort();
    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);
    const dateRange = maxDate.getTime() - minDate.getTime();

    // 最大値を計算
    const maxValue = Math.max(
      ...trendData.trendData.flatMap(d =>
        d.tagData ? Object.values(d.tagData).filter(v => v > 0) : []
      ),
      1
    );

    // 色のパレット
    const colors = [
      '#3B82F6',
      '#EF4444',
      '#10B981',
      '#F59E0B',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
      '#F97316',
      '#6366F1',
    ];

    const getTagColor = (tagName: string): string => {
      const tag = trendData.tagList.find(t => t.tagName === tagName);
      if (tag && tag.tagColor) {
        return tag.tagColor;
      }
      const index = trendData.tagList.findIndex(t => t.tagName === tagName);
      return colors[index % colors.length];
    };

    // 座標変換関数
    const getX = (date: string): number => {
      const dateTime = new Date(date).getTime();
      if (isNaN(dateTime) || dateRange === 0) return padding;
      const ratio = (dateTime - minDate.getTime()) / dateRange;
      return padding + ratio * graphWidth;
    };

    const getY = (value: number): number => {
      if (isNaN(value) || maxValue === 0) return height - padding;
      const ratio = value / maxValue;
      return height - padding - ratio * graphHeight;
    };

    // 可視化対象のタグのパスを生成
    const visibleTagsArray = Array.from(visibleTags);

    return (
      <div className="w-full overflow-x-auto">
        <svg
          width={width}
          height={height}
          className="border rounded"
          role="img"
          aria-label="タグ別時間推移グラフ"
        >
          {/* グリッド線 */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 30"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Y軸ラベル */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - padding - ratio * graphHeight;
            const value = Math.round(maxValue * ratio * 10) / 10;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#d1d5db"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                >
                  {value}h
                </text>
              </g>
            );
          })}

          {/* X軸ラベル（週ごと） */}
          {dates
            .filter((_, index) => index % 7 === 0)
            .map(date => {
              const x = getX(date);
              return (
                <g key={date}>
                  <line
                    x1={x}
                    y1={padding}
                    x2={x}
                    y2={height - padding}
                    stroke="#d1d5db"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - padding + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {new Date(date).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </text>
                </g>
              );
            })}

          {/* タグ別の線グラフ */}
          {visibleTagsArray.map(tagName => {
            const color = getTagColor(tagName);
            const points = trendData.trendData
              .map(d => ({
                x: getX(d.date),
                y: getY((d.tagData[tagName] || 0) / 60), // 分を時間に変換
              }))
              .filter(
                p =>
                  !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y)
              );

            if (points.length < 2) return null;

            const pathData = points
              .map(
                (point, index) =>
                  `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              )
              .join(' ');

            return (
              <g key={tagName}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* データポイント */}
                {points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      data-testid="tag-trend-graph"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          タグ別時間推移
        </h3>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value={7}>過去7日</option>
          <option value={14}>過去14日</option>
          <option value={30}>過去30日</option>
          <option value={90}>過去90日</option>
        </select>
      </div>

      {/* グラフ */}
      <div className="mb-6">
        <GraphSVG />
      </div>

      {/* タグ選択 */}
      <div className="space-y-4" data-testid="trend-legend">
        <h4 className="font-medium text-gray-900 dark:text-white">
          表示するタグを選択
        </h4>
        <div className="flex flex-wrap gap-2">
          {trendData.tagList.map(tag => (
            <button
              key={tag.tagName}
              onClick={() => toggleTagVisibility(tag.tagName)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                visibleTags.has(tag.tagName)
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: tag.tagColor || '#6B7280' }}
              ></div>
              {tag.tagName}
              <span className="ml-2 text-xs opacity-75">
                ({tag.totalHours}h)
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          📊 期間内統計
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">総作業時間</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {Math.round(
                trendData.tagList.reduce(
                  (sum, tag) => sum + tag.totalHours,
                  0
                ) * 10
              ) / 10}
              h
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">
              アクティブタグ数
            </span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {trendData.tagList.filter(tag => tag.totalHours > 0).length}個
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">
              最も使用されたタグ
            </span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {trendData.tagList[0]?.tagName || 'なし'}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">1日平均</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {Math.round(
                (trendData.tagList.reduce(
                  (sum, tag) => sum + tag.totalHours,
                  0
                ) /
                  selectedPeriod) *
                  10
              ) / 10}
              h
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
