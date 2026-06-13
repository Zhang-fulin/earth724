import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Map from './Map'

export interface NewsItem {
  id: string | number;
  rich_text: string;
  create_time: string;
  address: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export default function NewsManager() {
  const [news, setNews] = useState<NewsItem[]>([])
  const isFirstLoad = useRef(true);

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

  return <Map newsData={news} />
}