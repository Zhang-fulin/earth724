import { type NewsItem } from '../components/NewsManager'

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
      address: item.address,
      lng: item.longitude,
      lat: item.latitude,
      id: item.id,
      selected: item.id === selectedId ? 1 : 0,
      hasSelection: selectedId !== null ? 1 : 0
    }
  }))
});
