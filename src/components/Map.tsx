import { useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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
      id: 'satellite-layer',
      type: 'raster',
      source: 'world-satellite',
      paint: { 
        'raster-fade-duration': 0,
      }
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'carto-labels'
    }
  ]
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      zoom: 1, 
      attributionControl: false,
      
      dragRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
      
      maxTileCacheSize: 10000,
    })


    const preventDefault = (e: MouseEvent) => e.preventDefault()
    containerRef.current.addEventListener('contextmenu', preventDefault)


    mapRef.current.on('style.load', () => {
      if (!mapRef.current) return;
      mapRef.current.setSky({
        'sky-color': '#91b7f0ff',
        'sky-horizon-blend': 0.5,
        'atmosphere-blend': 0.8,
      });
    });

    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventDefault)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="fullscreen-map" />
}