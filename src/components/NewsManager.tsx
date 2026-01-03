import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Map from './Map'

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
      const { data } = await supabase
        .from('earth724')
        .select('*')
        .order('create_time', { ascending: false })
        .limit(60)
 
      if (data) setNews(data)
    }

    fetchInitialNews()

    const channel = supabase
      .channel('news_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'earth724' },
        (payload) => {
          const newNode = payload.new as NewsItem
          setNews((prev) => {
            if (prev.find(item => item.id === newNode.id)) return prev;
            const updatedNews = [newNode, ...prev];

            console.log('New news item received:', updatedNews);

            return updatedNews.slice(0, 60);
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return <Map newsData={news} />
}