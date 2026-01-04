import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Map from './Map'

const messagecounter = 20;

export interface NewsItem {
  id: string | number;
  rich_text: string;
  create_time: string;
  address: string;
  latitude: number;
  longitude: number; 
}

export default function NewsManager() {
  const [news, setNews] = useState<NewsItem[]>([])

  useEffect(() => {
    const fetchInitialNews = async () => {
      const { data, error } = await supabase
        .from('earth724')
        .select('*')
        .order('create_time', { ascending: false })
        .limit(messagecounter);
      console.log('Initial news data fetched:', data, error);
      if (data) setNews(data)
    }

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

            const updatedNews = [newNode, ...prev];

            console.log('New news item received:', updatedNews);
            return updatedNews.slice(0, messagecounter);
          })
        }
      )
      .subscribe(
        (status) => {
          console.log('[Realtime] Channel subscribed:', status);
          if (status === 'SUBSCRIBED') {
            fetchInitialNews();
          }
        }
      )

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <Map newsData={news} />
}