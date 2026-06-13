import React, { useRef, useMemo } from 'react'
import { type NewsItem } from './NewsManager'

const NEWS_TYPES = ['全部', '政治', '经济', '文化', '科技', '体育', '社会', '军事', '其他'] as const;
type NewsType = typeof NEWS_TYPES[number];

function formatTime(time: string): string {
  try {
    const date = new Date(time);
    if (isNaN(date.getTime())) return time;

    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return time;
  }
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
    () => activeType === '全部' ? sorted : sorted.filter(item => item.type === activeType),
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
                <span className="news-item-type">{item.type || '其他'}</span>
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
