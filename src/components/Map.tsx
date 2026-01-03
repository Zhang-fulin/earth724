import { useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { type NewsItem } from './NewsManager'

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
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    }
  },
  layers: [
    {
      id: 'background-fill',
      type: 'background',
      paint: {
        'background-color': '#242424', 
      }
    },
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'world-satellite',
      paint: { 
        'raster-fade-duration': 800,
      }
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // console.log(newsData)

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      zoom: 1, 
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      maxTileCacheSize: 1000,
    })

    const preventDefault = (e: MouseEvent) => e.preventDefault()
    containerRef.current.addEventListener('contextmenu', preventDefault)

    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return;
      const map = mapRef.current;

      map.setSky({
        'sky-color': '#050505',
        'horizon-color': '#242424',
        'sky-horizon-blend': 0.5,
      });

      map.addSource('local-graticule', {
        type: 'geojson',
        data: generateGraticule() as any
      });

      map.addLayer({
        id: 'graticule-line-layer',
        type: 'line',
        source: 'local-graticule',
        paint: {
          'line-color': '#7baaf0ff',
          'line-width': 0.7,
          'line-opacity': 0.5 
        }
      }, 'satellite-layer');
    });

    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventDefault)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="fullscreen-map" />
}