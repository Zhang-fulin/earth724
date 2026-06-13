import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { type NewsItem } from './NewsManager'
import NewsSidebar from './NewsSidebar'
import { MAP_STYLE, ZOOM_BIG, ZOOM_SMALL, FLY_DURATION, SIDEBAR_WIDTH } from '../constants/map'
import { createPulsingDot, createStaticDot } from '../utils/mapDots'
import { getGeoJSON, TYPE_COLORS, NEWS_TYPES, ALL_TYPE, DEFAULT_TYPE, type NewsType } from '../utils/geoJSON'
import { createNightLayer } from '../utils/nightMask'
import './MapPopup.css'

interface MapProps {
  newsData: NewsItem[]
}

export default function Map({ newsData }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const newsDataRef = useRef(newsData);
  const activeNewsIdRef = useRef<string | number | null>(null);
  const activeTypeRef = useRef<NewsType>(ALL_TYPE);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNewsId, setActiveNewsId] = useState<string | number | null>(null);
  const [activeType, setActiveType] = useState<NewsType>(ALL_TYPE);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      zoom: ZOOM_BIG,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      maxTileCacheSize: 1000,
      doubleClickZoom: false,
    });

    const preventDefault = (e: MouseEvent) => e.preventDefault();
    containerRef.current.addEventListener('contextmenu', preventDefault);

    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      // 每种分类对应颜色的脉冲点
      const hexToRgb = (hex: string): [number, number, number] => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
      };

      const typeNames = NEWS_TYPES.filter(t => t !== ALL_TYPE);
      typeNames.forEach(type => {
        const rgb = hexToRgb(TYPE_COLORS[type]);
        map.addImage(`pulsing-${type}`, createPulsingDot(map, 100, rgb) as any, { pixelRatio: 2 });
        map.addImage(`static-${type}`, createStaticDot(100, rgb) as any, { pixelRatio: 2 });
      });

      map.addSource('news-points', {
        type: 'geojson',
        data: getGeoJSON(newsDataRef.current)
      });

      // 根据 type 选择对应颜色的点图片
      const typeImageMap = typeNames.flatMap(type => [
        ['==', ['get', 'type'], type], `pulsing-${type}`
      ]);
      const staticTypeImageMap = typeNames.flatMap(type => [
        ['==', ['get', 'type'], type], `static-${type}`
      ]);

      map.addLayer({
        id: 'news-points-layer',
        type: 'symbol',
        source: 'news-points',
        filter: ['==', ['get', 'selected'], 0],
        layout: {
          'icon-image': [
            'case',
            ['==', ['get', 'hasSelection'], 1],
            ['case', ...staticTypeImageMap, `static-${DEFAULT_TYPE}`],
            ['case', ...typeImageMap, `pulsing-${DEFAULT_TYPE}`]
          ] as any,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      map.addLayer({
        id: 'news-points-selected-layer',
        type: 'symbol',
        source: 'news-points',
        filter: ['==', ['get', 'selected'], 1],
        layout: {
          'icon-image': ['case', ...typeImageMap, `pulsing-${DEFAULT_TYPE}`] as any,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      map.setSky({
        'sky-color': '#050505',
        'horizon-color': '#242424',
        'sky-horizon-blend': 0.5,
      });

      // WebGL 夜晚渐变图层 - 添加在新闻点之前，确保在卫星图之上但在新闻点之下
      map.addLayer(createNightLayer(map) as any, 'news-points-layer');

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['news-points-layer'] });
        if (features.length === 0 && newsDataRef.current.length > 0) {
          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }
          const filtered = activeTypeRef.current === ALL_TYPE ? newsDataRef.current : newsDataRef.current.filter(item => item.type === activeTypeRef.current);
          if (filtered.length > 0) {
            const random = filtered[Math.floor(Math.random() * filtered.length)];
            map.flyTo({ center: [random.longitude, random.latitude], zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true });
          }
        }
      });

      const handlePointClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (activePopupRef.current) activePopupRef.current.remove();
        if (!e.features?.[0]) return;

        const { lng, lat, title, time, address, type } = e.features[0].properties;
        const coords = [lng, lat];
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
        }

        const formattedTime = time ? time.replace('T', ' ').slice(0, 19) : '';

        activePopupRef.current = new maplibregl.Popup({
          className: 'custom-news-popup',
          closeButton: false,
          maxWidth: '300px'
        })
          .setLngLat(coords as [number, number])
          .setHTML(`
            <div class="popup-content-wrapper">
              <div class="popup-header">
                <span class="popup-type" style="background:${TYPE_COLORS[type] || TYPE_COLORS[DEFAULT_TYPE]}">${type || DEFAULT_TYPE}</span>
                <span class="popup-time"><span class="icon">🕒</span> <span>${formattedTime}</span></span>
              </div>
              <div class="popup-title">${title}</div>
              <div class="popup-address"><span class="icon">📍</span> <span>${address}</span></div>
            </div>
          `).addTo(map);

        map.flyTo({ center: coords as [number, number], zoom: ZOOM_SMALL, duration: FLY_DURATION, essential: true });
      };

      map.on('click', 'news-points-layer', handlePointClick);
      map.on('click', 'news-points-selected-layer', handlePointClick);
    });

    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventDefault);
      activePopupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    newsDataRef.current = newsData;
    const source = mapRef.current?.getSource('news-points') as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(getGeoJSON(newsData, activeNewsIdRef.current));
  }, [newsData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const typeFilter = activeType === ALL_TYPE
      ? ['all']
      : ['==', ['get', 'type'], activeType];
    map.setFilter('news-points-layer', ['all', ['==', ['get', 'selected'], 0], typeFilter] as any);
    map.setFilter('news-points-selected-layer', ['all', ['==', ['get', 'selected'], 1], typeFilter] as any);
  }, [activeType]);

  const toggleSidebar = useCallback(() => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (!mapRef.current) return;

    const isMobile = window.innerWidth <= 600;
    const padding = isMobile
      ? { bottom: next ? window.innerHeight * 0.55 + 32 : 0 }
      : { right: next ? SIDEBAR_WIDTH + 32 : 0 };

    if (!next && activeNewsIdRef.current) {
      activeNewsIdRef.current = null;
      setActiveNewsId(null);
      const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
      if (source) source.setData(getGeoJSON(newsDataRef.current, null));
      mapRef.current.easeTo({ zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true, padding });
    } else {
      mapRef.current.easeTo({ padding, duration: FLY_DURATION });
    }
  }, [sidebarOpen]);

  const handleTypeChange = useCallback((type: NewsType) => {
    setActiveType(type);
    activeTypeRef.current = type;
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    if (!mapRef.current) return;
    const filtered = type === ALL_TYPE ? newsDataRef.current : newsDataRef.current.filter(item => item.type === type);
    if (filtered.length > 0) {
      const random = filtered[Math.floor(Math.random() * filtered.length)];
      mapRef.current.flyTo({ center: [random.longitude, random.latitude], zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true });
    }
  }, []);

  const handleSelectNews = useCallback((item: NewsItem) => {
    setActiveNewsId(item.id);
    activeNewsIdRef.current = item.id;
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
    if (source) source.setData(getGeoJSON(newsDataRef.current, item.id));
    mapRef.current.flyTo({ center: [item.longitude, item.latitude], zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true });
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} className="fullscreen-map" style={{ width: '100%', height: '100vh' }} />
      <NewsSidebar
        isOpen={sidebarOpen}
        newsData={newsData}
        activeNewsId={activeNewsId}
        activeType={activeType}
        onToggle={toggleSidebar}
        onSelectNews={handleSelectNews}
        onTypeChange={handleTypeChange}
      />
    </div>
  );
}
