import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { NewsItem } from '../types'
import { MAP_STYLE, ZOOM_BIG, ZOOM_SMALL, FLY_DURATION } from '../constants/map'
import { createPulsingDot } from '../utils/mapDots'
import { getGeoJSON, TYPE_COLORS, NEWS_TYPES, ALL_TYPE, DEFAULT_TYPE } from '../utils/geoJSON'
import { createNightLayer } from '../utils/nightMask'
import './MapPopup.css'

interface MapProps {
  newsData: NewsItem[]
  mapRef: React.RefObject<maplibregl.Map | null>
  sidebarOpen?: boolean
}

export default function Map({ newsData, mapRef, sidebarOpen }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const prevDataLenRef = useRef(0);
  const sidebarOpenRef = useRef(sidebarOpen);
  sidebarOpenRef.current = sidebarOpen;

  // 初始化地图（仅一次）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
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
    mapRef.current = map;

    const preventDefault = (e: MouseEvent) => e.preventDefault();
    containerRef.current.addEventListener('contextmenu', preventDefault);

    map.on('style.load', () => {
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
      });

      map.addSource('news-points', {
        type: 'geojson',
        data: getGeoJSON([])
      });

      const typeImageMap = typeNames.flatMap(type => [
        ['==', ['get', 'type'], type], `pulsing-${type}`
      ]);

      map.addLayer({
        id: 'news-points-layer',
        type: 'symbol',
        source: 'news-points',
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

      map.addLayer(createNightLayer(map) as any, 'news-points-layer');

      // 点击新闻点 → 弹窗 + 飞过去
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

      // 点击空白区域 → 回到初始缩放（侧边栏打开时不触发）
      map.on('click', (e) => {
        if (sidebarOpenRef.current) return;
        const features = map.queryRenderedFeatures(e.point, { layers: ['news-points-layer'] });
        if (features.length === 0) {
          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }
          map.flyTo({ zoom: ZOOM_BIG, duration: FLY_DURATION, essential: true });
        }
      });
    });

    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventDefault);
      activePopupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // newsData 变化 → 更新 source + 清除弹窗
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('news-points') as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(getGeoJSON(newsData));

    // 有新数据时清除弹窗
    if (newsData.length !== prevDataLenRef.current && activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    prevDataLenRef.current = newsData.length;
  }, [newsData]);

  return (
    <div ref={containerRef} className="fullscreen-map" style={{ width: '100%', height: '100vh' }} />
  );
}
