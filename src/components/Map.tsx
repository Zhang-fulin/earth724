import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type NewsItem } from './NewsManager'
import NewsSidebar from './NewsSidebar'
import { MAP_STYLE, ZOOM_BIG, ZOOM_SMALL, FLY_DURATION, SIDEBAR_WIDTH } from '../constants/map'
import { createPulsingDot, createStaticDot } from '../utils/mapDots'
import { getGeoJSON } from '../utils/geoJSON'
import './MapPopup.css'

interface MapProps {
  newsData: NewsItem[]
  limit: number
  onLimitChange: (limit: number) => void
}

export default function Map({ newsData, limit, onLimitChange }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const newsDataRef = useRef(newsData);
  const activeNewsIdRef = useRef<string | number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNewsId, setActiveNewsId] = useState<string | number | null>(null);

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

      map.addImage('pulsing-dot', createPulsingDot(map, 100, [220, 50, 50]) as any, { pixelRatio: 2 });
      map.addImage('pulsing-dot-blue', createPulsingDot(map, 100, [30, 140, 255], 1200) as any, { pixelRatio: 2 });
      map.addImage('static-dot', createStaticDot(100, [220, 50, 50]) as any, { pixelRatio: 2 });

      map.addSource('news-points', {
        type: 'geojson',
        data: getGeoJSON(newsDataRef.current)
      });

      map.addLayer({
        id: 'news-points-layer',
        type: 'symbol',
        source: 'news-points',
        filter: ['==', ['get', 'selected'], 0],
        layout: {
          'icon-image': ['case', ['==', ['get', 'hasSelection'], 1], 'static-dot', 'pulsing-dot'],
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
          'icon-image': 'pulsing-dot-blue',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      map.setSky({
        'sky-color': '#050505',
        'horizon-color': '#242424',
        'sky-horizon-blend': 0.5,
      });

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['news-points-layer'] });
        if (features.length === 0 && newsDataRef.current.length > 0) {
          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }
          const random = newsDataRef.current[Math.floor(Math.random() * newsDataRef.current.length)];
          map.flyTo({ center: [random.longitude, random.latitude], zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true });
        }
      });

      const handlePointClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (activePopupRef.current) activePopupRef.current.remove();
        if (!e.features?.[0]) return;

        const { lng, lat, title, time, address } = e.features[0].properties;
        const coords = [lng, lat];
        while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
          coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
        }

        activePopupRef.current = new maplibregl.Popup({
          className: 'custom-news-popup',
          closeButton: false,
          maxWidth: '300px'
        })
          .setLngLat(coords as [number, number])
          .setHTML(`
            <div class="popup-content-wrapper">
              <div class="popup-time"><span class="icon">🕒</span> <span>${time}</span></div>
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

  const toggleSidebar = () => {
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
  };

  const handleSelectNews = (item: NewsItem) => {
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
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} className="fullscreen-map" style={{ width: '100%', height: '100vh' }} />
      <NewsSidebar
        isOpen={sidebarOpen}
        newsData={newsData}
        activeNewsId={activeNewsId}
        limit={limit}
        onToggle={toggleSidebar}
        onSelectNews={handleSelectNews}
        onLimitChange={onLimitChange}
      />
    </div>
  );
}
