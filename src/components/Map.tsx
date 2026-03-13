import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type NewsItem } from './NewsManager'
import './MapPopup.css'

const zoomLevelBig = 1;
const zoomLevelSmall = 12;
const flytimeDuration = 2500;

const generateGraticule = () => {
  const features = [];
  for (let lng = -180; lng <= 180; lng += 15) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lng, -80], [lng, 80]] }
    });
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[-180, lat], [180, lat]] }
    });
  }
  return { type: 'FeatureCollection', features };
};

const createPulsingDot = (map: MapLibreMap, size: number = 100, color: [number, number, number] = [255, 0, 0]) => {
  const dot: maplibregl.StyleImageInterface = {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4) as any,
    onAdd() {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      (this as any).context = canvas.getContext('2d', { willReadFrequently: true });
    },

    render() {
      const duration = 2000;
      const t = (performance.now() % duration) / duration;
      const radius = 8;
      const context = (this as any).context as CanvasRenderingContext2D;
      
      if (!context) return false;

      context.clearRect(0, 0, this.width, this.height);

      for (let i = 0; i < 3; i++) {
        const offset = i / 3;
        const progress = (t + offset) % 1;
        const rippleRadius = radius + (size / 2 - radius) * progress;
        const opacity = 1 - progress;

        context.beginPath();
        context.arc(this.width / 2, this.height / 2, rippleRadius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity * 0.5})`;
        context.fill();
      }

      context.beginPath();
      context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`;
      context.strokeStyle = 'white';
      context.lineWidth = 3;
      context.fill();
      context.stroke();

      this.data = context.getImageData(0, 0, this.width, this.height).data as any;

      map.triggerRepaint();
      return true;
    }
  };
  
  return dot;
};

const graticuleData = generateGraticule();

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    'world-satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    },
    'local-graticule': {
      type: 'geojson',
      data: graticuleData as any
    }
  },
  layers: [
    {
      id: 'background-fill',
      type: 'background',
      paint: { 'background-color': '#877c7cff' }
    },
    {
      id: 'graticule-line-layer',
      type: 'line',
      source: 'local-graticule',
      paint: {
        'line-color': '#7baaf0',
        'line-width': 0.7,
        'line-opacity': 0.5 
      }
    },
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'world-satellite',
      paint: { 'raster-fade-duration': 800 }
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'carto-labels'
    }
  ]
}

const SIDEBAR_WIDTH = 320;

interface MapProps {
  newsData: NewsItem[]
  limit: number
  onLimitChange: (limit: number) => void
}

export default function Map({ newsData, limit, onLimitChange }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const newsDataRef = useRef(newsData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNewsId, setActiveNewsId] = useState<string | number | null>(null);
  const activeNewsIdRef = useRef<string | number | null>(null);
  const itemRefs = useRef<Record<string | number, HTMLDivElement | null>>({});

  const getGeoJSON = (data: NewsItem[], selectedId: string | number | null = null): GeoJSON.FeatureCollection => ({
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
        selected: item.id === selectedId ? 1 : 0
      }
    }))
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      zoom: zoomLevelBig, 
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      maxTileCacheSize: 1000,
      doubleClickZoom: false,
    })

    const preventDefault = (e: MouseEvent) => e.preventDefault();
    containerRef.current.addEventListener('contextmenu', preventDefault);

    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      map.addImage('pulsing-dot', createPulsingDot(map, 100, [255, 0, 0]) as any, { pixelRatio: 2 });
      map.addImage('pulsing-dot-blue', createPulsingDot(map, 100, [0, 120, 255]) as any, { pixelRatio: 2 });

      map.addSource('news-points', {
        type: 'geojson',
        data: getGeoJSON(newsData)
      });

      map.addLayer({
        id: 'news-points-layer',
        type: 'symbol',
        source: 'news-points',
        layout: {
          'icon-image': ['case', ['==', ['get', 'selected'], 1], 'pulsing-dot-blue', 'pulsing-dot'],
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
        const currentData = newsDataRef.current;
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['news-points-layer']
        });
        if (features.length === 0 && currentData.length > 0) {
          const randomIndex = Math.floor(Math.random() * currentData.length);
          const randomNews = currentData[randomIndex];
          const targetCoords: [number, number] = [randomNews.longitude, randomNews.latitude];

          if (activePopupRef.current) {
            activePopupRef.current.remove();
            activePopupRef.current = null;
          }

          map.flyTo({
            center: targetCoords,
            zoom: zoomLevelBig,
            duration: flytimeDuration,
            essential: true
          });
        }
      });

      map.on('click', 'news-points-layer', (e) => {
        if (activePopupRef.current) activePopupRef.current.remove();
        if (!e.features?.[0]) return;
        
        const feature = e.features[0];
        const { lng, lat, title, time, address } = feature.properties;

        const exactCoords = [lng, lat]; 

        while (Math.abs(e.lngLat.lng - exactCoords[0]) > 180) {
          exactCoords[0] += e.lngLat.lng > exactCoords[0] ? 360 : -360;
        }

        const newPopup = new maplibregl.Popup({
          className: 'custom-news-popup',
          closeButton: false,
          maxWidth: '300px'
        })
          .setLngLat(exactCoords as [number, number])
          .setHTML(`
            <div class="popup-content-wrapper">
              <div class="popup-time">
                  <span class="icon">🕒</span> <span>${time}</span>
              </div>
              <div class="popup-title">${title}</div>
              <div class="popup-address">
                  <span class="icon">📍</span> <span>${address}</span>
              </div>
          </div>
        `).addTo(map);

        activePopupRef.current = newPopup;

        map.flyTo({
          center: exactCoords as [number, number],
          zoom: zoomLevelSmall,
          duration: flytimeDuration,
          essential: true
        });
      });
    });

    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventDefault)
      activePopupRef.current?.remove();
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    newsDataRef.current = newsData;
    if (mapRef.current) {
      const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(getGeoJSON(newsData, activeNewsIdRef.current));
      }
    }
  }, [newsData]);

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    if (mapRef.current) {
      const isMobile = window.innerWidth <= 600;
      const padding = isMobile
        ? { bottom: next ? window.innerHeight * 0.55 + 32 : 0 }
        : { right: next ? SIDEBAR_WIDTH + 32 : 0 };

      if (!next && activeNewsIdRef.current) {
        // closing — reset selection and fly back to globe view
        activeNewsIdRef.current = null;
        setActiveNewsId(null);
        const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
        if (source) source.setData(getGeoJSON(newsDataRef.current, null));
        mapRef.current.flyTo({
          zoom: zoomLevelBig,
          duration: flytimeDuration,
          essential: true,
          padding
        });
      } else {
        mapRef.current.easeTo({ padding, duration: 400 });
      }
    }
  };

  const flyToNews = (item: NewsItem) => {
    setActiveNewsId(item.id);
    activeNewsIdRef.current = item.id;
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    if (mapRef.current) {
      const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
      if (source) source.setData(getGeoJSON(newsDataRef.current, item.id));
      mapRef.current.flyTo({
        center: [item.longitude, item.latitude],
        zoom: zoomLevelSmall,
        duration: flytimeDuration,
        essential: true
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div
        ref={containerRef}
        className="fullscreen-map"
        style={{ width: '100%', height: '100vh' }}
      />

      {/* Toggle button */}
      <button
        className={`sidebar-toggle-btn ${sidebarOpen ? 'open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle news sidebar"
      >
        <span className="toggle-arrow-desktop">{sidebarOpen ? '›' : '‹'}</span>
        <span className="toggle-arrow-mobile">{sidebarOpen ? '↓' : '↑'}</span>
      </button>

      {/* Right sidebar */}
      <div className={`news-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          {[...newsData].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime()).map(item => (
            <div
              key={item.id}
              ref={el => { itemRefs.current[item.id] = el; }}
              className={`news-sidebar-item ${activeNewsId === item.id ? 'active' : ''}`}
              onClick={() => flyToNews(item)}
            >
              <div className="news-item-time">{item.create_time}</div>
              <div className="news-item-title">{item.rich_text}</div>
              <div className="news-item-address">📍 {item.address}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}