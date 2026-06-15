import React, { useState, useMemo, useEffect } from 'react'
import type { NewsItem } from '../types'
import { TYPE_COLORS, NEWS_TYPES, ALL_TYPE, DEFAULT_TYPE, type NewsType } from '../utils/geoJSON'

function formatTime(time: string): string {
  if (!time) return '';
  return time.replace('T', ' ').slice(0, 19);
}

interface NewsSidebarProps {
  isOpen: boolean
  newsData: NewsItem[]
  selectedId: NewsItem['id'] | null
  onToggle: () => void
  onSelectNews: (item: NewsItem) => void
  onDataChange: (filtered: NewsItem[]) => void
}

export default React.memo(function NewsSidebar({
  isOpen,
  newsData,
  selectedId,
  onToggle,
  onSelectNews,
  onDataChange,
}: NewsSidebarProps) {
  const [activeType, setActiveType] = useState<NewsType>(ALL_TYPE);

  // 侧边栏收起时重置为全部
  useEffect(() => {
    if (!isOpen) setActiveType(ALL_TYPE);
  }, [isOpen]);

  const filteredNews = useMemo(
    () => activeType === ALL_TYPE
      ? [...newsData].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
      : newsData.filter(item => item.type === activeType).sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime()),
    [newsData, activeType]
  );

  // 筛选结果变化 → 通知父组件 → 传给 Map
  useEffect(() => {
    onDataChange(filteredNews);
  }, [filteredNews]);

  // 切换分类或侧边栏收起时自动选中最新一条
  useEffect(() => {
    if (filteredNews.length > 0) onSelectNews(filteredNews[0]);
  }, [activeType, isOpen]);

  return (
    <>
      <button
        className={`sidebar-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label="Toggle news sidebar"
      >
        <span className="toggle-arrow-desktop">{isOpen ? '›' : '‹'}</span>
        <span className="toggle-arrow-mobile">{isOpen ? '↓' : '↑'}</span>
      </button>

      <div className={`news-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="news-sidebar-header">
          <div className="type-tabs">
            {NEWS_TYPES.map(type => (
              <button
                key={type}
                className={`type-tab ${activeType === type ? 'active' : ''}`}
                style={activeType === type ? { background: TYPE_COLORS[type] || TYPE_COLORS[DEFAULT_TYPE], borderColor: TYPE_COLORS[type] || TYPE_COLORS[DEFAULT_TYPE] } : undefined}
                onClick={() => setActiveType(type)}
              >{type}</button>
            ))}
          </div>
        </div>
        <div className="news-sidebar-list">
          {filteredNews.map(item => (
            <div
              key={item.id}
              className={`news-sidebar-item${selectedId === item.id ? ' active' : ''}`}
              onClick={() => onSelectNews(item)}
            >
              <div className="news-item-header">
                <span className="news-item-type" style={{ background: TYPE_COLORS[item.type || DEFAULT_TYPE] || TYPE_COLORS[DEFAULT_TYPE] }}>{item.type || DEFAULT_TYPE}</span>
                <span className="news-item-time">{formatTime(item.create_time)}</span>
              </div>
              <div className="news-item-title">{item.rich_text}</div>
              <div className="news-item-address">📍 {item.address}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
})
