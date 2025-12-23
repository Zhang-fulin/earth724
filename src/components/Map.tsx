import { useEffect, useRef } from 'react'
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl'

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    'world-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 18
    },
    'carto-labels': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png'
      ],
      tileSize: 256
    }
  },
  layers: [
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'world-satellite'
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'carto-labels',
      paint: {
        'raster-contrast': 0.2,
        'raster-opacity': 0.9
      }
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
      center: [31.13, 29.97],
      zoom: 2,
      attributionControl: false,
      style: MAP_STYLE,
      dragRotate: false,        // 禁止鼠标右键旋转和左键+Ctrl旋转
      touchPitch: false,
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fullscreen-map" // 使用上面 CSS 中定义的类名
      // style={{ background: '#000' }} // 兜底背景色
    />
  )
}
