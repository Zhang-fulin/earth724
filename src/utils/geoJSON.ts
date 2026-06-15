import type { NewsItem } from '../types'

export const NEWS_TYPES_CONFIG = [
  { name: '全部', color: '#78909c' },
  { name: '政治', color: '#e53935' },
  { name: '经济', color: '#ff9800' },
  { name: '文化', color: '#ab47bc' },
  { name: '科技', color: '#2196f3' },
  { name: '体育', color: '#4caf50' },
  { name: '社会', color: '#0097a7' },
  { name: '军事', color: '#5d4037' },
  { name: '其他', color: '#9e9e9e' },
] as const;

export const NEWS_TYPES = NEWS_TYPES_CONFIG.map(t => t.name);
export type NewsType = typeof NEWS_TYPES_CONFIG[number]['name'];
export const TYPE_COLORS = Object.fromEntries(NEWS_TYPES_CONFIG.map(t => [t.name, t.color]));
export const ALL_TYPE = NEWS_TYPES_CONFIG[0].name;
export const DEFAULT_TYPE = NEWS_TYPES_CONFIG[NEWS_TYPES_CONFIG.length - 1].name;

export const getGeoJSON = (data: NewsItem[], selectedId: string | number | null = null): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: data.map(item => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [item.longitude, item.latitude]
    },
    properties: {
      title: item.rich_text,
      time: item.create_time,
      type: item.type || DEFAULT_TYPE,
      address: item.address,
      lng: item.longitude,
      lat: item.latitude,
      id: item.id,
      selected: item.id === selectedId ? 1 : 0,
      hasSelection: selectedId !== null ? 1 : 0
    }
  }))
});
