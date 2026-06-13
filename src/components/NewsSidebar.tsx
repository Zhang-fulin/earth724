import React, { useRef, useMemo } from 'react'
import { type NewsItem } from './NewsManager'
import { TYPE_COLORS, NEWS_TYPES, ALL_TYPE, DEFAULT_TYPE, type NewsType } from '../utils/geoJSON'

function formatTime(time: string): string {
  if (!time) return '';
  // 直接截取前19位: "2025-06-13T08:42:00" -> "2025-06-13 08:42:00"
  return time.replace('T', ' ').slice(0, 19);
}

interface NewsSidebarProps {
  isOpen: boolean
  newsData: NewsItem[]
  activeNewsId: string | number | null
  activeType: NewsType
  onToggle: () => void
  onSelectNews: (item: NewsItem) => void
  onTypeChange: (type: NewsType) => void
}

export default React.memo(function NewsSidebar({
  isOpen,
  newsData,
  activeNewsId,
  activeType,
  onToggle,
  onSelectNews,
  onTypeChange,
}: NewsSidebarProps) {
  const itemRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const sorted = useMemo(
    () => [...newsData].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime()),
    [newsData]
  );

  const filteredNews = useMemo(
    () => activeType === ALL_TYPE ? sorted : sorted.filter(item => item.type === activeType),
    [sorted, activeType]
  );

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
                onClick={() => onTypeChange(type)}
              >{type}</button>
            ))}
          </div>
        </div>
        <div className="news-sidebar-list">
          {filteredNews.map(item => (
            <div
              key={item.id}
              ref={el => { itemRefs.current[item.id] = el; }}
              className={`news-sidebar-item ${activeNewsId === item.id ? 'active' : ''}`}
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
