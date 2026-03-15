import { useRef } from 'react'
import { type NewsItem } from './NewsManager'

interface NewsSidebarProps {
  isOpen: boolean
  newsData: NewsItem[]
  activeNewsId: string | number | null
  limit: number
  onToggle: () => void
  onSelectNews: (item: NewsItem) => void
  onLimitChange: (limit: number) => void
}

export default function NewsSidebar({
  isOpen,
  newsData,
  activeNewsId,
  limit,
  onToggle,
  onSelectNews,
  onLimitChange,
}: NewsSidebarProps) {
  const itemRefs = useRef<Record<string | number, HTMLDivElement | null>>({});
  const sorted = [...newsData].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime());

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
          <span>实时新闻</span>
          <div className="limit-tabs">
            {[10, 20, 50].map(n => (
              <button
                key={n}
                className={`limit-tab ${limit === n ? 'active' : ''}`}
                onClick={() => onLimitChange(n)}
              >{n}</button>
            ))}
          </div>
        </div>
        <div className="news-sidebar-list">
          {sorted.map(item => (
            <div
              key={item.id}
              ref={el => { itemRefs.current[item.id] = el; }}
              className={`news-sidebar-item ${activeNewsId === item.id ? 'active' : ''}`}
              onClick={() => onSelectNews(item)}
            >
              <div className="news-item-time">{item.create_time}</div>
              <div className="news-item-title">{item.rich_text}</div>
              <div className="news-item-address">📍 {item.address}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
