import { useEffect, useRef} from 'react'
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

const createPulsingDot = (map: MapLibreMap, size: number = 100) => {
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
        context.fillStyle = `rgba(255, 100, 100, ${opacity * 0.5})`;
        context.fill();
      }

      context.beginPath();
      context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 0, 0, 1)';
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

interface MapProps {
  newsData: NewsItem[]
}

export default function Map({ newsData }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const activePopupRef = useRef<maplibregl.Popup | null>(null);

  const getGeoJSON = (data: NewsItem[]): GeoJSON.FeatureCollection => ({
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
        id: item.id
      }
    }))
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

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

    const preventDefault = (e: MouseEvent) => e.preventDefault()
    containerRef.current.addEventListener('contextmenu', preventDefault)

    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      map.addImage('pulsing-dot', createPulsingDot(map) as any, { pixelRatio: 2 });

   
      map.addSource('news-points', {
        type: 'geojson',
        data: getGeoJSON(newsData)
      });

    
      map.addLayer({
        id: 'news-points-layer',
        type: 'symbol',
        source: 'news-points',
        layout: {
          'icon-image': 'pulsing-dot',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      map.setSky({
        'sky-color': '#050505',
        'horizon-color': '#242424',
        'sky-horizon-blend': 0.5,
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
      if (activePopupRef.current) activePopupRef.current.remove();
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (mapRef.current) {
      const source = mapRef.current.getSource('news-points') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(getGeoJSON(newsData));
      }

      const map = mapRef.current;
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['news-points-layer']
        });
        if (features.length === 0 && newsData.length > 0) {
          const randomIndex = Math.floor(Math.random() * newsData.length);
          const randomNews = newsData[randomIndex];
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
    }
  }, [newsData]);

  return (
    <>
      <div 
        ref={containerRef} 
        className="fullscreen-map" 
        style={{ width: '100%', height: '100vh'}} 
      />
    </>
  );
}