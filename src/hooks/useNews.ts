import { useEffect, useState, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { supabase } from '../lib/supabase'
import { ZOOM_BIG, FLY_DURATION, SIDEBAR_WIDTH } from '../constants/map'
import type { NewsItem } from '../types'

export function useNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [displayData, setDisplayData] = useState<NewsItem[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<NewsItem['id'] | null>(null)
  const isFirstLoad = useRef(true);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sidebarOpenRef = useRef(false);

  useEffect(() => {
    const fetchNews = async () => {
      const { data } = await supabase
        .from('earth724')
        .select('*')
        .order('create_time', { ascending: false })
        .limit(100);
      if (data) setNews(data)
    }
    fetchNews()

    const channel = supabase
      .channel('news_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'earth724' },
        (payload) => {
          const newNode = payload.new as NewsItem
          setNews((prev) => {
            if (prev.some(item => item.id === newNode.id)) return prev;
            if (prev.length === 0) return [newNode];
            return [newNode, ...prev].slice(0, 100);
          })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (!isFirstLoad.current) fetchNews();
          isFirstLoad.current = false;
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleDataChange = useCallback((filtered: NewsItem[]) => {
    setDisplayData(filtered);
  }, []);

  const handleSelectNews = useCallback((item: NewsItem) => {
    setSelectedId(item.id);
    const map = mapRef.current;
    if (!map) return;
    const isMobile = window.innerWidth <= 600;
    const padding = sidebarOpen
      ? isMobile
        ? { bottom: window.innerHeight * 0.55 + 32, left: 0, top: 0, right: 0 }
        : { right: SIDEBAR_WIDTH + 32, left: 0, top: 0, bottom: 0 }
      : { left: 0, top: 0, right: 0, bottom: 0 };
    map.flyTo({ center: [item.longitude, item.latitude], zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true, padding });
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      sidebarOpenRef.current = next;
      const map = mapRef.current;
      if (map) {
        const isMobile = window.innerWidth <= 600;
        const padding = isMobile
          ? { bottom: next ? window.innerHeight * 0.55 + 32 : 0, left: 0, top: 0, right: 0 }
          : { right: next ? SIDEBAR_WIDTH + 32 : 0, left: 0, top: 0, bottom: 0 };
        map.easeTo({ padding, duration: 400 });
      }
      return next;
    });
  }, []);

  return {
    news,
    displayData,
    sidebarOpen,
    selectedId,
    mapRef,
    handleDataChange,
    handleSelectNews,
    toggleSidebar,
  }
}
